import { useEffect, useState } from 'react'
import type { CanvasChange, StyleProperty, ThemeMode } from '../../types'

// ─────────────────────────────────────────────────────────────────────────────
// COMPUTED DEFAULTS: "what does this layer look like right now, before I touch it?"
//
// Most layers have no style overrides, so the right panel would only say "Default".
// That's not very helpful. Instead we ask the browser for the real, final style of
// the rendered element (getComputedStyle) and show it in muted text, e.g. "10px".
//
// How it works:
// 1. Every rendered layer in the stage iframe has data-node-id="Button::Outline::label".
// 2. We find that element inside the iframe's document.
// 3. We read its computed style with the iframe's OWN window (stageDocument.defaultView),
//    because the stage has different CSS from the editor.
// 4. We turn the raw values into short labels, one per StyleProperty.
// We re-read whenever the selection, the change list or a frame's light/dark theme
// changes, but only after the next animation frame, so the stage has finished
// re-rendering with the new classes.
// ─────────────────────────────────────────────────────────────────────────────

// One short text per property, e.g. { gap: '8px', fontWeight: '500', background: 'oklch(…)' }
export type ComputedDefaults = Record<StyleProperty, string>

// Values like "10.5px" stay readable; "10.000001px" becomes "10px".
function roundPixels(cssValue: string): string {
  if (!cssValue.endsWith('px')) return cssValue
  const pixels = Number.parseFloat(cssValue)
  if (Number.isNaN(pixels)) return cssValue
  return `${Math.round(pixels * 10) / 10}px`
}

// "10px" + "10px" → "10px".  "10px" + "12px" → "10 / 12px" (two sides differ).
function pairLabel(first: string, second: string): string {
  const a = roundPixels(first)
  const b = roundPixels(second)
  return a === b ? a : `${a.replace('px', '')} / ${b}`
}

// Turns the browser's computed style into one label per property.
function describeComputedStyle(element: HTMLElement, style: CSSStyleDeclaration): ComputedDefaults {
  return {
    // Layout keywords are kept raw ('flex', 'row', 'center') because the layout
    // section also uses them to decide what to show.
    display: style.display,
    flexDirection: style.flexDirection,
    flexWrap: style.flexWrap,
    alignItems: style.alignItems,
    justifyContent: style.justifyContent,
    gap: roundPixels(style.columnGap === 'normal' ? '0px' : style.columnGap),
    paddingX: pairLabel(style.paddingLeft, style.paddingRight),
    paddingY: pairLabel(style.paddingTop, style.paddingBottom),
    paddingTop: roundPixels(style.paddingTop),
    paddingRight: roundPixels(style.paddingRight),
    paddingBottom: roundPixels(style.paddingBottom),
    paddingLeft: roundPixels(style.paddingLeft),
    // offsetWidth/Height are the layout size, NOT affected by the canvas zoom.
    width: `${element.offsetWidth}px`,
    height: `${element.offsetHeight}px`,
    maxWidth: style.maxWidth,
    background: style.backgroundColor,
    opacity: `${Math.round(Number.parseFloat(style.opacity) * 100)}%`,
    fontSize: roundPixels(style.fontSize),
    fontWeight: style.fontWeight,
    textColor: style.color,
    textAlign: style.textAlign === 'start' ? 'left' : style.textAlign,
    letterSpacing: roundPixels(style.letterSpacing),
    lineHeight: roundPixels(style.lineHeight),
    borderRadius: roundPixels(style.borderTopLeftRadius),
    borderWidth: roundPixels(style.borderTopWidth),
    borderColor: style.borderTopColor,
    shadow: style.boxShadow === 'none' ? 'none' : 'custom',
  }
}

// Finds the rendered element for a node id inside the stage iframe.
export function findStageElement(stageDocument: Document | null, nodeId: string | null): HTMLElement | null {
  if (!stageDocument || !nodeId) return null
  // CSS.escape makes ids with quotes or spaces safe inside the selector.
  return stageDocument.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(nodeId)}"]`)
}

// Reads a theme variable (like '--primary') as the STAGE sees it, so swatches in the
// editor show the workspace's colors (including token edits), not the editor's own theme.
// We read it ON the selected layer's element when there is one: inside a dark frame that
// element gets the dark value, so swatches match what the layer actually shows.
// Without an element we fall back to the iframe's <html> (the light theme).
export function readStageVariable(stageDocument: Document | null, nodeId: string | null, variableName: string): string | null {
  const stageWindow = stageDocument?.defaultView
  if (!stageDocument || !stageWindow) return null
  const element = findStageElement(stageDocument, nodeId) ?? stageDocument.documentElement
  const value = stageWindow.getComputedStyle(element).getPropertyValue(variableName).trim()
  return value || null
}

// The hook. `nodeId` is the selected layer; `fallbackNodeId` is used when that layer
// has no element of its own (for example a plain text layer — then we measure its parent).
export function useComputedStyle(
  stageDocument: Document | null,
  nodeId: string | null,
  fallbackNodeId: string | null,
  changes: CanvasChange[],
  frameThemes: Record<string, ThemeMode>, // only used to know WHEN to re-measure (a frame flipped light/dark)
): ComputedDefaults | null {
  const [computed, setComputed] = useState<ComputedDefaults | null>(null)

  useEffect(() => {
    // Wait one frame so the stage has painted the latest classes, then measure.
    const frameId = requestAnimationFrame(() => {
      const element = findStageElement(stageDocument, nodeId) ?? findStageElement(stageDocument, fallbackNodeId)
      const stageWindow = stageDocument?.defaultView
      if (!element || !stageWindow) {
        setComputed(null)
        return
      }
      setComputed(describeComputedStyle(element, stageWindow.getComputedStyle(element)))
    })
    // Cleanup: if the selection changes again before the frame runs, skip the old measurement.
    return () => cancelAnimationFrame(frameId)
  }, [stageDocument, nodeId, fallbackNodeId, changes, frameThemes])

  return computed
}
