import { useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ChevronRightIcon, StarIcon, XIcon } from 'lucide-react'
import { SearchResultRow } from '@/components/search/search-result-row'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination'
import type { RecordKind, SearchEntry, SearchResults } from '@/data/device-search'
import { recordIcons } from '@/data/record-columns'

// The search results as a full page: a title on top, a checkbox per category,
// the results grouped into categories (up to 25 rows per page), and page buttons.
// It sits under the search box, and the page scrolls normally when the list is long.
//
// THE CATEGORIES, in order (each has a checkbox that turns it on or off):
//   Best match      - the top result. It can be expanded to show its related records.
//   Sales orders, Organizations, Device groups, Devices
//                   - every other result, sorted by kind of record.
//
// It plays its own entrance animation: the title and checkboxes fade in, then the
// headings and rows one after another, then the page buttons. The same staggered
// fade replays whenever you change page or tick a checkbox.

// ---------- TWEAK: values you can change ----------
const resultsPerPage = 25
// The categories, in the order they appear. To hide a category entirely, delete its
// line. To reorder, move the lines. `id` is either 'best' or a kind of record
// (see device-search.ts); `title` is the heading and the checkbox label.
type SectionId = 'best' | RecordKind
const sectionDefinitions: { id: SectionId; title: string }[] = [
  { id: 'best', title: 'Best match' },
  { id: 'salesOrder', title: 'Sales orders' },
  { id: 'customer', title: 'Organizations' },
  { id: 'deviceGroup', title: 'Device groups' },
  { id: 'device', title: 'Devices' },
]
// Animation (seconds / pixels).
const fadeDuration = 0.3 // how long each item takes to fade in
const headerStagger = 0.05 // gap between one title / checkbox and the next
const rowStagger = 0.025 // gap between one row and the next (smaller = faster sweep)
const slideDistance = 12 // how far items slide up while fading in
const expandDuration = 0.35 // how long the "related records" area takes to open / close
// ------------------------------------------------

type PageNumber = number | 'gap'

// Decides which page buttons to show. Few pages: show them all. Many pages: show
// the first, the last, and the ones around the current page, with "…" between.
// Example with 10 pages, on page 5:   1 … 4 5 6 … 10
function getPageNumbers(currentPage: number, totalPages: number): PageNumber[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1)
  const pages = new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages])
  const sortedPages = [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b)
  const result: PageNumber[] = []
  sortedPages.forEach((page, index) => {
    if (index > 0 && page - sortedPages[index - 1] > 1) result.push('gap')
    result.push(page)
  })
  return result
}

// How items look before they fade in.
const hiddenLook = { opacity: 0, y: slideDistance }
// The items that fade in one by one, in page order: category headings, result rows,
// and the "Related records" toggle.
const staggerSelector = '[cmdk-group-heading], [data-row-index], [data-toggle-row]'

export function FullResultsList({
  results,
  query,
  words,
  onPickEntry,
  onClose,
}: {
  results: SearchResults // the best match, its related records, and the other matches
  query: string // what was searched, shown in the title
  words: string[] // search words, for the label outlines
  onPickEntry: (entry: SearchEntry) => void // called when a row is picked
  onClose: () => void // called by the close button
}) {
  // Which categories are ticked (all on at the start).
  const [enabledSections, setEnabledSections] = useState<Record<SectionId, boolean>>({
    best: true,
    salesOrder: true,
    customer: true,
    deviceGroup: true,
    device: true,
  })
  const [page, setPage] = useState(1)
  // Whether the best match's related records are showing.
  const [relatedOpen, setRelatedOpen] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)
  const relatedRef = useRef<HTMLDivElement>(null)
  const pageAnimation = useRef<gsap.core.Tween | null>(null)
  // Remembers which page and ticks were last animated, so we only replay on a change.
  const enabledKey = sectionDefinitions.map((s) => (enabledSections[s.id] ? 1 : 0)).join('')
  const lastAnimatedView = useRef(`${page}-${enabledKey}`)

  const { bestMatch, related } = results

  // SORT THE RESULTS INTO CATEGORIES. The best match gets its own category; all
  // the other results are sorted by kind of record.
  const otherEntries = [...related, ...results.otherMatches]
  const entriesBySection = (id: SectionId): SearchEntry[] =>
    id === 'best' ? (bestMatch ? [bestMatch] : []) : otherEntries.filter((entry) => entry.kind === id)

  // Every row on the page, in order: the ticked categories, one after another.
  const allRows = sectionDefinitions.flatMap((section) =>
    enabledSections[section.id]
      ? entriesBySection(section.id).map((entry) => ({ sectionId: section.id, entry }))
      : [],
  )

  // Cut out the current page, then regroup its rows by category for drawing.
  const totalPages = Math.max(1, Math.ceil(allRows.length / resultsPerPage))
  const firstRowNumber = (page - 1) * resultsPerPage
  const pageRows = allRows
    .slice(firstRowNumber, firstRowNumber + resultsPerPage)
    .map((row, rowIndex) => ({ ...row, rowIndex })) // each row knows its number on the page
  const pageGroups = sectionDefinitions
    .map((section) => ({
      ...section,
      rows: pageRows.filter((row) => row.sectionId === section.id),
    }))
    .filter((group) => group.rows.length > 0)

  // Ticking or unticking a category goes back to page 1 and closes the related records.
  const toggleSection = (id: SectionId) => {
    setEnabledSections({ ...enabledSections, [id]: !enabledSections[id] })
    setPage(1)
    setRelatedOpen(false)
  }
  const goToPage = (newPage: number) => {
    setPage(newPage)
    setRelatedOpen(false)
  }

  // OPEN / CLOSE THE BEST MATCH'S RELATED RECORDS.
  // Opening: the area is added to the page; the effect below animates it in.
  // Closing: the rows fade out and the area shrinks to nothing, THEN it is removed.
  const toggleRelated = () => {
    if (!relatedOpen) {
      setRelatedOpen(true)
      return
    }
    const rows = gsap.utils.toArray<HTMLElement>('[data-related-row]', relatedRef.current)
    gsap
      .timeline({ onComplete: () => setRelatedOpen(false) })
      .to(rows, { opacity: 0, y: -8, duration: 0.15, stagger: { each: 0.015, from: 'end' } })
      .to(relatedRef.current, { height: 0, duration: expandDuration, ease: 'power2.inOut' }, '-=0.05')
  }

  // ENTRANCE ANIMATION, once when the page appears: title and checkboxes, then
  // headings and rows, then page buttons.
  useGSAP(
    () => {
      const headerItems = gsap.utils.toArray<HTMLElement>('[data-header-item]')
      const rows = gsap.utils.toArray<HTMLElement>(staggerSelector)
      const footerItems = gsap.utils.toArray<HTMLElement>('[data-footer-item]')
      const shown = { opacity: 1, y: 0, duration: fadeDuration, ease: 'power2.out' }

      const timeline = gsap.timeline({ delay: 0.05 })
      timeline.fromTo(headerItems, hiddenLook, { ...shown, stagger: headerStagger })
      if (rows.length > 0) {
        // '-=0.15' starts the rows a little before the checkboxes finish, so it flows.
        timeline.fromTo(rows, hiddenLook, { ...shown, stagger: rowStagger }, '-=0.15')
      }
      timeline.fromTo(footerItems, hiddenLook, { ...shown, stagger: headerStagger }, '-=0.1')
    },
    { scope: rootRef },
  )

  // PAGE / CHECKBOX CHANGE ANIMATION: the new headings and rows fade in one after another.
  useGSAP(
    () => {
      const viewKey = `${page}-${enabledKey}`
      if (viewKey === lastAnimatedView.current) return // nothing changed (e.g. first render)
      lastAnimatedView.current = viewKey

      // Scroll back to the top of the page, then animate the new rows in.
      window.scrollTo({ top: 0, behavior: 'smooth' })
      pageAnimation.current?.kill()
      const rows = gsap.utils.toArray<HTMLElement>(staggerSelector)
      if (rows.length === 0) return
      pageAnimation.current = gsap.fromTo(rows, hiddenLook, {
        opacity: 1,
        y: 0,
        duration: fadeDuration,
        stagger: rowStagger,
        ease: 'power2.out',
      })
    },
    { scope: rootRef, dependencies: [page, enabledKey] },
  )

  // RELATED RECORDS OPENING ANIMATION: the area grows from nothing to its full
  // height, and its rows fade in one after another.
  useGSAP(
    () => {
      if (!relatedOpen || !relatedRef.current) return
      const rows = gsap.utils.toArray<HTMLElement>('[data-related-row]', relatedRef.current)
      gsap
        .timeline()
        .fromTo(
          relatedRef.current,
          { height: 0 },
          { height: 'auto', duration: expandDuration, ease: 'power2.out', clearProps: 'height' },
        )
        .fromTo(
          rows,
          hiddenLook,
          { opacity: 1, y: 0, duration: fadeDuration, stagger: rowStagger, ease: 'power2.out' },
          '-=0.2',
        )
    },
    { scope: rootRef, dependencies: [relatedOpen] },
  )

  return (
    <div ref={rootRef} className="flex flex-col gap-4">
      {/* TOP: the title and the close button. */}
      <div data-header-item className="flex items-center justify-between gap-3 px-1">
        <h2 className="truncate text-xl font-semibold">Results for “{query.trim()}”</h2>
        <Button size="icon-sm" variant="ghost" aria-label="Close full results" onClick={onClose}>
          <XIcon />
        </Button>
      </div>

      {/* One checkbox per category, each with how many results it has. A <label>
          around the checkbox means clicking the text ticks it too. */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 px-1">
        {sectionDefinitions.map((section) => {
          const SectionIcon = section.id === 'best' ? StarIcon : recordIcons[section.id]
          return (
            <label
              key={section.id}
              data-header-item
              className="flex cursor-pointer items-center gap-2 text-sm select-none"
            >
              <Checkbox
                checked={enabledSections[section.id]}
                onCheckedChange={() => toggleSection(section.id)}
              />
              <SectionIcon className="size-4 text-muted-foreground" />
              {section.title}
              <span className="text-muted-foreground">{entriesBySection(section.id).length}</span>
            </label>
          )
        })}
      </div>

      {/* MIDDLE: this page's results, in one wide card, grouped by category.
          `max-h-none` lifts the usual height limit, so the list is as tall as
          its rows and the page scrolls. */}
      <CommandList className="max-h-none rounded-2xl bg-card p-2 shadow-xl ring-1 ring-foreground/10">
        <CommandEmpty className="text-muted-foreground">
          Nothing to show. Tick a category above.
        </CommandEmpty>

        {pageGroups.map((group) => (
          <CommandGroup key={group.id} heading={group.title}>
            {group.rows.map(({ entry, rowIndex }) => (
              <div key={entry.key}>
                <CommandItem
                  value={entry.key}
                  data-row-index={rowIndex}
                  onSelect={() => onPickEntry(entry)}
                  className="rounded-lg px-3 py-2"
                >
                  <SearchResultRow entry={entry} words={words} />
                </CommandItem>

                {/* Only the best match gets the "related records" toggle. */}
                {group.id === 'best' && related.length > 0 && (
                  <>
                    <CommandItem
                      value="toggle-related-records"
                      data-toggle-row
                      onSelect={toggleRelated}
                      className="mt-0.5 rounded-lg px-3 py-1.5 text-muted-foreground"
                    >
                      <ChevronRightIcon
                        className={`transition-transform ${relatedOpen ? 'rotate-90' : ''}`}
                      />
                      Related records ({related.length})
                    </CommandItem>

                    {/* The related records, indented. The area is only on the page
                        while open; GSAP animates its height (see above). */}
                    {relatedOpen && (
                      <div ref={relatedRef} className="overflow-hidden pl-6">
                        {related.map((relatedEntry) => (
                          <CommandItem
                            key={relatedEntry.key}
                            value={`related:${relatedEntry.key}`}
                            data-related-row
                            onSelect={() => onPickEntry(relatedEntry)}
                            className="rounded-lg px-3 py-2"
                          >
                            <SearchResultRow entry={relatedEntry} words={words} />
                          </CommandItem>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </CommandGroup>
        ))}
      </CommandList>

      {/* BOTTOM: which results are showing, and the page buttons. */}
      <div className="flex items-center justify-between gap-3 px-1 pb-8">
        <span data-footer-item className="text-sm text-muted-foreground">
          {allRows.length === 0
            ? '0 results'
            : `${firstRowNumber + 1}–${firstRowNumber + pageRows.length} of ${allRows.length}`}
        </span>
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem data-footer-item>
              <Button size="sm" variant="ghost" disabled={page === 1} onClick={() => goToPage(page - 1)}>
                Previous
              </Button>
            </PaginationItem>
            {getPageNumbers(page, totalPages).map((pageNumber, index) => (
              <PaginationItem key={`${pageNumber}-${index}`} data-footer-item>
                {pageNumber === 'gap' ? (
                  <span className="px-2 text-muted-foreground">…</span>
                ) : (
                  <Button
                    size="icon-sm"
                    variant={pageNumber === page ? 'outline' : 'ghost'}
                    aria-current={pageNumber === page ? 'page' : undefined}
                    onClick={() => goToPage(pageNumber)}
                  >
                    {pageNumber}
                  </Button>
                )}
              </PaginationItem>
            ))}
            <PaginationItem data-footer-item>
              <Button size="sm" variant="ghost" disabled={page === totalPages} onClick={() => goToPage(page + 1)}>
                Next
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}
