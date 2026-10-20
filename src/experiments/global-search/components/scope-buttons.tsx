import { SparklesIcon } from 'lucide-react'
import type { Scope } from '../search'
import { contentTypeOrder, contentTypeStyles } from '../theme'

type ScopeButtonsProps = {
  scope: Scope
  counts: Record<Scope, number> // how many results each button would show
  showCounts: boolean // only when something is typed
  onScopeChange: (scope: Scope) => void
}

// The row of buttons under the search box: "All" for quick results, or one content
// type to see every result of that type. Keyboard: Tab / Shift+Tab, or ⌘1 – ⌘6.
export function ScopeButtons({ scope, counts, showCounts, onScopeChange }: ScopeButtonsProps) {
  // "All" first, then the types in the shared order.
  const scopes: Scope[] = ['all', ...contentTypeOrder]

  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="What to search">
      {scopes.map((buttonScope, position) => {
        const isSelected = buttonScope === scope
        const label = buttonScope === 'all' ? 'All' : contentTypeStyles[buttonScope].pluralLabel
        const Icon = buttonScope === 'all' ? SparklesIcon : contentTypeStyles[buttonScope].icon
        const count = counts[buttonScope]

        return (
          <button
            key={buttonScope}
            type="button"
            role="tab"
            aria-selected={isSelected}
            title={`⌘${position + 1}`}
            // Keep focus in the search box when clicking (so typing continues).
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onScopeChange(buttonScope)}
            // TWEAK: the selected button is violet; the others are dark and dim.
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              isSelected
                ? 'bg-[#7c6cf0] text-white'
                : 'bg-[#16142b]/90 text-[#a3a1c2] ring-1 ring-[#2b2848] hover:text-white'
            } ${showCounts && count === 0 && !isSelected ? 'opacity-40' : ''}`}
          >
            <Icon className="size-3.5" />
            {label}
            {showCounts && <span className="tabular-nums opacity-70">{count}</span>}
          </button>
        )
      })}
    </div>
  )
}
