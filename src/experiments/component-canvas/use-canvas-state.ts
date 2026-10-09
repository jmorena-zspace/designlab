import { useCallback, useEffect, useReducer, useState } from 'react'
import { getRenderedNode } from './apply-changes'
import { compactChanges, getChangeTargetKey } from './export-changes'
import type {
  CanvasChange,
  CanvasMode,
  EditScope,
  LayerRef,
  PropValue,
  StyleProperty,
  ThemeMode,
  Workspace,
} from './types'

// ─────────────────────────────────────────────────────────────────────────────
// CANVAS STATE: everything the editor remembers, plus the actions that change it.
//
// The page calls `useCanvasState(workspace)` once and passes the pieces down to the
// stage and the panels. Two kinds of state live here:
//
//   1. The EDIT HISTORY (the change list + undo/redo). This uses `useReducer`: one
//      function (historyReducer) decides how every action ("add a change", "undo",
//      "redo", "reset") turns the old history into the new one. Keeping all of that
//      in one place makes undo/redo easy to follow.
//   2. Simple UI state (selection, hover, mode, scope, light/dark per frame). Each
//      is a plain `useState`, because each is just "one value I can set".
// ─────────────────────────────────────────────────────────────────────────────

// TWEAK: autosaveKeyPrefix / autosaveVersion — the localStorage key is
// "component-canvas:<workspace id>:v1". Bump the version (v2) to start fresh if the
// saved data format ever changes.
const autosaveKeyPrefix = 'component-canvas'
const autosaveVersion = 'v1'

// TWEAK: autosaveDelayMs — how long to wait after the last edit before saving.
// Lower = saves sooner, higher = fewer writes while dragging (try 100 to 2000).
const autosaveDelayMs = 400

// TWEAK: mergeSameEditWithinMs — repeated edits of the SAME thing this close together
// become ONE undo step (a color picker drag sends dozens of edits). Try 300 to 2000.
const mergeSameEditWithinMs = 800

// TWEAK: mergeAnyEditWithinMs — edits this close together (any target) become one undo
// step. This catches controls that make two edits at once, like the alignment grid
// (justify + align). Keep it tiny so separate clicks stay separate (try 20 to 100).
const mergeAnyEditWithinMs = 50

// TWEAK: maxUndoSteps — how many steps back undo can go. Older steps are forgotten.
const maxUndoSteps = 200

function getAutosaveKey(workspace: Workspace): string {
  return `${autosaveKeyPrefix}:${workspace.id}:${autosaveVersion}`
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. The edit history
// ─────────────────────────────────────────────────────────────────────────────
// `past` and `future` are lists of whole change lists ("snapshots").
//   Undo: move `present` onto `future`, take the last snapshot of `past`.
//   Redo: the same thing in the other direction.
// The lists are small, so keeping whole copies is fine and very easy to reason about.
type History = {
  past: CanvasChange[][]
  present: CanvasChange[]
  future: CanvasChange[][]
  // Remembered so quick repeated edits can be merged into one undo step.
  lastEditTargetKey: string | null
  lastEditTime: number
}

type HistoryAction =
  | { type: 'addChange'; change: CanvasChange; time: number }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'resetAll' }

// Do two change lists hold the same changes, in any order?
// Re-picking a value moves that change to the end of the list, but the canvas looks
// exactly the same, so the ORDER alone shouldn't count as an edit. (compactChanges
// never keeps two changes that fight over the same thing in the wrong order, so
// comparing the contents is enough.)
function containsSameChanges(first: CanvasChange[], second: CanvasChange[]): boolean {
  if (first.length !== second.length) return false
  const secondAsText = new Set(second.map((change) => JSON.stringify(change)))
  return first.every((change) => secondAsText.has(JSON.stringify(change)))
}

function historyReducer(history: History, action: HistoryAction): History {
  switch (action.type) {
    case 'addChange': {
      // Add the change, then tidy the list (later edits replace earlier ones of the
      // same thing; see compactChanges in export-changes.ts).
      const nextPresent = compactChanges([...history.present, action.change])

      // Nothing actually changed (re-picked the value that was already set, or reset
      // something that wasn't edited): keep the old list and don't add an undo step.
      if (containsSameChanges(nextPresent, history.present)) return history

      const targetKey = getChangeTargetKey(action.change)
      const timeSinceLastEdit = action.time - history.lastEditTime
      const shouldMerge =
        (targetKey === history.lastEditTargetKey && timeSinceLastEdit < mergeSameEditWithinMs) ||
        timeSinceLastEdit < mergeAnyEditWithinMs

      return {
        // Merging = keep `past` as it is, so one undo removes the whole burst of edits.
        past: shouldMerge ? history.past : [...history.past, history.present].slice(-maxUndoSteps),
        present: nextPresent,
        future: [], // a new edit makes the old "redo" steps meaningless
        lastEditTargetKey: targetKey,
        lastEditTime: action.time,
      }
    }

    case 'undo': {
      if (history.past.length === 0) return history
      return {
        past: history.past.slice(0, -1),
        present: history.past[history.past.length - 1],
        future: [history.present, ...history.future],
        lastEditTargetKey: null, // the next edit always starts a fresh undo step
        lastEditTime: 0,
      }
    }

    case 'redo': {
      if (history.future.length === 0) return history
      return {
        past: [...history.past, history.present],
        present: history.future[0],
        future: history.future.slice(1),
        lastEditTargetKey: null,
        lastEditTime: 0,
      }
    }

    case 'resetAll': {
      // Reset is just another step, so it can be undone.
      if (history.present.length === 0) return history
      return {
        past: [...history.past, history.present].slice(-maxUndoSteps),
        present: [],
        future: [],
        lastEditTargetKey: null,
        lastEditTime: 0,
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Loading the autosave
// ─────────────────────────────────────────────────────────────────────────────
type SavedCanvas = {
  changes: CanvasChange[]
  frameThemes: Record<string, ThemeMode>
}

const knownChangeKinds = ['style', 'prop', 'text', 'hidden', 'token']

// Reads the saved edits for this workspace. Anything missing, broken or in an
// unexpected shape is ignored, and the canvas simply starts empty.
function loadSavedCanvas(workspace: Workspace): SavedCanvas {
  const empty: SavedCanvas = { changes: [], frameThemes: {} }
  try {
    const savedText = localStorage.getItem(getAutosaveKey(workspace))
    if (!savedText) return empty
    const saved = JSON.parse(savedText)

    // Keep only entries that look like real changes (an object with a known `kind`).
    const changes = Array.isArray(saved?.changes)
      ? saved.changes.filter(
          (change: unknown) =>
            typeof change === 'object' &&
            change !== null &&
            knownChangeKinds.includes((change as { kind?: unknown }).kind as string),
        )
      : []

    // Keep only "component name → 'light' | 'dark'" pairs.
    const frameThemes: Record<string, ThemeMode> = {}
    if (typeof saved?.frameThemes === 'object' && saved.frameThemes !== null) {
      for (const [componentName, theme] of Object.entries(saved.frameThemes)) {
        if (theme === 'light' || theme === 'dark') frameThemes[componentName] = theme
      }
    }

    return { changes, frameThemes }
  } catch {
    // localStorage can be blocked (private mode) or hold broken JSON. Start empty.
    return empty
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. The hook
// ─────────────────────────────────────────────────────────────────────────────
// Note: the saved data is read once, when the page first appears. The page always
// uses the same workspace, so that's enough for now.
export function useCanvasState(workspace: Workspace) {
  // Read localStorage once. useState with a function only runs it on the first render.
  const [savedCanvas] = useState(() => loadSavedCanvas(workspace))

  const [history, dispatch] = useReducer(historyReducer, {
    past: [],
    present: savedCanvas.changes,
    future: [],
    lastEditTargetKey: null,
    lastEditTime: 0,
  })
  const changes = history.present

  // Simple UI state.
  const [selection, setSelection] = useState<LayerRef | null>(null)
  const [hovered, setHovered] = useState<LayerRef | null>(null)
  const [mode, setModeState] = useState<CanvasMode>('design')
  const [scope, setScope] = useState<EditScope>('all')
  const [frameThemes, setFrameThemes] = useState<Record<string, ThemeMode>>(savedCanvas.frameThemes)

  // ── Autosave ──
  // Every time the changes or frame themes change, wait `autosaveDelayMs`, then save.
  // If another edit arrives first, the cleanup cancels the pending save and a new
  // timer starts ("debouncing"), so a fast drag only saves once at the end.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved: SavedCanvas = { changes, frameThemes }
        localStorage.setItem(getAutosaveKey(workspace), JSON.stringify(saved))
      } catch {
        // Storage full or blocked: the canvas still works, it just won't remember.
      }
    }, autosaveDelayMs)
    return () => window.clearTimeout(timer)
  }, [changes, frameThemes, workspace])

  // ── Actions ──
  // useCallback keeps each function the same between renders (unless what it uses
  // changes), so panels that receive them don't re-render for no reason.

  const addChange = useCallback((change: CanvasChange) => {
    dispatch({ type: 'addChange', change, time: performance.now() })
  }, [])

  // Switching to Interact clears the selection and hover outline: in Interact mode
  // the components are "live", so a selected layer would only get in the way.
  const setMode = useCallback((nextMode: CanvasMode) => {
    setModeState(nextMode)
    if (nextMode === 'interact') {
      setSelection(null)
      setHovered(null)
    }
  }, [])

  // Edits to a layer go to every variant, or only the layer's own variant,
  // depending on the scope toggle in the right panel.
  const variantForEdit = useCallback(
    (layer: LayerRef) => (scope === 'all' ? 'all' : layer.variant),
    [scope],
  )

  const setStyle = useCallback(
    (layer: LayerRef, property: StyleProperty, value: string | null) => {
      addChange({
        kind: 'style',
        component: layer.component,
        layerKey: layer.layerKey,
        variant: variantForEdit(layer),
        property,
        value,
      })
    },
    [addChange, variantForEdit],
  )

  const setProp = useCallback(
    (layer: LayerRef, prop: string, value: PropValue | null) => {
      addChange({
        kind: 'prop',
        component: layer.component,
        layerKey: layer.layerKey,
        variant: variantForEdit(layer),
        prop,
        value,
      })
    },
    [addChange, variantForEdit],
  )

  const setText = useCallback(
    (layer: LayerRef, text: string) => {
      addChange({
        kind: 'text',
        component: layer.component,
        layerKey: layer.layerKey,
        variant: variantForEdit(layer),
        value: text,
      })
    },
    [addChange, variantForEdit],
  )

  // Flips the layer between hidden and shown, based on how it looks right now.
  const toggleHidden = useCallback(
    (layer: LayerRef) => {
      const currentNode = getRenderedNode(workspace.components, layer, changes)
      const isHiddenNow = currentNode?.hidden ?? false
      addChange({
        kind: 'hidden',
        component: layer.component,
        layerKey: layer.layerKey,
        variant: variantForEdit(layer),
        value: !isHiddenNow,
      })
    },
    [addChange, variantForEdit, workspace, changes],
  )

  // A theme variable edit. null = back to the value from the workspace CSS.
  const setToken = useCallback(
    (mode: ThemeMode, variable: string, value: string | null) => {
      addChange({ kind: 'token', mode, variable, value })
    },
    [addChange],
  )

  // Switches one component's frame between light and dark.
  const toggleFrameTheme = useCallback((componentName: string) => {
    setFrameThemes((current) => ({
      ...current,
      [componentName]: current[componentName] === 'dark' ? 'light' : 'dark',
    }))
  }, [])

  const undo = useCallback(() => dispatch({ type: 'undo' }), [])
  const redo = useCallback(() => dispatch({ type: 'redo' }), [])
  const resetAll = useCallback(() => dispatch({ type: 'resetAll' }), [])

  return {
    // state
    changes,
    selection,
    hovered,
    mode,
    scope,
    frameThemes,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    // actions
    select: setSelection,
    hover: setHovered,
    setMode,
    setScope,
    setStyle,
    setProp,
    setText,
    toggleHidden,
    setToken,
    toggleFrameTheme,
    undo,
    redo,
    resetAll,
  }
}
