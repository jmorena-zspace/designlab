import type { StyleProperty, TokenOption } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// THE TOKEN SCALES the right panel offers (everything except theme colors,
// which live in each workspace's token-classes.ts).
//
// WHY EVERY CLASS IS WRITTEN OUT IN FULL:
// Tailwind builds CSS only for class names it can literally find in source files.
// If we wrote `gap-${n}`, Tailwind would never see "gap-2" and that class would have
// no CSS. So each list below spells out every class. The workspace CSS points at this
// file with `@source`, and Tailwind generates all of them.
//
// TWEAK: add or remove classes in any list to change what the dropdowns offer.
// Just write the whole class name, e.g. add 'gap-9' to gapClasses.
// ─────────────────────────────────────────────────────────────────────────────

// ── Spacing (gap + padding) ──────────────────────────────────────────────────
const gapClasses = ['gap-0', 'gap-px', 'gap-0.5', 'gap-1', 'gap-1.5', 'gap-2', 'gap-2.5', 'gap-3', 'gap-3.5', 'gap-4', 'gap-5', 'gap-6', 'gap-7', 'gap-8', 'gap-10', 'gap-12', 'gap-14', 'gap-16', 'gap-20', 'gap-24']
const paddingXClasses = ['px-0', 'px-px', 'px-0.5', 'px-1', 'px-1.5', 'px-2', 'px-2.5', 'px-3', 'px-3.5', 'px-4', 'px-5', 'px-6', 'px-7', 'px-8', 'px-10', 'px-12', 'px-14', 'px-16', 'px-20', 'px-24']
const paddingYClasses = ['py-0', 'py-px', 'py-0.5', 'py-1', 'py-1.5', 'py-2', 'py-2.5', 'py-3', 'py-3.5', 'py-4', 'py-5', 'py-6', 'py-7', 'py-8', 'py-10', 'py-12', 'py-14', 'py-16', 'py-20', 'py-24']
const paddingTopClasses = ['pt-0', 'pt-px', 'pt-0.5', 'pt-1', 'pt-1.5', 'pt-2', 'pt-2.5', 'pt-3', 'pt-3.5', 'pt-4', 'pt-5', 'pt-6', 'pt-7', 'pt-8', 'pt-10', 'pt-12', 'pt-14', 'pt-16', 'pt-20', 'pt-24']
const paddingRightClasses = ['pr-0', 'pr-px', 'pr-0.5', 'pr-1', 'pr-1.5', 'pr-2', 'pr-2.5', 'pr-3', 'pr-3.5', 'pr-4', 'pr-5', 'pr-6', 'pr-7', 'pr-8', 'pr-10', 'pr-12', 'pr-14', 'pr-16', 'pr-20', 'pr-24']
const paddingBottomClasses = ['pb-0', 'pb-px', 'pb-0.5', 'pb-1', 'pb-1.5', 'pb-2', 'pb-2.5', 'pb-3', 'pb-3.5', 'pb-4', 'pb-5', 'pb-6', 'pb-7', 'pb-8', 'pb-10', 'pb-12', 'pb-14', 'pb-16', 'pb-20', 'pb-24']
const paddingLeftClasses = ['pl-0', 'pl-px', 'pl-0.5', 'pl-1', 'pl-1.5', 'pl-2', 'pl-2.5', 'pl-3', 'pl-3.5', 'pl-4', 'pl-5', 'pl-6', 'pl-7', 'pl-8', 'pl-10', 'pl-12', 'pl-14', 'pl-16', 'pl-20', 'pl-24']

// ── Size ─────────────────────────────────────────────────────────────────────
const widthClasses = ['w-auto', 'w-fit', 'w-full', 'w-min', 'w-max', 'w-4', 'w-6', 'w-8', 'w-10', 'w-12', 'w-16', 'w-20', 'w-24', 'w-32', 'w-40', 'w-48', 'w-56', 'w-64', 'w-72', 'w-80', 'w-96', 'w-xs', 'w-sm', 'w-md', 'w-lg', 'w-xl', 'w-2xl']
const heightClasses = ['h-auto', 'h-fit', 'h-full', 'h-4', 'h-5', 'h-6', 'h-7', 'h-8', 'h-9', 'h-10', 'h-11', 'h-12', 'h-14', 'h-16', 'h-20', 'h-24', 'h-32', 'h-40', 'h-48', 'h-64']
const maxWidthClasses = ['max-w-none', 'max-w-full', 'max-w-3xs', 'max-w-2xs', 'max-w-xs', 'max-w-sm', 'max-w-md', 'max-w-lg', 'max-w-xl', 'max-w-2xl', 'max-w-3xl']

// ── Layout keywords ──────────────────────────────────────────────────────────
const displayClasses = ['block', 'inline-block', 'flex', 'inline-flex', 'grid', 'hidden']
const flexDirectionClasses = ['flex-row', 'flex-col', 'flex-row-reverse', 'flex-col-reverse']
const flexWrapClasses = ['flex-nowrap', 'flex-wrap']
const alignItemsClasses = ['items-start', 'items-center', 'items-end', 'items-stretch', 'items-baseline']
const justifyContentClasses = ['justify-start', 'justify-center', 'justify-end', 'justify-between', 'justify-around', 'justify-evenly']

// ── Typography ───────────────────────────────────────────────────────────────
const fontSizeClasses = ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl']
const fontWeightClasses = ['font-light', 'font-normal', 'font-medium', 'font-semibold', 'font-bold']
const textAlignClasses = ['text-left', 'text-center', 'text-right', 'text-justify']
const letterSpacingClasses = ['tracking-tighter', 'tracking-tight', 'tracking-normal', 'tracking-wide', 'tracking-wider', 'tracking-widest']
const lineHeightClasses = ['leading-none', 'leading-tight', 'leading-snug', 'leading-normal', 'leading-relaxed', 'leading-loose']

// ── Fill, border, effects ────────────────────────────────────────────────────
const opacityClasses = ['opacity-0', 'opacity-10', 'opacity-25', 'opacity-50', 'opacity-60', 'opacity-70', 'opacity-75', 'opacity-80', 'opacity-90', 'opacity-100']
const borderRadiusClasses = ['rounded-none', 'rounded-xs', 'rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-4xl', 'rounded-full']
const borderWidthClasses = ['border-0', 'border', 'border-2', 'border-4', 'border-8']
const shadowClasses = ['shadow-none', 'shadow-2xs', 'shadow-xs', 'shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl']

// ─────────────────────────────────────────────────────────────────────────────
// Turning class names into dropdown options.
// ─────────────────────────────────────────────────────────────────────────────

// In Tailwind v4 every spacing step is `--spacing` (0.25rem = 4px) times the number.
// TWEAK: spacingUnitPx — change if your project uses a different --spacing value.
const spacingUnitPx = 4

// "gap-2.5" → { label: '2.5', hint: '10px' }.  "px-px" → { label: 'px', hint: '1px' }
function spacingOption(className: string): TokenOption {
  const step = className.slice(className.lastIndexOf('-') + 1)
  if (step === 'px') return { className, label: 'px', hint: '1px' }
  const pixels = Number(step) * spacingUnitPx
  return { className, label: step, hint: `${pixels}px` }
}

// Removes a known prefix to get a short label: ('rounded-lg', 'rounded-') → 'lg'.
// Classes that are only the prefix word (like 'border') get the label 'default'.
function keywordOption(className: string, prefix: string): TokenOption {
  const label = className.startsWith(prefix) ? className.slice(prefix.length) : 'default'
  return { className, label }
}

function spacingOptions(classNames: string[]): TokenOption[] {
  return classNames.map(spacingOption)
}

function keywordOptions(classNames: string[], prefix: string): TokenOption[] {
  return classNames.map((className) => keywordOption(className, prefix))
}

// Every property's list of choices (theme colors are added per workspace).
export const styleScales: Partial<Record<StyleProperty, TokenOption[]>> = {
  display: keywordOptions(displayClasses, ''),
  flexDirection: keywordOptions(flexDirectionClasses, 'flex-'),
  flexWrap: keywordOptions(flexWrapClasses, 'flex-'),
  alignItems: keywordOptions(alignItemsClasses, 'items-'),
  justifyContent: keywordOptions(justifyContentClasses, 'justify-'),
  gap: spacingOptions(gapClasses),
  paddingX: spacingOptions(paddingXClasses),
  paddingY: spacingOptions(paddingYClasses),
  paddingTop: spacingOptions(paddingTopClasses),
  paddingRight: spacingOptions(paddingRightClasses),
  paddingBottom: spacingOptions(paddingBottomClasses),
  paddingLeft: spacingOptions(paddingLeftClasses),
  width: keywordOptions(widthClasses, 'w-'),
  height: keywordOptions(heightClasses, 'h-'),
  maxWidth: keywordOptions(maxWidthClasses, 'max-w-'),
  opacity: keywordOptions(opacityClasses, 'opacity-'),
  fontSize: keywordOptions(fontSizeClasses, 'text-'),
  fontWeight: keywordOptions(fontWeightClasses, 'font-'),
  textAlign: keywordOptions(textAlignClasses, 'text-'),
  letterSpacing: keywordOptions(letterSpacingClasses, 'tracking-'),
  lineHeight: keywordOptions(lineHeightClasses, 'leading-'),
  borderRadius: keywordOptions(borderRadiusClasses, 'rounded-'),
  borderWidth: keywordOptions(borderWidthClasses, 'border-'),
  shadow: keywordOptions(shadowClasses, 'shadow-'),
}

// Human-friendly names for each property (used in panels and in the export diff).
export const stylePropertyLabels: Record<StyleProperty, string> = {
  display: 'Display',
  flexDirection: 'Direction',
  flexWrap: 'Wrap',
  alignItems: 'Align',
  justifyContent: 'Justify',
  gap: 'Gap',
  paddingX: 'Padding X',
  paddingY: 'Padding Y',
  paddingTop: 'Padding top',
  paddingRight: 'Padding right',
  paddingBottom: 'Padding bottom',
  paddingLeft: 'Padding left',
  width: 'Width',
  height: 'Height',
  maxWidth: 'Max width',
  background: 'Fill',
  opacity: 'Opacity',
  fontSize: 'Size',
  fontWeight: 'Weight',
  textColor: 'Color',
  textAlign: 'Align',
  letterSpacing: 'Letter spacing',
  lineHeight: 'Line height',
  borderRadius: 'Radius',
  borderWidth: 'Border width',
  borderColor: 'Border color',
  shadow: 'Shadow',
}
