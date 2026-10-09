import type { ColorClassLists, TokenOption } from '../../types'

// ─────────────────────────────────────────────────────────────────────────────
// THEME COLOR CLASSES for the shadcn-demo workspace.
//
// Like tailwind-scale.ts, every class is written out in full so Tailwind generates it
// (styles.css points at this file with @source). Each color is tied to a theme CSS
// variable, so editing that variable in the Styles tab recolors everything using it.
//
// Later, an import script will GENERATE this file from an imported project's theme.
// TWEAK: to offer a new theme color (say --brand), add 'bg-brand', 'text-brand' and
// 'border-brand' to the three lists. The swatch variable is worked out from the name.
// ─────────────────────────────────────────────────────────────────────────────

const backgroundClasses = ['bg-transparent', 'bg-background', 'bg-foreground', 'bg-card', 'bg-card-foreground', 'bg-popover', 'bg-popover-foreground', 'bg-primary', 'bg-primary-foreground', 'bg-secondary', 'bg-secondary-foreground', 'bg-muted', 'bg-muted-foreground', 'bg-accent', 'bg-accent-foreground', 'bg-destructive', 'bg-border', 'bg-input', 'bg-ring', 'bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5']
const textColorClasses = ['text-transparent', 'text-background', 'text-foreground', 'text-card', 'text-card-foreground', 'text-popover', 'text-popover-foreground', 'text-primary', 'text-primary-foreground', 'text-secondary', 'text-secondary-foreground', 'text-muted', 'text-muted-foreground', 'text-accent', 'text-accent-foreground', 'text-destructive', 'text-border', 'text-input', 'text-ring', 'text-chart-1', 'text-chart-2', 'text-chart-3', 'text-chart-4', 'text-chart-5']
const borderColorClasses = ['border-transparent', 'border-background', 'border-foreground', 'border-card', 'border-card-foreground', 'border-popover', 'border-popover-foreground', 'border-primary', 'border-primary-foreground', 'border-secondary', 'border-secondary-foreground', 'border-muted', 'border-muted-foreground', 'border-accent', 'border-accent-foreground', 'border-destructive', 'border-border', 'border-input', 'border-ring', 'border-chart-1', 'border-chart-2', 'border-chart-3', 'border-chart-4', 'border-chart-5']

// "bg-primary" with prefix "bg-" → { label: 'primary', swatchVar: '--primary' }
// 'transparent' has no theme variable, so it gets no swatch variable.
function colorOption(className: string, prefix: string): TokenOption {
  const colorName = className.slice(prefix.length)
  if (colorName === 'transparent') return { className, label: 'transparent' }
  return { className, label: colorName, swatchVar: `--${colorName}` }
}

export const shadcnDemoColorClasses: ColorClassLists = {
  background: backgroundClasses.map((className) => colorOption(className, 'bg-')),
  textColor: textColorClasses.map((className) => colorOption(className, 'text-')),
  borderColor: borderColorClasses.map((className) => colorOption(className, 'border-')),
}
