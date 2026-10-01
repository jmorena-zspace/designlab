import { useEffect, useRef, useState } from 'react'
import { Command as CommandPrimitive } from 'cmdk'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ChevronDownIcon, SearchIcon } from 'lucide-react'
import { DotSpinner } from '@/components/loaders/dot-spinner'
import { FullResultsList } from '@/components/search/full-results-list'
import { SearchResultRow } from '@/components/search/search-result-row'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command'
import {
  getSearchWords,
  minQueryLength,
  type SearchEntry,
  type SearchResults,
} from '@/data/device-search'

// A big search box in the style of Mac Spotlight or KDE KRunner: one large input,
// and a results panel that drops down below it. Arrow keys move through the
// results (that part is built into shadcn's Command component).
//
// This component only DRAWS the search. The parent owns the text typed and does
// the searching, then passes in the results. Usage:
//   <SpotlightSearch query={...} onQueryChange={...} results={...} hint="..." />
//
// IT HAS FOUR STATES (called "phases"):
//   idle       - not enough typed yet; no panel
//   searching  - a small panel with a spinner, pretending to search a big database
//   results    - the panel grown to show the top 5 results
//   full       - a full results page: the dropdown disappears, the search box widens
//                into a page header, and the page shows filters, 25 results per page
//                and page buttons
// Press Enter, or pick "Show all results", to go from results to the full page.
// Escape or the X goes back.

// ---------- TWEAK: values you can change ----------
// How many results show in the short list, before "Show all results".
const maxVisibleResults = 5
// How long the spinner shows (seconds). The search itself is instant; this is
// just a pause to imitate a slow, complex database.
const searchingDuration = 1.2
// How far the left / right arrow keys scroll a row's labels (pixels).
const labelScrollStep = 160
// How tall the panel is while showing the spinner (pixels).
const spinnerPanelHeight = 96
// How long the panel takes to grow (seconds), for every size change.
const panelGrowDuration = 0.35
// The spinner "disassembling": its dots fly outward and fade.
const dotsScatterDistance = 34 // how far each dot flies (pixels)
const dotsExitDuration = 0.4 // seconds
// The results appearing one after another (headings and rows, in order).
const rowFadeDuration = 0.35 // seconds for each item to fade in
const rowStagger = 0.07 // seconds between one item starting and the next. 0 = all at once
const rowSlideDistance = 14 // pixels each item travels upward while fading in
// The panel's max height in the short list (the list scrolls beyond this).
// `100svh` is the full screen height; `- 12rem` leaves room for the space above
// the box (64px), the box itself and some breathing room at the bottom.
const resultsMaxHeightClass = 'max-h-[calc(100svh-12rem)]'
// The search box's max width (pixels): when it is a dropdown, and when it has
// widened into the full results page.
const compactWidth = 672
const fullPageWidth = 1024
// --------------------------------------------------

type Phase = 'idle' | 'searching' | 'results' | 'full'

// A titled set of results, like "Related to SO118742".
type ResultGroup = { heading: string; entries: SearchEntry[]; firstRowIndex: number }

// Puts the results into groups, in display order, and keeps only the first
// `limit` rows in total. `firstRowIndex` is each group's position in the whole list.
function makeGroups(results: SearchResults, limit: number): ResultGroup[] {
  const { bestMatch, related, otherMatches } = results
  const allGroups = [
    { heading: 'Best match', entries: bestMatch ? [bestMatch] : [] },
    { heading: bestMatch ? `Related to ${bestMatch.row.name}` : 'Related', entries: related },
    { heading: 'Other matches', entries: otherMatches },
  ]

  const groups: ResultGroup[] = []
  let rowsSoFar = 0
  for (const group of allGroups) {
    const entries = group.entries.slice(0, Math.max(0, limit - rowsSoFar))
    if (entries.length > 0) {
      groups.push({ heading: group.heading, entries, firstRowIndex: rowsSoFar })
      rowsSoFar += entries.length
    }
  }
  return groups
}

// Finds the things that fade in one by one in the short list, in the order they
// appear on screen: group headings, result rows, and the "Show all results" item.
function findStaggerItems(container: HTMLElement): HTMLElement[] {
  return gsap.utils.toArray<HTMLElement>(
    '[cmdk-group-heading], [data-row-index], [data-show-all]',
    container,
  )
}

// The starting look for an item that is about to fade in, and the final look.
const hiddenLook = { opacity: 0, y: rowSlideDistance }
const visibleLook = { opacity: 1, y: 0, duration: rowFadeDuration, stagger: rowStagger, ease: 'power2.out' }

export function SpotlightSearch({
  query,
  onQueryChange,
  results,
  hint,
}: {
  query: string
  onQueryChange: (query: string) => void
  results: SearchResults
  hint: string // shown under the box while it's empty
}) {
  const [phase, setPhase] = useState<Phase>('idle')

  // Handles to elements the animations need: the whole search, and the results panel.
  const searchRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  // The panel's height just before a phase change, so it can grow or shrink smoothly
  // from there to the new size.
  const previousPanelHeight = useRef(0)
  // The panel animation that is currently playing (if any), so a new one can
  // cancel it before starting.
  const panelAnimation = useRef<gsap.core.Timeline | null>(null)
  // True once you've moved the highlight with the up / down arrows. Then Enter
  // picks the highlighted row instead of opening the full list.
  const hasNavigated = useRef(false)
  // True if Enter was pressed while still searching: open the full page when done.
  const openFullPageWhenDone = useRef(false)
  // The animation that opens or closes the full page (if one is playing). While
  // it plays, Enter and Escape are ignored so they can't start a second one.
  const pageTransition = useRef<gsap.core.Timeline | null>(null)
  // The wrapper around the full results page.
  const fullPageRef = useRef<HTMLDivElement>(null)

  // Moves to another phase, remembering the panel's current height first.
  const goToPhase = (nextPhase: Phase) => {
    previousPanelHeight.current = panelRef.current?.offsetHeight ?? 0
    setPhase(nextPhase)
  }

  // Every keystroke (or picked result) comes through here.
  const handleQueryChange = (newQuery: string) => {
    hasNavigated.current = false
    openFullPageWhenDone.current = false
    // Typing while the full page is opening or closing cancels that animation.
    pageTransition.current?.kill()
    pageTransition.current = null
    onQueryChange(newQuery)
    // Enough characters? Start "searching". Otherwise close the panel.
    goToPhase(newQuery.trim().length >= minQueryLength ? 'searching' : 'idle')
  }

  // Work out what to draw: the short list's groups, and how many results there are.
  const totalResults =
    (results.bestMatch ? 1 : 0) + results.related.length + results.otherMatches.length
  const groups = makeGroups(results, maxVisibleResults)
  const hiddenCount = totalResults - maxVisibleResults
  // The words whose matching labels get an outline.
  const searchWords = getSearchWords(query)

  // OPENING THE FULL PAGE. In order:
  //   1. whatever is in the dropdown (rows or spinner) fades out;
  //   2. the dropdown collapses, while the search box widens into a page header;
  //   3. the full page appears (it plays its own staggered entrance).
  const openFullPage = () => {
    if (pageTransition.current) return
    panelAnimation.current?.kill()
    const panel = panelRef.current
    const leavingItems = panel
      ? gsap.utils.toArray<HTMLElement>(
          '[cmdk-group-heading], [data-row-index], [data-show-all], [data-spinner]',
          panel,
        )
      : []

    const timeline = gsap.timeline({
      onComplete: () => {
        pageTransition.current = null
        goToPhase('full')
      },
    })
    pageTransition.current = timeline
    if (leavingItems.length > 0) {
      timeline.to(leavingItems, {
        opacity: 0,
        y: -8,
        duration: 0.2,
        stagger: { each: 0.02, from: 'end' },
        ease: 'power2.in',
      })
    }
    if (panel) timeline.to(panel, { height: 0, duration: panelGrowDuration, ease: 'power2.inOut' })
    // '<' starts the widening at the same time as the collapse above.
    timeline.to(
      searchRef.current,
      { maxWidth: fullPageWidth, duration: panelGrowDuration + 0.1, ease: 'power2.inOut' },
      panel ? '<' : undefined,
    )
  }

  // CLOSING THE FULL PAGE. The page fades out (last item first), the search box
  // narrows back, and the short results list comes back.
  const closeFullPage = () => {
    if (pageTransition.current) return
    const pageItems = gsap.utils.toArray<HTMLElement>(
      '[data-header-item], [data-row-index], [data-footer-item]',
      fullPageRef.current,
    )
    const timeline = gsap.timeline({
      onComplete: () => {
        pageTransition.current = null
        goToPhase('results')
      },
    })
    pageTransition.current = timeline
    timeline.to(pageItems, {
      opacity: 0,
      y: -8,
      duration: 0.2,
      stagger: { each: 0.008, from: 'end' },
      ease: 'power2.in',
    })
    timeline.to(searchRef.current, { maxWidth: compactWidth, duration: panelGrowDuration, ease: 'power2.inOut' })
  }

  // KEYBOARD.
  //  - Enter opens the full page (unless you've arrowed to a row: then it picks that row).
  //  - Escape closes the full page.
  //  - Left / right arrows scroll the highlighted row's labels sideways. If there's
  //    nothing to scroll in that direction, the arrow moves the text cursor as usual.
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') hasNavigated.current = true

    if (event.key === 'Enter' && event.target instanceof HTMLInputElement && phase !== 'idle') {
      if (hasNavigated.current) return // let the Command component pick the highlighted row
      event.preventDefault() // stop the Command component picking the first row
      if (phase === 'searching') openFullPageWhenDone.current = true
      if (phase === 'results' && totalResults > 0) openFullPage()
      return
    }

    if (event.key === 'Escape' && phase === 'full') {
      event.preventDefault()
      closeFullPage()
      return
    }

    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return

    // The highlighted row is the one cmdk marks with aria-selected="true".
    const highlightedRow = searchRef.current?.querySelector('[cmdk-item][aria-selected="true"]')
    const labelRow = highlightedRow?.querySelector<HTMLElement>('[data-label-scroller]')
    if (!labelRow) return

    const direction = event.key === 'ArrowRight' ? 1 : -1
    const maxScroll = labelRow.scrollWidth - labelRow.clientWidth
    const canScroll = direction === 1 ? labelRow.scrollLeft < maxScroll - 1 : labelRow.scrollLeft > 1
    if (!canScroll) return

    event.preventDefault() // don't also move the text cursor
    labelRow.scrollBy({ left: direction * labelScrollStep, behavior: 'smooth' })
  }

  // THE FAKE SEARCH DELAY. While in the 'searching' phase, wait `searchingDuration`
  // seconds after the LAST keystroke (typing again restarts the wait). Then the
  // spinner's dots scatter outward, and when that finishes we show the results
  // (or the full page, if Enter was pressed meanwhile).
  useEffect(() => {
    if (phase !== 'searching') return
    const dots = () => gsap.utils.toArray<HTMLElement>('[data-spinner-dot]', searchRef.current)
    let scatterAnimation: gsap.core.Tween | undefined

    const timer = setTimeout(() => {
      scatterAnimation = gsap.to(dots(), {
        // Each dot flies outward along its own angle (stored in data-angle).
        x: (_, dot) => Math.cos(Number(dot.dataset.angle)) * dotsScatterDistance,
        y: (_, dot) => Math.sin(Number(dot.dataset.angle)) * dotsScatterDistance,
        scale: 0,
        opacity: 0,
        duration: dotsExitDuration,
        stagger: 0.03,
        ease: 'power2.in',
        onComplete: () => {
          if (openFullPageWhenDone.current) openFullPage()
          else goToPhase('results')
        },
      })
    }, searchingDuration * 1000)

    // Cleanup: if you type again mid-way, cancel and put the dots back together.
    // IMPORTANT: clear only what the animation changed (movement, size and
    // fade). Clearing 'all' would also erase the dots' own position and size,
    // and the spinner would vanish.
    return () => {
      clearTimeout(timer)
      scatterAnimation?.kill()
      const currentDots = dots()
      if (currentDots.length > 0) gsap.set(currentDots, { clearProps: 'transform,opacity' })
    }
  }, [phase, query])

  // PANEL ANIMATIONS. Runs each time the phase changes. The panel always grows
  // or shrinks from its previous height to the new one:
  //   searching: the panel goes to spinner size, and the spinner fades in.
  //   results:   the panel grows to fit the top results, then headings and rows
  //              fade in one after another, sliding up.
  //   full:      nothing here. The full page plays its own staggered entrance
  //              (see full-results-list.tsx).
  // Any phase except 'full' also makes sure the search box is back to its
  // narrow dropdown width (for example if you type while on the full page).
  useGSAP(
    () => {
      if (phase !== 'full') {
        gsap.to(searchRef.current, { maxWidth: compactWidth, duration: panelGrowDuration, ease: 'power2.inOut' })
      }

      const panel = panelRef.current
      if (!panel) return

      // Cancel the previous animation first. Otherwise a slow leftover
      // animation can overwrite this new panel.
      panelAnimation.current?.kill()
      // Everything below goes into one timeline, so it can be cancelled in one go.
      const timeline = gsap.timeline()
      panelAnimation.current = timeline

      if (phase === 'searching') {
        timeline.fromTo(
          panel,
          { height: previousPanelHeight.current },
          { height: spinnerPanelHeight, duration: panelGrowDuration, ease: 'power2.out' },
        )
        timeline.fromTo(
          '[data-spinner]',
          { opacity: 0, scale: 0.6 },
          { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' },
          0.1, // start 0.1s in, so the spinner fades in while the panel is still growing
        )
      }

      if (phase === 'results') {
        const items = findStaggerItems(panel)
        timeline.fromTo(
          panel,
          { height: previousPanelHeight.current },
          // `clearProps` removes the fixed height afterwards, so the panel can
          // resize freely as the results change.
          { height: 'auto', duration: panelGrowDuration, ease: 'power2.out', clearProps: 'height' },
        )
        if (items.length > 0) timeline.fromTo(items, hiddenLook, visibleLook)
      }
    },
    { scope: searchRef, dependencies: [phase] },
  )

  return (
    // `shouldFilter={false}` turns off Command's own filtering: we do the
    // searching ourselves (device-search.ts). `relative` lets the results panel
    // hang below the box without moving it, so the box never shifts.
    <Command
      ref={searchRef}
      shouldFilter={false}
      onKeyDown={handleKeyDown}
      // The max width is set here (and animated by GSAP when the box widens).
      style={{ maxWidth: compactWidth }}
      className="relative h-auto w-full overflow-visible bg-transparent p-0"
    >
      {/* The search box. TWEAK: text-2xl is the typing size; py-4 px-5 is the padding. */}
      <div className="flex items-center gap-3 rounded-2xl bg-card px-5 py-4 shadow-2xl ring-1 ring-foreground/10">
        <SearchIcon className="size-6 shrink-0 text-muted-foreground" />
        <CommandPrimitive.Input
          autoFocus
          value={query}
          onValueChange={handleQueryChange}
          placeholder="Search devices, sales orders, customers, groups…"
          className="w-full bg-transparent text-2xl outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* A hint under the box until enough is typed. */}
      {phase === 'idle' && (
        <p className="absolute top-full mt-4 w-full text-center text-sm text-muted-foreground">
          {query.trim() === '' ? hint : `Type at least ${minQueryLength} characters to search`}
        </p>
      )}

      {/* The dropdown panel. GSAP animates its height, so it needs `overflow-hidden`
          to hide what's inside while it's still small. */}
      {(phase === 'searching' || phase === 'results') && (
        <div
          ref={panelRef}
          className="absolute top-full z-10 mt-3 w-full overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-foreground/10"
        >
          {phase === 'searching' && (
            // The spinner, centered in the small panel.
            <div data-spinner className="flex h-full items-center justify-center">
              <DotSpinner />
            </div>
          )}

          {phase === 'results' && (
            <CommandList className={`${resultsMaxHeightClass} p-2`}>
              <CommandEmpty className="text-muted-foreground">No results found.</CommandEmpty>

              {groups.map((group) => (
                <CommandGroup key={group.heading} heading={group.heading}>
                  {group.entries.map((entry, indexInGroup) => (
                    // Picking a result puts its name in the search box, so you can
                    // keep exploring from that record.
                    <CommandItem
                      key={entry.key}
                      value={entry.key}
                      data-row-index={group.firstRowIndex + indexInGroup}
                      onSelect={() => handleQueryChange(entry.row.name)}
                      className="rounded-lg px-3 py-2"
                    >
                      <SearchResultRow entry={entry} words={searchWords} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}

              {/* Appears only when some results are hidden. Enter does the same. */}
              {hiddenCount > 0 && (
                <CommandItem
                  value="show-all-results"
                  data-show-all
                  onSelect={openFullPage}
                  className="rounded-lg px-3 py-2 text-muted-foreground"
                >
                  <ChevronDownIcon />
                  Show all results ({totalResults})
                  <CommandShortcut>↵ Enter</CommandShortcut>
                </CommandItem>
              )}
            </CommandList>
          )}

        </div>
      )}

      {/* The full results page. It sits in the normal page flow under the search
          box (not floating), so the whole page scrolls when the list is long. */}
      {phase === 'full' && (
        <div ref={fullPageRef} className="mt-6">
          <FullResultsList
            results={results}
            query={query}
            words={searchWords}
            onPickEntry={(entry) => handleQueryChange(entry.row.name)}
            onClose={closeFullPage}
          />
        </div>
      )}
    </Command>
  )
}
