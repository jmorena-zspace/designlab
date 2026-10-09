import { cn } from '@/lib/utils'
import type { StyleMap, StyleProperty } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// STYLE CLASSES: a layer's style map → one class string, in a FIXED order.
//
// WHY THE ORDER MATTERS: `cn` (tailwind-merge) removes the EARLIER of two classes that
// fight over the same CSS. cn('pl-2', 'px-4') → 'px-4', because px-4 also sets the
// left padding. If we used the order the user happened to make the edits in, a
// "Padding left" edit made before a "Padding X" edit would silently disappear.
//
// So we always go from GENERAL to SPECIFIC: px/py before pt/pr/pb/pl. Then the
// specific edit comes later and wins, just like writing `px-4 pl-2` by hand.
// Used by the canvas renderer AND the JSX export, so both show the same classes.
// ─────────────────────────────────────────────────────────────────────────────

// Every StyleProperty, general → specific. (TypeScript checks that each entry is a
// real StyleProperty; if a new property is added to types.ts, add it here too.)
const styleOrder: StyleProperty[] = [
  // Layout: display first, then the flex settings that depend on it
  'display',
  'flexDirection',
  'flexWrap',
  'alignItems',
  'justifyContent',
  'gap',
  // Padding: both sides first, then single sides (so a single side can override)
  'paddingX',
  'paddingY',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  // Size
  'width',
  'height',
  'maxWidth',
  // Fill
  'background',
  'opacity',
  // Typography
  'fontSize',
  'fontWeight',
  'textColor',
  'textAlign',
  'letterSpacing',
  'lineHeight',
  // Border
  'borderRadius',
  'borderWidth',
  'borderColor',
  'shadow',
]

// { paddingLeft: 'pl-2', paddingX: 'px-4' } → 'px-4 pl-2'
export function styleToClassName(style: StyleMap | undefined): string {
  if (!style) return ''
  return cn(...styleOrder.map((property) => style[property]))
}
