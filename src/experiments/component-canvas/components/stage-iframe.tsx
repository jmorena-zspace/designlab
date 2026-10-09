import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getTokenOverrides } from '../apply-changes'
import { makeNodeId, parseNodeId } from '../types'
import type { Decorator, LayerRef, StageProps } from '../types'
import { ComponentFrame } from './component-frame'
import { InfiniteCanvas } from './infinite-canvas'
import { SelectionOverlay } from './selection-overlay'
// The stage's own look (canvas, frame titles, outlines) as a text string. See the file
// for why it's plain CSS and not Tailwind.
import stageChromeCss from './stage-chrome.css?inline'

// ─────────────────────────────────────────────────────────────────────────────
// STAGE: the middle of the editor, where the real components are drawn.
//
// WHY AN IFRAME: an imported design system brings its own global CSS (a Tailwind reset,
// :root variables, body styles…). Loaded into DesignLab's page, it would restyle the
// editor panels too. An <iframe> is a separate page with its own CSS, so we inject the
// workspace CSS ONLY in there.
//
// HOW REACT DRAWS INSIDE IT: we don't start a second React app. `createPortal` renders
// part of OUR tree into the iframe's <body>. It's still one React app with shared state,
// and React attaches its event listeners to the portal container, so clicks work.
//
// Note: components with popups (menus, selects, tooltips) portal their popup into the
// PARENT page's document.body by default, outside the iframe and without the workspace
// CSS. None of the v1 components use popups. When they're added, their portal
// `container` must point at the iframe's body.
// ─────────────────────────────────────────────────────────────────────────────

// TWEAK: frameColumns — how many component frames per row on the canvas (try 2 to 5)
const frameColumns = 3
// TWEAK: frameGap — space between frames, in canvas pixels (try 48 to 200)
const frameGap = 96

// The empty page the iframe starts with. The meta tag lets us recognize it: before it
// loads, the iframe briefly holds a different blank page (about:blank) we must not use.
const stageDocumentHtml =
  '<!doctype html><html><head><meta charset="utf-8"><meta name="component-canvas-stage" content=""></head><body></body></html>'

// Ids of the elements we add inside the iframe, so we can find them again
// (React StrictMode mounts effects twice in development).
const workspaceStyleId = 'cc-workspace-css'
const chromeStyleId = 'cc-stage-chrome-css'
const portalRootId = 'cc-portal-root'

// One shared empty list (a new [] every render would make the memoized frames re-render).
const noDecorators: Decorator[] = []

// Finds an element we created inside the iframe, or creates it.
function getOrCreate(stageDocument: Document, parent: HTMLElement, tagName: string, id: string): HTMLElement {
  const existing = stageDocument.getElementById(id)
  if (existing) return existing
  const element = stageDocument.createElement(tagName)
  element.id = id
  parent.appendChild(element)
  return element
}

export function Stage(props: StageProps) {
  const { workspace, changes, selection, hovered, mode, frameThemes, cameraRef, onZoomChange } = props
  const iframeRef = useRef<HTMLIFrameElement>(null)
  // The <div> inside the iframe that React portals into (null until the iframe is ready).
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)
  // The text layer being edited in place (after a double-click).
  const [editingLayer, setEditingLayer] = useState<LayerRef | null>(null)

  // ── Keep the latest callbacks in a ref ─────────────────────────────────────
  // The frames are memoized (they skip re-rendering if their props didn't change). If we
  // passed the page's callbacks straight through, a brand-new function each render would
  // re-render every frame. So we pass stable wrappers that call the latest version.
  const latestPropsRef = useRef(props)
  useLayoutEffect(() => {
    latestPropsRef.current = props
  })

  const handleToggleFrameTheme = useCallback((componentName: string) => {
    latestPropsRef.current.onToggleFrameTheme(componentName)
  }, [])
  // (EditableText only calls this when the words actually changed.)
  const handleTextCommit = useCallback((layer: LayerRef, newText: string) => {
    setEditingLayer(null)
    latestPropsRef.current.onTextEdit(layer, newText)
  }, [])
  const handleTextEditEnd = useCallback(() => setEditingLayer(null), [])

  // ── 1. Wait for the iframe, then set it up ─────────────────────────────────
  // Adds the two <style> tags and the portal root to the iframe, then renders into it.
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    function setUp() {
      const stageDocument = iframe!.contentDocument
      // Not our page yet (still the temporary about:blank)? The load event will call us again.
      if (!stageDocument?.querySelector('meta[name="component-canvas-stage"]')) return
      getOrCreate(stageDocument, stageDocument.head, 'style', workspaceStyleId)
      // The chrome CSS goes AFTER the workspace CSS, so it wins when both style the same thing.
      const chromeStyle = getOrCreate(stageDocument, stageDocument.head, 'style', chromeStyleId)
      chromeStyle.textContent = stageChromeCss
      setPortalRoot(getOrCreate(stageDocument, stageDocument.body, 'div', portalRootId))
    }

    // The iframe may already be loaded (fast load, or StrictMode's second mount), so try now
    // AND when the load event fires.
    setUp()
    iframe.addEventListener('load', setUp)
    return () => {
      iframe.removeEventListener('load', setUp)
      setPortalRoot(null)
    }
  }, [])

  const stageDocument = portalRoot?.ownerDocument ?? null

  // Tell the page about the iframe's document (panels use it to measure elements).
  useEffect(() => {
    if (!stageDocument) return
    latestPropsRef.current.onStageDocument(stageDocument)
    return () => latestPropsRef.current.onStageDocument(null)
  }, [stageDocument])

  // ── 2. Workspace CSS ───────────────────────────────────────────────────────
  // Put the workspace's CSS text into its <style> tag (again if it ever changes).
  useLayoutEffect(() => {
    const styleTag = stageDocument?.getElementById(workspaceStyleId)
    if (styleTag) styleTag.textContent = workspace.css
  }, [stageDocument, workspace.css])

  // ── 3. Light-mode token edits ──────────────────────────────────────────────
  // Set as CSS variables on the iframe's <html>, which beats `:root { … }` in the workspace
  // CSS (inline styles win). Variables that were edited before but aren't anymore get
  // removed, so they fall back to the original value. (Dark edits go on each dark frame.)
  // useLayoutEffect (not useEffect) runs before the browser paints, so an undo/redo
  // never shows one frame with the old colors.
  const appliedLightVariablesRef = useRef<string[]>([])
  useLayoutEffect(() => {
    const htmlElement = stageDocument?.documentElement
    if (!htmlElement) return
    const overrides = getTokenOverrides(changes, 'light')
    for (const variable of appliedLightVariablesRef.current) {
      if (!(variable in overrides)) htmlElement.style.removeProperty(variable)
    }
    for (const [variable, value] of Object.entries(overrides)) {
      htmlElement.style.setProperty(variable, value)
    }
    appliedLightVariablesRef.current = Object.keys(overrides)
  }, [stageDocument, changes])

  // ── 4. Design mode: clicks select layers instead of reaching the components ──
  // We listen on the iframe's WINDOW in the "capture" phase. Events travel
  // window → document → … → the clicked element, so the window hears them FIRST.
  // Calling stopPropagation there means the real component never sees the click:
  // checkboxes don't toggle, inputs don't focus, buttons don't fire.
  useEffect(() => {
    const stageWindow = stageDocument?.defaultView
    if (!stageDocument || !stageWindow || mode !== 'design') return

    // The deepest layer element under the pointer, or null. Ignores the text being
    // edited (so you can click inside it to move the caret).
    function findLayerTarget(event: Event): Element | null {
      const target = event.target
      if (!(target instanceof stageWindow!.Element)) return null
      if (target.closest('.cc-text-editing')) return null
      return target.closest('[data-node-id]')
    }

    // FIGMA'S CLICK RULE: text sits inside almost everything (a Button's label, a Card's
    // title), so a plain click on text would always select the words, never the Button.
    // Instead, a click on a text layer selects its PARENT layer first. Once the parent is
    // selected (or the text already is), the next click goes into the text itself.
    // Double-click still edits the text straight away. Hover follows the same rule, so
    // the hover outline always shows what a click would select.
    function findSelectableLayer(event: Event): Element | null {
      const layerElement = findLayerTarget(event)
      if (!layerElement || layerElement.getAttribute('data-node-kind') !== 'text') return layerElement
      const parentElement = layerElement.parentElement?.closest('[data-node-id]')
      if (!parentElement) return layerElement // text with no parent layer: select it directly

      const selected = latestPropsRef.current.selection
      const selectedId = selected ? makeNodeId(selected) : null
      const isParentSelected = parentElement.getAttribute('data-node-id') === selectedId
      const isTextSelected = layerElement.getAttribute('data-node-id') === selectedId
      return isParentSelected || isTextSelected ? layerElement : parentElement
    }
    function isHandToolActive() {
      return stageDocument!.documentElement.dataset.spaceHeld === 'true'
    }
    function isEditorChrome(event: Event) {
      const target = event.target
      return target instanceof stageWindow!.Element && Boolean(target.closest('[data-stage-chrome], .cc-text-editing'))
    }
    function block(event: Event) {
      event.preventDefault()
      event.stopPropagation()
    }

    // Press: select the layer under the pointer, or clear the selection on empty canvas.
    function handlePointerDown(event: PointerEvent) {
      // Pressing anywhere outside the text being edited finishes the edit. Because we
      // block the press below, focus wouldn't move on its own, so we blur it ourselves
      // (EditableText commits on blur).
      const editingElement = stageDocument!.querySelector<HTMLElement>('.cc-text-editing')
      if (editingElement && !editingElement.contains(event.target as Node)) editingElement.blur()

      if (event.button !== 0 || isHandToolActive()) return
      const layerElement = findSelectableLayer(event)
      if (layerElement) {
        block(event)
        latestPropsRef.current.onSelect(parseNodeId(layerElement.getAttribute('data-node-id') ?? ''))
      } else if (!isEditorChrome(event)) {
        // Empty canvas: deselect, and let the event through so the canvas can use it.
        latestPropsRef.current.onSelect(null)
      }
    }
    // mousedown would focus inputs; click would toggle checkboxes. Block both on layers.
    function handleMouseDownOrClick(event: MouseEvent) {
      if (event.button !== 0 || isHandToolActive()) return
      if (findLayerTarget(event)) block(event)
    }
    // Double-click on a text layer: start editing it in place.
    function handleDoubleClick(event: MouseEvent) {
      const layerElement = findLayerTarget(event)
      if (!layerElement) return
      block(event)
      if (layerElement.getAttribute('data-node-kind') !== 'text') return
      const layer = parseNodeId(layerElement.getAttribute('data-node-id') ?? '')
      if (!layer) return
      latestPropsRef.current.onSelect(layer)
      setEditingLayer(layer)
    }
    // Hover: only tell the page when the hovered layer actually changes.
    let lastHoveredId: string | null = null
    function updateHover(nodeId: string | null) {
      if (nodeId === lastHoveredId) return
      lastHoveredId = nodeId
      latestPropsRef.current.onHover(nodeId ? parseNodeId(nodeId) : null)
    }
    function handlePointerMove(event: PointerEvent) {
      updateHover(findSelectableLayer(event)?.getAttribute('data-node-id') ?? null)
    }
    function handlePointerLeave() {
      updateHover(null)
    }

    // Keyboard: in Design mode a component can still get focus (e.g. with Tab), and then
    // Space/Enter would press the button or toggle the checkbox, and letters would type
    // into an input. We must NOT stopPropagation here: events go window (capture, us) →
    // document → … → target → back up to document, and the page's keyboard shortcuts
    // listen on the document in that last step. Stopping would break Esc, ⌘Z, Delete…
    // So instead we:
    //   1. preventDefault → cancels the browser's own action (typing, button press),
    //   2. blur the component → it no longer has focus, so it can't react to the
    //      matching keyup either (buttons and checkboxes "click" on Space keyup).
    // The event still travels on, so the shortcuts and the space-bar hand tool work.
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target
      if (!(target instanceof stageWindow!.HTMLElement)) return
      if (!target.closest('.cc-frame-body') || target.closest('.cc-text-editing')) return
      event.preventDefault()
      target.blur()
    }

    const capture = { capture: true }
    stageWindow.addEventListener('pointerdown', handlePointerDown, capture)
    stageWindow.addEventListener('mousedown', handleMouseDownOrClick, capture)
    stageWindow.addEventListener('click', handleMouseDownOrClick, capture)
    stageWindow.addEventListener('dblclick', handleDoubleClick, capture)
    stageWindow.addEventListener('pointermove', handlePointerMove, capture)
    stageDocument.documentElement.addEventListener('pointerleave', handlePointerLeave)
    stageWindow.addEventListener('keydown', handleKeyDown, capture)
    return () => {
      stageWindow.removeEventListener('keydown', handleKeyDown, capture)
      stageWindow.removeEventListener('pointerdown', handlePointerDown, capture)
      stageWindow.removeEventListener('mousedown', handleMouseDownOrClick, capture)
      stageWindow.removeEventListener('click', handleMouseDownOrClick, capture)
      stageWindow.removeEventListener('dblclick', handleDoubleClick, capture)
      stageWindow.removeEventListener('pointermove', handlePointerMove, capture)
      stageDocument.documentElement.removeEventListener('pointerleave', handlePointerLeave)
      // Leaving design mode: nothing should stay hovered.
      if (lastHoveredId) latestPropsRef.current.onHover(null)
    }
  }, [stageDocument, mode])

  // Interact mode has no in-place editing. Reset during render (React's recommended
  // pattern for "adjust state when a prop changes") instead of in an effect.
  if (mode !== 'design' && editingLayer) setEditingLayer(null)

  // ── 5. What goes inside the iframe ─────────────────────────────────────────
  const decorators = workspace.decorators ?? noDecorators
  const stageContent = stageDocument && (
    <div className="cc-stage" data-mode={mode}>
      <InfiniteCanvas stageDocument={stageDocument} cameraRef={cameraRef} onZoomChange={onZoomChange}>
        <div
          className="cc-frame-grid"
          style={{ gridTemplateColumns: `repeat(${frameColumns}, max-content)`, gap: `${frameGap}px` }}
        >
          {workspace.components.map((entry) => (
            <ComponentFrame
              key={entry.name}
              entry={entry}
              changes={changes}
              theme={frameThemes[entry.name] ?? 'light'}
              decorators={decorators}
              isActive={selection?.component === entry.name}
              editingLayer={editingLayer?.component === entry.name ? editingLayer : null}
              onToggleTheme={handleToggleFrameTheme}
              onTextCommit={handleTextCommit}
              onTextEditEnd={handleTextEditEnd}
            />
          ))}
        </div>
      </InfiniteCanvas>
      <SelectionOverlay
        stageDocument={stageDocument}
        selection={selection}
        hovered={hovered}
        visible={mode === 'design'}
      />
    </div>
  )

  return (
    <>
      <iframe
        ref={iframeRef}
        title="Component canvas stage"
        srcDoc={stageDocumentHtml}
        style={{ display: 'block', width: '100%', height: '100%', border: 0 }}
      />
      {stageContent && portalRoot && createPortal(stageContent, portalRoot)}
    </>
  )
}
