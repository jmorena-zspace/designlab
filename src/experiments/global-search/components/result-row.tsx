import { CornerDownLeftIcon } from 'lucide-react'
import type { SearchItem } from '../data/types'
import type { Match } from '../search'
import { zcentral } from '../theme'
import { AppLabel, CodeChip, HighlightedText, SubjectLabel, TypeTag } from './labels'

type ResultRowProps = {
  match: Match
  words: string[] // the typed words, to highlight in the name
  index: number // this row's position in the keyboard order
  isActive: boolean // highlighted by the arrow keys or the mouse
  onHover: (index: number) => void
  onLaunch: (item: SearchItem) => void
  onDetails: (item: SearchItem) => void
}

// One search result, laid out like the zCentral rows:
//   left:  name + code, then the type tag, subject and extra info underneath
//   right: what it opens in (or Launch / Details buttons for apps)
export function ResultRow({ match, words, index, isActive, onHover, onLaunch, onDetails }: ResultRowProps) {
  const { item, reason } = match

  return (
    <div
      // `data-result-index` lets the page find this row to scroll it into view.
      data-result-index={index}
      role="option"
      aria-selected={isActive}
      // onMouseMove (not onMouseEnter) so the list scrolling under a still mouse
      // doesn't steal the highlight from the arrow keys.
      onMouseMove={() => onHover(index)}
      onClick={() => onLaunch(item)}
      // TWEAK: py-3 is the row height; rounded-xl the corner roundness.
      className={`flex cursor-pointer items-center gap-4 rounded-xl px-4 py-3 transition-colors ${
        isActive ? zcentral.activeRow : ''
      }`}
    >
      {/* Left side */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`truncate text-[15px] font-semibold ${zcentral.textStrong}`}>
            <HighlightedText text={item.name} words={words} />
          </span>
          {'code' in item && <CodeChip code={item.code} />}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <TypeTag type={item.type} />
          {'subject' in item && <SubjectLabel subject={item.subject} />}
          {item.type === 'collection' && (
            <span className={`text-xs ${zcentral.textMuted}`}>{item.lessonCodes.length} lessons</span>
          )}
          {/* Why it matched, when the name itself doesn't show it. */}
          {reason && <span className="text-xs text-[#8b7cf6]">{reason}</span>}
        </div>
      </div>

      {/* Right side */}
      <RowRightSide item={item} onLaunch={onLaunch} onDetails={onDetails} />

      {/* The "press Enter" hint on the highlighted row. */}
      <CornerDownLeftIcon className={`size-4 shrink-0 text-[#8b7cf6] ${isActive ? 'opacity-100' : 'opacity-0'}`} />
    </div>
  )
}

// The right side depends on the content type.
function RowRightSide({
  item,
  onLaunch,
  onDetails,
}: {
  item: SearchItem
  onLaunch: (item: SearchItem) => void
  onDetails: (item: SearchItem) => void
}) {
  // Apps launch themselves, so they get buttons (like zCentral).
  if (item.type === 'app') {
    return (
      <div className="flex shrink-0 gap-2">
        <RowButton label="Details" onClick={() => onDetails(item)} />
        <RowButton label="Launch" primary onClick={() => onLaunch(item)} />
      </div>
    )
  }
  // Lessons and resources open inside an app. Studio models always open in Studio.
  if (item.type === 'lesson' || item.type === 'resource') {
    return (
      <div className="hidden max-w-[45%] shrink-0 sm:flex">
        <AppLabel appName={item.application} />
      </div>
    )
  }
  if (item.type === 'model') {
    return (
      <div className="hidden shrink-0 sm:flex">
        <AppLabel appName="Studio" />
      </div>
    )
  }
  return null // collections have nothing on the right
}

export function RowButton({ label, primary, onClick }: { label: string; primary?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      // stopPropagation: clicking the button shouldn't ALSO trigger the row's own click.
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
        primary ? zcentral.primaryButton : zcentral.button
      }`}
    >
      {label}
    </button>
  )
}
