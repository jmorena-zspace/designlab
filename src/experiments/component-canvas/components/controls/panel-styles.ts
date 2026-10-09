// ─────────────────────────────────────────────────────────────────────────────
// PANEL STYLES: the shared look of the editor chrome (left panel, right panel,
// toolbar). Changing a value here restyles every panel at once.
//
// Class names are written out in full (like 'h-7', not `h-${n}`) because Tailwind
// only generates CSS for class names it can literally find in the source.
// ─────────────────────────────────────────────────────────────────────────────

// TWEAK: panelHeaderHeight — height (px) of the left and right panel headers (try 56 to 96)
export const panelHeaderHeight = 80

// TWEAK: rowHeightClass — height of every list row and control (h-6 = 24px, h-7 = 28px, h-8 = 32px)
export const rowHeightClass = 'h-7'

// TWEAK: labelColumnWidth — width (px) of the muted label column in the right panel (try 64 to 96)
export const labelColumnWidth = 76

// TWEAK: panelPaddingClass — side padding inside the panels (px-2 = 8px, px-3 = 12px)
export const panelPaddingClass = 'px-3'

// TWEAK: iconSize / iconStroke — size (px) and line thickness of the lucide icons
export const iconSize = 14
export const iconStroke = 1.75

// TWEAK: layerIndentPx — how far (px) each nesting level is pushed right in the layer tree (try 8 to 16)
export const layerIndentPx = 12

// The small, quiet "field" look shared by dropdown triggers and text inputs:
// a soft grey fill that gets a bit darker on hover and shows a ring on keyboard focus.
export const fieldClass =
  'h-7 w-full min-w-0 rounded-md bg-muted/60 px-2 text-xs text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40'

// A square icon-only button (the eye toggle, reset ×, copy…).
export const iconButtonClass =
  'inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40'

// A small text button (Copy summary, Reset…).
export const smallButtonClass =
  'inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-40'
