import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { toast } from 'sonner'
import { InfoExplainer } from '@/components/info/info-explainer'
import { ResultsPanel, type ResultSection } from './components/results-panel'
import { ScopeButtons } from './components/scope-buttons'
import { SearchBar } from './components/search-bar'
import type { SearchItem } from './data/types'
import { searchContent, splitIntoWords, type Scope } from './search'
import { contentTypeOrder, contentTypeStyles, zcentral } from './theme'

// TWEAK: how many rows each type shows in "All" mode before the "Show all" link.
const quickResultsPerType = 3
// TWEAK: how many characters you must type before any results show up.
const minQueryLength = 3
// TWEAK: the animation when the results panel appears. Higher duration = slower;
// startOffsetY = how far above its final spot it starts.
const panelAnimationDuration = 0.3
const panelAnimationStartOffsetY = -8
// TWEAK: how far the search box sits from the top of the page (Tailwind: pt-16 = 64px).
const pageTopSpacingClass = 'pt-16'
// TWEAK: example searches shown before you type (click one to try it).
const exampleSearches = ['chemistry', 'Studio', 'human heart', 'A614', 'E482', 'volcano', 'circuits', 'AP64']

// "All" first, then each type: the order Tab and ⌘1–⌘6 step through.
const scopeOrder: Scope[] = ['all', ...contentTypeOrder]

// Experiment: Global search
// A Spotlight-style search over five kinds of zSpace content. Type to get quick results
// grouped by type, or pick one type to see every result of it. Exact name / code
// matches float to the top as the "Best match".
export default function GlobalSearchExperiment() {
  // ---------- State ----------
  const [query, setQuery] = useState('') // what's typed
  const [scope, setScope] = useState<Scope>('all') // "All" or one content type
  const [activeIndex, setActiveIndex] = useState(0) // which result the arrow keys are on

  const inputRef = useRef<HTMLInputElement>(null)
  const resultsPanelRef = useRef<HTMLDivElement>(null)

  // ---------- Search ----------
  // useMemo: only re-run the search when the query changes, not on every render
  // (for example when the highlighted row moves).
  // Under `minQueryLength` characters, search for nothing (so no results show).
  const hasQuery = query.trim().length >= minQueryLength
  const results = useMemo(() => searchContent(hasQuery ? query : ''), [query, hasQuery])
  const words = useMemo(() => splitIntoWords(query), [query])

  // How many results each scope button would show (exact matches included).
  const counts = useMemo(() => {
    const countsByScope: Record<Scope, number> = { all: 0, lesson: 0, collection: 0, app: 0, resource: 0, model: 0 }
    for (const type of contentTypeOrder) {
      const exactOfType = results.exactMatches.filter((match) => match.item.type === type).length
      countsByScope[type] = results.matchesByType[type].length + exactOfType
      countsByScope.all += countsByScope[type]
    }
    return countsByScope
  }, [results])

  // Decide what's on screen: the best matches, then the sections of rows. Every row
  // gets a number (its keyboard index), best matches first.
  const { bestMatches, sections } = useMemo(() => {
    // Best matches only from the selected type (or from everything in "All").
    const bestMatches = results.exactMatches
      .map((match) => match.item)
      .filter((item) => scope === 'all' || item.type === scope)

    let nextIndex = bestMatches.length
    const sections: ResultSection[] = []
    const typesToShow = scope === 'all' ? contentTypeOrder : [scope]

    for (const type of typesToShow) {
      const allMatches = results.matchesByType[type]
      if (allMatches.length === 0) continue
      const shownMatches = scope === 'all' ? allMatches.slice(0, quickResultsPerType) : allMatches
      sections.push({ type, matches: shownMatches, totalCount: counts[type] || allMatches.length, firstIndex: nextIndex })
      nextIndex += shownMatches.length
    }
    return { bestMatches, sections }
  }, [results, scope, counts])

  // Every result on screen, in keyboard order, so Enter knows what to launch.
  const navigableItems: SearchItem[] = useMemo(
    () => [...bestMatches, ...sections.flatMap((section) => section.matches.map((match) => match.item))],
    [bestMatches, sections],
  )

  // The results panel only shows once enough is typed (picking a type alone shows nothing).
  const showResults = hasQuery

  // ---------- Actions ----------
  function changeQuery(newQuery: string) {
    setQuery(newQuery)
    setActiveIndex(0) // new results: start at the top
  }
  function changeScope(newScope: Scope) {
    setScope(newScope)
    setActiveIndex(0)
  }
  // These would really open the content; here they just pop a message.
  function launchItem(item: SearchItem) {
    const code = 'code' in item ? ` · ${item.code}` : ''
    const verb = item.type === 'resource' ? 'Opening' : 'Launching'
    toast(`${verb} ${item.name}`, { description: `${contentTypeStyles[item.type].label}${code}`, position: 'bottom-center' })
  }
  function showDetails(item: SearchItem) {
    toast(`Details: ${item.name}`, { description: 'A details page would open here.', position: 'bottom-center' })
  }

  // ---------- Keyboard (while typing in the search box) ----------
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // ⌘1 – ⌘6 (or Ctrl on Windows): jump straight to a scope.
    const pressedNumber = Number(event.key)
    if ((event.metaKey || event.ctrlKey) && pressedNumber >= 1 && pressedNumber <= scopeOrder.length) {
      event.preventDefault()
      changeScope(scopeOrder[pressedNumber - 1])
      return
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault() // stop the cursor jumping to the end of the text
        setActiveIndex((index) => Math.min(index + 1, navigableItems.length - 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((index) => Math.max(index - 1, 0))
        break
      case 'Enter':
        if (navigableItems[activeIndex]) launchItem(navigableItems[activeIndex])
        break
      case 'Tab': {
        // Tab = next scope, Shift+Tab = previous (wrapping around).
        event.preventDefault()
        const step = event.shiftKey ? -1 : 1
        const position = scopeOrder.indexOf(scope)
        changeScope(scopeOrder[(position + step + scopeOrder.length) % scopeOrder.length])
        break
      }
      case 'Backspace':
        // Backspace in an empty box removes the type "token".
        if (query === '' && scope !== 'all') changeScope('all')
        break
      case 'Escape':
        // Each press undoes one thing: first the text, then the type.
        if (query !== '') changeQuery('')
        else if (scope !== 'all') changeScope('all')
        break
    }
  }

  // Keep the highlighted row visible when the arrow keys move past the panel's edge.
  useEffect(() => {
    document
      .querySelector(`#global-search-results [data-result-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  // ---------- Panel animation (GSAP) ----------
  // Each time the results panel appears (you start typing, or pick a type): fade it in
  // and slide it down into place. useGSAP cleans the animation up automatically.
  useGSAP(
    () => {
      if (!showResults) return
      gsap.from(resultsPanelRef.current, {
        opacity: 0,
        y: panelAnimationStartOffsetY,
        duration: panelAnimationDuration,
        ease: 'power3.out',
      })
    },
    { dependencies: [showResults] },
  )

  return (
    <main className={`relative min-h-svh ${zcentral.page} px-4 pb-6 ${pageTopSpacingClass}`}>
      {/* A soft violet glow at the top, like zCentral's background. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[#1d1747] to-transparent" />

      {/* The search, centered near the top. TWEAK: max-w-3xl is the width. */}
      <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-3">
        <SearchBar
          inputRef={inputRef}
          query={query}
          scope={scope}
          onQueryChange={changeQuery}
          onClearScope={() => {
            changeScope('all')
            inputRef.current?.focus()
          }}
          onKeyDown={handleKeyDown}
        />
        <ScopeButtons scope={scope} counts={counts} showCounts={hasQuery} onScopeChange={changeScope} />

        {showResults ? (
          <div ref={resultsPanelRef}>
            <ResultsPanel
              bestMatches={bestMatches}
              sections={sections}
              isQuickMode={scope === 'all'}
              words={words}
              query={query}
              activeIndex={activeIndex}
              onHover={setActiveIndex}
              onLaunch={launchItem}
              onDetails={showDetails}
              onShowAll={changeScope}
            />
          </div>
        ) : null}
      </div>

      {/* DEMO ONLY (not part of the design): example searches to click, pinned to the
          bottom-left corner so they're clearly separate from the search itself. */}
      <div className="fixed bottom-4 left-4 flex max-w-[calc(100vw-2rem)] flex-wrap items-center gap-2 rounded-xl border border-dashed border-[#3a3566] bg-[#0c0b1c]/90 px-3 py-2 text-xs text-[#a3a1c2]">
        <span className="font-semibold tracking-wider uppercase">Demo · try</span>
        {exampleSearches.map((example) => (
          <button
            key={example}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => changeQuery(example)}
            className="rounded-md px-2 py-0.5 text-[#c9c2ff] ring-1 ring-[#2b2848] hover:bg-[#1c1a35]"
          >
            {example}
          </button>
        ))}
      </div>

      <InfoExplainer title="How the global search is built">
        <p>
          <strong>The idea:</strong> a Spotlight-style search over five kinds of zSpace content (lessons,
          collections, apps, Studio models and resources), styled like zCentral. Each type has different
          attributes, and the search looks through all of them.
        </p>
        <p>
          <strong>Try it:</strong> type “chemistry” or a code like “A614”. <strong>All</strong> shows a few
          quick results per type; pick a type (click, <kbd>Tab</kbd>, or <kbd>⌘1–6</kbd>) to see all of
          them. Nothing shows until you've typed 3 characters (<code>minQueryLength</code>). The example searches in the bottom-left are only there for the demo. Arrow keys
          move, Enter launches, Esc clears the text and then the type.
        </p>
        <p>
          <strong>Best match:</strong> only EXACT matches go on top, meaning the query is an item’s full
          name or quick launch code (case doesn’t matter). Everything else is ranked by points: every typed
          word must be found in the name, code, keywords, subject or app, and name hits are worth the most.
          When a result only matched a keyword, it says which one.
        </p>
        <p>
          <strong>Built with:</strong> React state for the query / type / highlighted row, plain TypeScript
          for the search (<code>search.ts</code>), Tailwind for the zCentral colors (<code>theme.ts</code>),
          lucide icons, and GSAP to slide the results panel in when it appears.
        </p>
        <p>
          <strong>The data:</strong> a local “database” in <code>data/</code>, one file per type. App names
          come from zspace.com/apps and a few lessons from zCentral; the rest are placeholders.
        </p>
        <p>
          <strong>Values to tweak:</strong> the points in <code>search.ts</code> (ranking),{' '}
          <code>quickResultsPerType</code> and the animation values at the top of{' '}
          <code>global-search.tsx</code>, and every color and icon in <code>theme.ts</code>.
        </p>
      </InfoExplainer>
    </main>
  )
}
