import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { iconButtonClass, iconSize, iconStroke, labelColumnWidth } from './panel-styles'

// ─────────────────────────────────────────────────────────────────────────────
// PROPERTY ROW: one line of the right panel.
//   [ muted label ][ the control …………… ][ × ]
// The label sits in a fixed-width column so every control lines up.
// The × (reset) only appears when the value was changed. Its slot is always
// reserved, so controls don't jump sideways when it appears.
// ─────────────────────────────────────────────────────────────────────────────

type PropertyRowProps = {
  label: string
  children: ReactNode // the control(s)
  isOverridden?: boolean // true = show the reset ×
  onReset?: () => void
  alignTop?: boolean // for tall controls (like the alignment grid), put the label at the top
}

export function PropertyRow({ label, children, isOverridden = false, onReset, alignTop = false }: PropertyRowProps) {
  return (
    <div className={cn('flex gap-1', alignTop ? 'items-start' : 'items-center')}>
      {/* Label column. A tiny dot shows the value was edited (same idea as Figma). */}
      <span
        className={cn(
          'flex shrink-0 items-center gap-1 truncate text-[11px] text-muted-foreground',
          alignTop ? 'h-7' : '',
          isOverridden && 'text-foreground',
        )}
        style={{ width: labelColumnWidth }}
        title={label}
      >
        {label}
      </span>

      {/* The control(s). min-w-0 lets long values shrink instead of overflowing. */}
      <div className="flex min-w-0 flex-1 items-center gap-1">{children}</div>

      {/* Reset slot: always 24px wide; the button is only drawn when there's something to reset. */}
      <div className="flex size-6 shrink-0 items-center justify-center">
        {isOverridden && onReset && (
          <button type="button" className={iconButtonClass} onClick={onReset} aria-label={`Reset ${label}`} title="Reset">
            <X size={iconSize - 2} strokeWidth={iconStroke} />
          </button>
        )}
      </div>
    </div>
  )
}
