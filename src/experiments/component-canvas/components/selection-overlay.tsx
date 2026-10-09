import { useEffect, useRef } from 'react'
import { isSameLayer, makeNodeId } from '../types'
import type { LayerRef } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// SELECTION OVERLAY: the Figma-style blue outlines.
//   hovered layer  → thin 1px outline
//   selected layer → 1.5px outline + a size label underneath ("120 × 32")
//
// The outlines are drawn in SCREEN space: a fixed layer on top of the canvas that is
// NOT inside the zoomed world. If they were inside it, zooming to 400% would turn a
// 1px line into a blurry 4px one. Instead we measure where the layer is on screen
// (getBoundingClientRect) and place the outline there.
//
// WHY A requestAnimationFrame LOOP: a layer's position on screen changes when you pan,
// zoom, edit its padding, change its text, when a font loads… Listening for every one
// of those would be complicated. Re-measuring once per frame (60× a second) is simple
// and cheap for two elements, and the loop only runs while something is hovered or
// selected, so an idle canvas does no work.
// ─────────────────────────────────────────────────────────────────────────────

// TWEAK: outlineColor — the selection blue (Figma uses #0d99ff). Set in stage-chrome.css.

type SelectionOverlayProps = {
  stageDocument: Document
  selection: LayerRef | null
  hovered: LayerRef | null
  visible: boolean // false in Interact mode
}

// Finds the element on the canvas for a layer.
function findLayerElement(stageDocument: Document, layer: LayerRef | null): Element | null {
  if (!layer) return null
  return stageDocument.querySelector(`[data-node-id="${CSS.escape(makeNodeId(layer))}"]`)
}

// How zoomed in the canvas is: the world's size on screen ÷ its real size.
function readZoom(stageDocument: Document): number {
  const world = stageDocument.querySelector<HTMLElement>('[data-canvas-world]')
  if (!world || world.offsetWidth === 0) return 1
  return world.getBoundingClientRect().width / world.offsetWidth
}

// Places an outline box over a rectangle (or hides it).
function placeBox(box: HTMLElement, rect: DOMRect | null) {
  if (!rect) {
    box.style.display = 'none'
    return
  }
  box.style.display = 'block'
  box.style.transform = `translate(${rect.left}px, ${rect.top}px)`
  box.style.width = `${rect.width}px`
  box.style.height = `${rect.height}px`
}

export function SelectionOverlay({ stageDocument, selection, hovered, visible }: SelectionOverlayProps) {
  const hoverBoxRef = useRef<HTMLDivElement>(null)
  const selectedBoxRef = useRef<HTMLDivElement>(null)
  const sizeLabelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const hoverBox = hoverBoxRef.current
    const selectedBox = selectedBoxRef.current
    const sizeLabel = sizeLabelRef.current
    const stageWindow = stageDocument.defaultView
    if (!hoverBox || !selectedBox || !sizeLabel || !stageWindow) return

    // Don't draw a hover outline on top of the selected layer.
    const hoverTarget = isSameLayer(hovered, selection) ? null : hovered
    const showSelection = visible ? selection : null
    const showHover = visible ? hoverTarget : null

    // Nothing to draw: hide everything and don't start the loop.
    if (!showSelection && !showHover) {
      placeBox(hoverBox, null)
      placeBox(selectedBox, null)
      return
    }

    let frameId = 0
    function measureAndDraw() {
      const hoveredElement = findLayerElement(stageDocument, showHover)
      placeBox(hoverBox!, hoveredElement?.getBoundingClientRect() ?? null)

      const selectedElement = findLayerElement(stageDocument, showSelection)
      const selectedRect = selectedElement?.getBoundingClientRect() ?? null
      placeBox(selectedBox!, selectedRect)

      if (selectedElement && selectedRect) {
        // The label shows the layer's REAL size (as in the code), not its zoomed size.
        // HTML elements know it directly (offsetWidth); SVG icons don't, so we un-zoom.
        let width: number
        let height: number
        if (selectedElement instanceof stageWindow!.HTMLElement) {
          width = selectedElement.offsetWidth
          height = selectedElement.offsetHeight
        } else {
          const zoom = readZoom(stageDocument)
          width = selectedRect.width / zoom
          height = selectedRect.height / zoom
        }
        const labelText = `${Math.round(width)} × ${Math.round(height)}`
        if (sizeLabel!.textContent !== labelText) sizeLabel!.textContent = labelText
      }
      frameId = stageWindow!.requestAnimationFrame(measureAndDraw)
    }
    measureAndDraw()

    return () => stageWindow.cancelAnimationFrame(frameId)
  }, [stageDocument, selection, hovered, visible])

  return (
    <div className="cc-overlay" aria-hidden>
      <div ref={hoverBoxRef} className="cc-outline cc-outline-hover" />
      <div ref={selectedBoxRef} className="cc-outline cc-outline-selected">
        <div ref={sizeLabelRef} className="cc-size-label" />
      </div>
    </div>
  )
}
