import { ArrowRightIcon, SearchXIcon } from 'lucide-react'
import type { ContentType, SearchItem } from '../data/types'
import type { Match } from '../search'
import { contentTypeStyles, zcentral } from '../theme'
import { BestMatchCard } from './best-match-card'
import { KeyHint } from './labels'
import { ResultRow } from './result-row'

// One group of rows ("Lessons", "Apps"...). `firstIndex` is the keyboard position of
// its first row, so every row on screen has its own number for the arrow keys.
export type ResultSection = {
  type: ContentType
  matches: Match[] // the rows to show
  totalCount: number // how many there are in total (may be more than shown)
  firstIndex: number
}

type ResultsPanelProps = {
  bestMatches: SearchItem[]
  sections: ResultSection[]
  isQuickMode: boolean // "All" selected: few rows per type + "Show all" links
  words: string[]
  query: string
  activeIndex: number
  onHover: (index: number) => void
  onLaunch: (item: SearchItem) => void
  onDetails: (item: SearchItem) => void
  onShowAll: (type: ContentType) => void
}

// The dark panel under the search box with all the results.
export function ResultsPanel(props: ResultsPanelProps) {
  const { bestMatches, sections, isQuickMode, words, query, activeIndex, onHover, onLaunch, onDetails, onShowAll } = props
  const hasResults = bestMatches.length > 0 || sections.length > 0

  return (
    <div className={`flex flex-col overflow-hidden rounded-3xl shadow-2xl shadow-black/60 backdrop-blur-xl ${zcentral.panel}`}>
      {/* The scrolling list. TWEAK: max-h-[60vh] is how tall the panel can get. */}
      <div id="global-search-results" role="listbox" className="flex max-h-[60vh] flex-col gap-5 overflow-y-auto p-4">
        {!hasResults && (
          <div className={`flex flex-col items-center gap-2 py-12 text-center ${zcentral.textMuted}`}>
            <SearchXIcon className="size-8" />
            <p>
              No results for <span className={zcentral.textStrong}>“{query}”</span>
            </p>
          </div>
        )}

        {/* Best match: exact name or code matches only. */}
        {bestMatches.length > 0 && (
          <section className="flex flex-col gap-2">
            <SectionTitle title={bestMatches.length === 1 ? 'Best match' : 'Best matches'} />
            {bestMatches.map((item, position) => (
              <BestMatchCard
                key={item.id}
                item={item}
                index={position}
                isActive={activeIndex === position}
                onHover={onHover}
                onLaunch={onLaunch}
                onDetails={onDetails}
              />
            ))}
          </section>
        )}

        {/* One section per content type. */}
        {sections.map((section) => (
          <section key={section.type} className="flex flex-col gap-0.5">
            <SectionTitle title={contentTypeStyles[section.type].pluralLabel} count={section.totalCount} />
            {section.matches.map((match, position) => {
              const index = section.firstIndex + position
              return (
                <ResultRow
                  key={match.item.id}
                  match={match}
                  words={words}
                  index={index}
                  isActive={activeIndex === index}
                  onHover={onHover}
                  onLaunch={onLaunch}
                  onDetails={onDetails}
                />
              )
            })}
            {/* In quick mode, a link to see every result of this type. */}
            {isQuickMode && section.totalCount > section.matches.length && (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onShowAll(section.type)}
                className="mt-1 ml-4 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-[#b3a8ff] hover:text-white"
              >
                Show all {section.totalCount} {contentTypeStyles[section.type].pluralLabel.toLowerCase()}
                <ArrowRightIcon className="size-4" />
              </button>
            )}
          </section>
        ))}
      </div>

      {/* Keyboard hints along the bottom. */}
      <div className={`flex flex-wrap gap-x-5 gap-y-1 border-t border-[#2b2848] px-5 py-3 text-xs ${zcentral.textMuted}`}>
        <span className="flex items-center gap-1.5"><KeyHint>↑</KeyHint><KeyHint>↓</KeyHint> move</span>
        <span className="flex items-center gap-1.5"><KeyHint>↵</KeyHint> launch</span>
        <span className="flex items-center gap-1.5"><KeyHint>tab</KeyHint> next type</span>
        <span className="flex items-center gap-1.5"><KeyHint>⌘1–6</KeyHint> pick type</span>
        <span className="flex items-center gap-1.5"><KeyHint>esc</KeyHint> clear</span>
      </div>
    </div>
  )
}

function SectionTitle({ title, count }: { title: string; count?: number }) {
  return (
    <h3 className={`flex items-center gap-2 px-4 text-xs font-semibold tracking-wider uppercase ${zcentral.textMuted}`}>
      {title}
      {count !== undefined && <span className="font-normal tabular-nums opacity-70">{count}</span>}
    </h3>
  )
}
