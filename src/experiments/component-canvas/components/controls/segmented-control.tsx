import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// SEGMENTED CONTROL: a row of buttons where exactly one is "on"
// (Light | Dark, All variants | This variant, → | ↓).
//
// Built as a grey track with a white "chip" on the selected option. It uses the
// radiogroup role so screen readers announce it like a set of radio buttons.
//
// About `<Value extends string>`: this is a TypeScript "generic". It just means
// "the values are some kind of string, and onChange gives back that same kind".
// So for the scope control, onChange receives 'all' | 'variant', not any string.
// ─────────────────────────────────────────────────────────────────────────────

export type SegmentOption<Value extends string> = {
  value: Value
  label?: string // text shown in the segment
  icon?: ReactNode // or an icon (or both)
  title?: string // tooltip text on hover (good for icon-only segments)
}

type SegmentedControlProps<Value extends string> = {
  options: SegmentOption<Value>[]
  value: Value | null // null = nothing selected yet
  onChange: (value: Value) => void
  ariaLabel: string
  className?: string
}

export function SegmentedControl<Value extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SegmentedControlProps<Value>) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn('flex h-7 w-full rounded-md bg-muted/60 p-0.5', className)}>
      {options.map((option) => {
        const isSelected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[5px] px-2 text-xs outline-none transition-[background-color,color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-ring/40',
              isSelected
                ? 'bg-background font-medium text-foreground shadow-xs ring-1 ring-foreground/5'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.icon}
            {option.label && <span className="truncate">{option.label}</span>}
          </button>
        )
      })}
    </div>
  )
}
