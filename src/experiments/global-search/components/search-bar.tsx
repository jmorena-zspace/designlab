import type { KeyboardEvent, RefObject } from 'react'
import { SearchIcon, XIcon } from 'lucide-react'
import type { Scope } from '../search'
import { contentTypeStyles, zcentral } from '../theme'
import { KeyHint } from './labels'

type SearchBarProps = {
  inputRef: RefObject<HTMLInputElement | null>
  query: string
  scope: Scope
  onQueryChange: (query: string) => void
  onClearScope: () => void
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
}

// The big violet search box. When a content type is picked, it shows as a "token"
// at the start of the box (like Spotlight), which you can remove with its × or by
// pressing Backspace in an empty box.
export function SearchBar({ inputRef, query, scope, onQueryChange, onClearScope, onKeyDown }: SearchBarProps) {
  const scopeStyle = scope === 'all' ? null : contentTypeStyles[scope]
  const placeholder = scopeStyle
    ? `Search ${scopeStyle.pluralLabel.toLowerCase()}…`
    : 'Search lessons, apps, models, collections and resources…'

  return (
    // TWEAK: h-14 is the height; rounded-2xl the roundness.
    <div className={`flex h-14 items-center gap-3 rounded-2xl px-4 shadow-2xl shadow-black/50 ${zcentral.searchBar}`}>
      <SearchIcon className="size-5 shrink-0 text-[#a78bfa]" />

      {scopeStyle && (
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-md py-0.5 pr-1 pl-1.5 text-sm font-medium ring-1 ${scopeStyle.tagClasses}`}>
          <scopeStyle.icon className="size-3.5" />
          {scopeStyle.pluralLabel}
          <button type="button" aria-label="Search everything" onClick={onClearScope} className="rounded p-0.5 hover:bg-white/10">
            <XIcon className="size-3" />
          </button>
        </span>
      )}

      <input
        ref={inputRef}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoFocus
        spellCheck={false}
        aria-label="Search"
        className={`h-full min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-[#6f6c95] ${zcentral.textStrong}`}
      />

      <KeyHint>ESC</KeyHint>
    </div>
  )
}
