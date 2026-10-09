import { useEffect, useRef, type RefObject } from 'react'
import { findNode, findParent, getRenderedTree } from './apply-changes'
import type { CameraHandle, CanvasChange, CanvasMode, LayerRef, Workspace } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// KEYBOARD SHORTCUTS for the canvas.
//
//   Esc            select the parent layer (or deselect at the top)
//   Enter          select the first child layer
//   ⌘Z             undo
//   ⇧⌘Z or ⌘Y      redo
//   Delete / ⌫     hide or show the selected layer
//   P              switch between Design and Interact mode
// Esc, Enter and Delete only work in Design mode, and not while a panel control
// (a button, a dropdown, a layer row…) has the keyboard focus.
//   ⇧1             zoom to fit
//   ⌘= / ⌘-        zoom in / out
//
// WHY TWO LISTENERS: the components are drawn inside an <iframe>. Key presses that
// happen while the iframe has focus stay inside the iframe's document and never
// reach our window. So we listen on our window AND on the iframe's document.
// (On Windows/Linux, Ctrl works wherever ⌘ is listed.)
// ─────────────────────────────────────────────────────────────────────────────

// TWEAK: zoomInFactor / zoomOutFactor — how much one ⌘= / ⌘- press zooms.
// 1.25 = 25% closer. Keep zoomOutFactor = 1 / zoomInFactor so in-then-out returns
// to the same zoom (1 / 1.25 = 0.8).
const zoomInFactor = 1.25
const zoomOutFactor = 0.8

type KeyboardShortcutOptions = {
  workspace: Workspace
  changes: CanvasChange[]
  selection: LayerRef | null
  mode: CanvasMode
  // The iframe's document (null until the stage is ready; can change).
  stageDocument: Document | null
  cameraRef: RefObject<CameraHandle | null>
  select: (layer: LayerRef | null) => void
  setMode: (mode: CanvasMode) => void
  toggleHidden: (layer: LayerRef) => void
  undo: () => void
  redo: () => void
}

// True while the person is typing somewhere (a text field, dropdown, or editable
// text), so shortcuts like Backspace or P don't fire by accident.
// We check `tagName` instead of `instanceof HTMLInputElement` because elements
// inside the iframe come from a different window, and `instanceof` fails across windows.
function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !('tagName' in target)) return false
  const element = target as HTMLElement
  const tagName = element.tagName.toUpperCase()
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || element.isContentEditable
}

// Panel controls that already use Enter / Esc / Delete themselves: buttons, menu
// options, layer rows, radio-style toggles, and anything inside an open popover.
// TWEAK: panelControlSelector — add a selector here if a new panel control reacts to
// those keys and the canvas shortcut gets in its way.
const panelControlSelector =
  'button, a, [role="option"], [role="treeitem"], [role="radio"], [role="tab"], [role="switch"], [role="checkbox"], [data-slot="popover-content"]'

// True when the key press happened on an editor panel control (not on the canvas).
// Only checks our own page: elements inside the stage iframe are the components
// being designed, and in Design mode they never take focus anyway.
function isPanelControlTarget(target: EventTarget | null): boolean {
  if (!target || !('closest' in target)) return false
  const element = target as Element
  return element.ownerDocument === document && element.closest(panelControlSelector) !== null
}

export function useKeyboardShortcuts(options: KeyboardShortcutOptions) {
  // We keep the latest options in a ref. The listeners read from it, so they always
  // see the current selection/changes WITHOUT being removed and re-added on every
  // render (which would happen if the effect below depended on all the options).
  const latestOptions = useRef(options)
  useEffect(() => {
    latestOptions.current = options
  })

  const { stageDocument } = options

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Something else already handled this key (e.g. Enter picking a dropdown
      // option calls preventDefault), or the person is typing: leave it alone.
      if (event.defaultPrevented || isTypingTarget(event.target)) return

      const { workspace, changes, selection, mode, cameraRef, select, setMode, toggleHidden, undo, redo } =
        latestOptions.current
      const commandKey = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()

      // ── Undo / redo ──
      if (commandKey && key === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }
      if (commandKey && key === 'y') {
        event.preventDefault()
        redo()
        return
      }

      // ── Zoom ── preventDefault stops the browser from zooming the whole page.
      if (commandKey && (key === '=' || key === '+')) {
        event.preventDefault()
        cameraRef.current?.zoomBy(zoomInFactor)
        return
      }
      if (commandKey && (key === '-' || key === '_')) {
        event.preventDefault()
        cameraRef.current?.zoomBy(zoomOutFactor)
        return
      }
      // ⇧1 types "!", so we check the physical key (event.code) instead.
      if (event.shiftKey && !commandKey && event.code === 'Digit1') {
        event.preventDefault()
        cameraRef.current?.zoomToFit()
        return
      }

      // Everything below is a plain key without ⌘/Ctrl/Alt.
      if (commandKey || event.altKey) return

      // ── P: Design ↔ Interact ──
      if (key === 'p') {
        setMode(mode === 'design' ? 'interact' : 'design')
        return
      }

      // The rest edits or moves the selection, which only exists in Design mode.
      // In Interact mode Enter/Esc/Delete belong to the live components.
      if (mode !== 'design' || !selection) return

      // Enter on a button "clicks" it, Esc closes a menu, and so on. Let panel
      // controls keep those keys instead of also moving the canvas selection.
      if (isPanelControlTarget(event.target)) return

      // ── Delete / Backspace: hide or show ──
      if (key === 'delete' || key === 'backspace') {
        event.preventDefault()
        toggleHidden(selection)
        return
      }

      // For Esc and Enter we need the edited tree of the selected variant.
      const entry = workspace.components.find((candidate) => candidate.name === selection.component)
      const tree = entry ? getRenderedTree(entry, selection.variant, changes) : null
      if (!tree) return

      // ── Esc: go up one level ──
      if (key === 'escape') {
        const parent = findParent(tree, selection.layerKey)
        select(parent ? { ...selection, layerKey: parent.layerKey } : null)
        return
      }

      // ── Enter: go down one level (first child that isn't hidden) ──
      if (key === 'enter') {
        const node = findNode(tree, selection.layerKey)
        const firstChild = node?.children?.find((child) => !child.hidden)
        if (firstChild) {
          event.preventDefault()
          select({ ...selection, layerKey: firstChild.layerKey })
        }
      }
    }

    // Listen on both documents. The cleanup removes both listeners when the page
    // closes or when the iframe document changes.
    window.addEventListener('keydown', handleKeyDown)
    stageDocument?.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      stageDocument?.removeEventListener('keydown', handleKeyDown)
    }
  }, [stageDocument])
}
