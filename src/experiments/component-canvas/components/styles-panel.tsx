import { useState } from 'react'
import { X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { CanvasChange, ThemeMode, ThemeVariable } from '../types'
import { getTokenOverrides } from '../apply-changes'
import { iconButtonClass, iconSize, iconStroke, panelPaddingClass, rowHeightClass } from './controls/panel-styles'
import { SegmentedControl } from './controls/segmented-control'
import { TextField } from './controls/text-field'

// ─────────────────────────────────────────────────────────────────────────────
// STYLES PANEL: the "Styles" tab. Lists the workspace's theme variables
// (--primary, --radius…) for light or dark mode and lets you edit them.
//
// Edits are token changes: they only restyle the canvas (the stage iframe), never
// the editor or the original CSS file. Export turns them into CSS you can paste.
// Current value = your edit for this mode if there is one, otherwise the original.
// ─────────────────────────────────────────────────────────────────────────────

type StylesPanelProps = {
  themeVariables: ThemeVariable[]
  changes: CanvasChange[]
  onSetToken: (mode: ThemeMode, variable: string, value: string | null) => void
}

// The three groups, in the order they're shown.
const groups: { group: ThemeVariable['group']; title: string }[] = [
  { group: 'color', title: 'Colors' },
  { group: 'radius', title: 'Radius' },
  { group: 'other', title: 'Other' },
]

export function StylesPanel({ themeVariables, changes, onSetToken }: StylesPanelProps) {
  const [mode, setMode] = useState<ThemeMode>('light')
  const overrides = getTokenOverrides(changes, mode)

  // Only variables that have a value in the chosen mode.
  const variablesInMode = themeVariables.filter((variable) => variable[mode] !== undefined)

  return (
    <div className="flex flex-col gap-3 py-2">
      <div className={panelPaddingClass}>
        <SegmentedControl<ThemeMode>
          ariaLabel="Theme mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
      </div>

      {groups.map(({ group, title }) => {
        const variables = variablesInMode.filter((variable) => variable.group === group)
        if (variables.length === 0) return null
        return (
          <div key={group}>
            <h3 className={cn('flex h-6 items-center text-[11px] font-medium text-muted-foreground', panelPaddingClass)}>
              {title}
            </h3>
            <div className="flex flex-col px-1.5">
              {variables.map((variable) => {
                const originalValue = variable[mode] ?? ''
                const editedValue = overrides[variable.name]
                return (
                  <TokenRow
                    key={variable.name}
                    variable={variable}
                    value={editedValue ?? originalValue}
                    isEdited={editedValue !== undefined}
                    onChange={(value) => onSetToken(mode, variable.name, value)}
                    onReset={() => onSetToken(mode, variable.name, null)}
                  />
                )
              })}
            </div>
          </div>
        )
      })}

      {variablesInMode.length === 0 && (
        <p className={cn('text-xs text-muted-foreground', panelPaddingClass)}>No theme variables found for {mode} mode.</p>
      )}
    </div>
  )
}

// ── One variable row ─────────────────────────────────────────────────────────
// Colors: [swatch] name  value  • ×      Everything else: name [text field] ×
function TokenRow({
  variable,
  value,
  isEdited,
  onChange,
  onReset,
}: {
  variable: ThemeVariable
  value: string
  isEdited: boolean
  onChange: (value: string) => void
  onReset: () => void
}) {
  const displayName = variable.name.replace(/^--/, '')
  const isColor = variable.group === 'color'

  return (
    <div className={cn(rowHeightClass, 'group/token flex items-center gap-2 rounded-md px-1.5 text-xs transition-colors hover:bg-muted/60')}>
      {isColor && <ColorSwatchPicker name={displayName} value={value} onChange={onChange} />}

      <span className="min-w-0 flex-1 truncate" title={variable.name}>
        {displayName}
      </span>

      {isColor ? (
        <span className="max-w-[88px] truncate font-mono text-[11px] text-muted-foreground" title={value}>
          {value}
        </span>
      ) : (
        <TextField ariaLabel={displayName} value={value} onCommit={onChange} mono className="h-6 w-[96px] flex-none" />
      )}

      {/* Edited marker + reset. The slot is always there so values stay aligned. */}
      <span className="flex w-6 shrink-0 items-center justify-center">
        {isEdited && (
          <>
            <span className="size-1.5 rounded-full bg-primary group-hover/token:hidden" aria-label="Edited" />
            <button
              type="button"
              aria-label={`Reset ${displayName}`}
              title="Reset"
              onClick={onReset}
              className={cn(iconButtonClass, 'hidden size-5 group-hover/token:inline-flex focus-visible:inline-flex')}
            >
              <X size={iconSize - 2} strokeWidth={iconStroke} />
            </button>
          </>
        )}
      </span>
    </div>
  )
}

// ── Color picker in a popover ────────────────────────────────────────────────
// A text field takes any CSS color (oklch, hex, rgb…). The native color input is
// the quick visual picker. It only understands opaque hex colors, so for colors that
// are see-through (like oklch(1 0 0 / 10%)) we hide it rather than lose the transparency.
function ColorSwatchPicker({ name, value, onChange }: { name: string; value: string; onChange: (value: string) => void }) {
  const { hex, isTransparent } = readColor(value)
  return (
    <Popover>
      <PopoverTrigger
        aria-label={`Edit ${name}`}
        className="size-4 shrink-0 rounded-[4px] ring-1 ring-foreground/15 outline-none ring-inset transition-shadow hover:ring-foreground/40 focus-visible:ring-2 focus-visible:ring-ring"
        style={{ backgroundColor: value }}
      />
      <PopoverContent align="start" side="right" sideOffset={12} className="w-60 gap-2 p-2.5 text-xs">
        <span className="font-medium">{name}</span>
        <div className="flex items-center gap-1.5">
          {/* Native picker: a colored square that opens the browser's color dialog. */}
          {!isTransparent && (
            <input
              type="color"
              aria-label={`Pick ${name}`}
              value={hex}
              onChange={(event) => onChange(event.target.value)}
              className="size-7 shrink-0 cursor-pointer rounded-md border-0 bg-transparent p-0 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
            />
          )}
          <TextField ariaLabel={`${name} value`} value={value} onCommit={onChange} mono />
        </div>
        <p className="text-[11px] text-muted-foreground">
          {isTransparent
            ? 'This color is see-through, so edit it as text to keep its transparency.'
            : 'Any CSS color: oklch(), #hex, rgb()…'}
        </p>
      </PopoverContent>
    </Popover>
  )
}

// ── Any CSS color → "#rrggbb" (+ is it see-through?) ─────────────────────────
// <input type="color"> only accepts hex, but theme colors are often oklch(…).
// Trick: let the browser do the conversion. We paint the color onto a tiny 1×1
// canvas, then read back that one pixel's red/green/blue/alpha numbers (0–255) and
// write the first three as hex. The canvas understands every color format the browser
// does. (Colors outside the sRGB range get clamped to the nearest one — fine for a picker.)
let colorCanvasContext: CanvasRenderingContext2D | null = null

function readColor(color: string): { hex: string; isTransparent: boolean } {
  // Create the canvas only once and reuse it.
  if (!colorCanvasContext) {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    colorCanvasContext = canvas.getContext('2d', { willReadFrequently: true })
  }
  if (!colorCanvasContext) return { hex: '#000000', isTransparent: false }

  const context = colorCanvasContext
  context.clearRect(0, 0, 1, 1)
  context.fillStyle = '#000000' // if `color` is invalid, fillStyle keeps this black
  context.fillStyle = color
  context.fillRect(0, 0, 1, 1)
  const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data
  const toHexPair = (channel: number) => channel.toString(16).padStart(2, '0')
  return {
    hex: `#${toHexPair(red)}${toHexPair(green)}${toHexPair(blue)}`,
    isTransparent: alpha < 255, // 255 = fully solid
  }
}
