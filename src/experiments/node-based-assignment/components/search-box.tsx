import { SearchIcon, XIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'

// A search box. The page (or panel) that uses it owns the text and does the filtering.
// `countLabel` is a short result count shown inside the box while something is typed,
// like "5 groups".
export function SearchBox({
  value,
  onChange,
  placeholder,
  countLabel,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  countLabel: string
}) {
  return (
    // `data-canvas-control` tells the canvas not to start panning from here.
    <div data-canvas-control className="relative">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        // TWEAK: h-11 is the height; rounded-2xl the roundness; pr-28 leaves room for the count.
        className="h-11 rounded-2xl border-0 bg-card/95 pr-28 pl-10 shadow-xl ring-1 ring-foreground/10 backdrop-blur"
      />
      {/* When something is typed: how many results, and a small X to clear it. */}
      {value.trim() && (
        <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1.5">
          <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">{countLabel}</span>
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onChange('')}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      )}
    </div>
  )
}
