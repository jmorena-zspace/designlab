import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// ALIGNMENT GRID: Figma's 3×3 "where do the children sit?" picker.
//
// Flexbox has two alignment knobs:
//   justify-*  → along the MAIN axis (the direction children flow)
//   items-*    → along the CROSS axis (the other direction)
// In a row (→), main = horizontal, so the grid's columns pick justify and its rows
// pick items. In a column (↓) it's the other way round. This component hides that
// swap: you click the spot where you want the children, and it works out both classes.
// ─────────────────────────────────────────────────────────────────────────────

type Position = 'start' | 'center' | 'end'
const positions: Position[] = ['start', 'center', 'end']

// Literal class names (Tailwind needs to see them written out in full).
const justifyClassFor: Record<Position, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
}
const alignClassFor: Record<Position, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
}

// Turns either a class ('justify-center') or a computed CSS value ('flex-end')
// into a grid position. Anything else ('normal', 'stretch', 'space-between') counts as start.
function toPosition(classOrCssValue: string | null): Position {
  if (!classOrCssValue) return 'start'
  if (classOrCssValue.endsWith('center')) return 'center'
  if (classOrCssValue.endsWith('end')) return 'end'
  return 'start'
}

type AlignmentGridProps = {
  direction: 'row' | 'column'
  justify: string | null // the current justify value (class or computed CSS)
  align: string | null // the current align-items value (class or computed CSS)
  onChange: (justifyClass: string, alignClass: string) => void
}

export function AlignmentGrid({ direction, justify, align, onChange }: AlignmentGridProps) {
  const justifyPosition = toPosition(justify)
  const alignPosition = toPosition(align)

  return (
    <div
      role="grid"
      aria-label="Alignment"
      className="grid w-[72px] shrink-0 grid-cols-3 gap-px rounded-md bg-muted/60 p-1"
    >
      {/* rowPosition = vertical spot, columnPosition = horizontal spot */}
      {positions.map((rowPosition) =>
        positions.map((columnPosition) => {
          // Which flex values does this cell mean? Depends on the direction (see top comment).
          const cellJustify = direction === 'row' ? columnPosition : rowPosition
          const cellAlign = direction === 'row' ? rowPosition : columnPosition
          const isSelected = cellJustify === justifyPosition && cellAlign === alignPosition

          return (
            <button
              key={`${rowPosition}-${columnPosition}`}
              type="button"
              aria-label={`Align ${rowPosition} ${columnPosition}`}
              aria-pressed={isSelected}
              onClick={() => onChange(justifyClassFor[cellJustify], alignClassFor[cellAlign])}
              className="group/cell flex h-5 items-center justify-center rounded-[4px] outline-none transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              {/* A dot for empty cells, a short bar for the chosen one (like Figma). */}
              <span
                className={cn(
                  'rounded-full transition-all duration-150',
                  isSelected
                    ? cn('bg-foreground', direction === 'row' ? 'h-2.5 w-1' : 'h-1 w-2.5')
                    : 'size-[3px] bg-muted-foreground/50 group-hover/cell:bg-foreground/70',
                )}
              />
            </button>
          )
        }),
      )}
    </div>
  )
}
