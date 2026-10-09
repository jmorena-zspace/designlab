import type { ColorClassLists, DesignNode, StyleProperty, TokenOption } from '../../types'
import { styleScales } from '../../data/tailwind-scale'
import type { ComputedDefaults } from '../controls/use-computed-style'

// ─────────────────────────────────────────────────────────────────────────────
// What every style section (Layout, Size, Fill, Typography, Border) receives
// from the right panel, plus three tiny helpers they all use.
// ─────────────────────────────────────────────────────────────────────────────

export type StyleSectionProps = {
  node: DesignNode // the selected layer, with the user's edits applied
  startingNode: DesignNode | null // the same layer before any edits (to know what "changed" means)
  computed: ComputedDefaults | null // what the browser actually shows (for muted "default" values)
  colorClasses: ColorClassLists // the workspace's theme color tokens
  swatchColorFor: (option: TokenOption) => string | null // paints color swatches with the stage's real colors
  onSetStyle: (property: StyleProperty, value: string | null) => void // already aimed at the selected layer
}

// Was this property changed from how the layer started?
export function isStyleOverridden(props: StyleSectionProps, property: StyleProperty): boolean {
  return props.node.style?.[property] !== props.startingNode?.style?.[property]
}

// Puts a property back to how the layer started. null means exactly that (see the
// RESET RULE in types.ts), in every variant the scope covers.
export function resetStyle(props: StyleSectionProps, property: StyleProperty) {
  props.onSetStyle(property, null)
}

// Color properties use the workspace's theme colors; everything else uses the shared scales.
export function optionsFor(property: StyleProperty, colorClasses: ColorClassLists): TokenOption[] {
  if (property === 'background') return colorClasses.background
  if (property === 'textColor') return colorClasses.textColor
  if (property === 'borderColor') return colorClasses.borderColor
  return styleScales[property] ?? []
}

export const colorProperties: StyleProperty[] = ['background', 'textColor', 'borderColor']
