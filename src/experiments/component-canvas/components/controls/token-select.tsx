import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { TokenOption } from '../../types'
import { fieldClass, iconSize, iconStroke } from './panel-styles'

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN SELECT: the dropdown behind almost every style control.
//
// Notion-style menu inside a Popover:
//   Default   10px      ← first option = back to how the layer started. Its hint is the
//                         starting class (like 'w-80'), or the measured value if it had none
//   ■ primary           ← color tokens get a swatch
//   2      8px   ✓      ← label, muted hint, check on the chosen one
//
// Keyboard: when it opens, focus moves to the list. ↑/↓ move, Home/End jump,
// Enter or Space picks, Esc closes (the Popover handles Esc for us).
// ─────────────────────────────────────────────────────────────────────────────

// TWEAK: menuMaxHeight — the menu scrolls after this many pixels (try 200 to 400)
const menuMaxHeight = 280

// The browser reports "no background" as fully transparent black.
function isTransparentColor(color: string) {
  return color === 'transparent' || color === 'rgba(0, 0, 0, 0)'
}

// A small color square. Transparent gets a diagonal line so it doesn't look empty.
function Swatch({ color }: { color: string | null }) {
  const isEmpty = !color || isTransparentColor(color)
  return (
    <span
      className="relative size-3.5 shrink-0 overflow-hidden rounded-[4px] ring-1 ring-foreground/15 ring-inset"
      style={{ backgroundColor: isEmpty ? undefined : color }}
    >
      {isEmpty && <span className="absolute top-1/2 left-[-2px] h-px w-[22px] -rotate-45 bg-destructive/70" />}
    </span>
  )
}

type TokenSelectProps = {
  value: string | null // the chosen class (e.g. 'gap-2'), or null = nothing set
  options: TokenOption[]
  onChange: (value: string | null) => void // null = "Default" (back to the starting value)
  ariaLabel: string
  defaultHint?: string // muted text next to "Default", e.g. 'w-80' or '8px'
  defaultSwatch?: string | null // for colors: the color "Default" stands for
  isColor?: boolean // show swatches
  includeDefaultOption?: boolean // false hides the "Default" row
  // For colors: turns a token into a paintable color. The right panel passes one that
  // reads the workspace's real value; without it we use the CSS variable itself.
  swatchColorFor?: (option: TokenOption) => string | null
  className?: string
}

export function TokenSelect({
  value,
  options,
  onChange,
  ariaLabel,
  defaultHint,
  defaultSwatch = null,
  isColor = false,
  includeDefaultOption = true,
  swatchColorFor = (option) => (option.swatchVar ? `var(${option.swatchVar})` : null),
  className,
}: TokenSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  // Which row the keyboard is on (an index into `rows` below).
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  // The rows of the menu. `null` stands for the "Default" row.
  const rows: (TokenOption | null)[] = includeDefaultOption ? [null, ...options] : options
  const selectedOption = options.find((option) => option.className === value) ?? null
  const selectedIndex = rows.indexOf(selectedOption)

  function pick(row: TokenOption | null) {
    onChange(row ? row.className : null)
    setIsOpen(false)
  }

  // Opening: start the keyboard highlight on the current choice.
  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) setActiveIndex(Math.max(selectedIndex, 0))
    setIsOpen(nextOpen)
  }

  // Arrow-key navigation inside the open menu.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const lastIndex = rows.length - 1
    if (event.key === 'ArrowDown') setActiveIndex((index) => Math.min(index + 1, lastIndex))
    else if (event.key === 'ArrowUp') setActiveIndex((index) => Math.max(index - 1, 0))
    else if (event.key === 'Home') setActiveIndex(0)
    else if (event.key === 'End') setActiveIndex(lastIndex)
    else if (event.key === 'Enter' || event.key === ' ') pick(rows[activeIndex])
    else return // any other key: let it through
    // We handled this key, so keep it away from the page's keyboard shortcuts.
    event.preventDefault()
    event.stopPropagation()
  }

  // Keep the highlighted row visible when the keyboard moves past the scroll edge.
  useEffect(() => {
    if (!isOpen) return
    const activeRow = listRef.current?.querySelector('[data-active="true"]')
    activeRow?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, isOpen])


  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        aria-label={ariaLabel}
        className={cn(fieldClass, 'flex items-center gap-1.5 text-left aria-expanded:bg-muted', className)}
      >
        {isColor && <Swatch color={selectedOption ? swatchColorFor(selectedOption) : defaultSwatch} />}
        {selectedOption ? (
          <span className="truncate">{selectedOption.label}</span>
        ) : (
          // Nothing set: show the hint (like the measured '10px') in muted text.
          <span className="truncate text-muted-foreground">{defaultHint ?? 'Default'}</span>
        )}
        <ChevronDown size={iconSize - 2} strokeWidth={iconStroke} className="ml-auto shrink-0 text-muted-foreground/70" />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={4}
        initialFocus={listRef}
        className="w-[max(var(--anchor-width),180px)] gap-0 p-1 text-xs"
      >
        <div
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className="overflow-y-auto outline-none"
          style={{ maxHeight: menuMaxHeight }}
        >
          {rows.map((row, index) => {
            const isSelected = row === selectedOption
            const isActive = index === activeIndex
            return (
              <div
                key={row?.className ?? 'default'}
                role="option"
                aria-selected={isSelected}
                data-active={isActive}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => pick(row)}
                className={cn(
                  'flex h-7 cursor-default items-center gap-2 rounded-md px-2',
                  isActive && 'bg-muted',
                  // A thin line under the "Default" row separates it from the tokens.
                  row === null && 'mb-1 shadow-[0_5px_0_-4px_var(--border)]',
                )}
              >
                {isColor && <Swatch color={row ? swatchColorFor(row) : defaultSwatch} />}
                {row ? (
                  <>
                    <span className="truncate">{row.label}</span>
                    {row.hint && <span className="text-muted-foreground">{row.hint}</span>}
                  </>
                ) : (
                  <>
                    <span>Default</span>
                    {defaultHint && <span className="truncate text-muted-foreground">{defaultHint}</span>}
                  </>
                )}
                {isSelected && <Check size={iconSize - 1} strokeWidth={iconStroke} className="ml-auto shrink-0" />}
              </div>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
