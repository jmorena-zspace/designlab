import type { SearchItem } from '../data/types'
import { contentTypeStyles, zcentral } from '../theme'
import { AppLabel, CodeChip, SubjectLabel, TypeTag } from './labels'
import { RowButton } from './result-row'

type BestMatchCardProps = {
  item: SearchItem
  index: number // position in the keyboard order (best matches come first)
  isActive: boolean
  onHover: (index: number) => void
  onLaunch: (item: SearchItem) => void
  onDetails: (item: SearchItem) => void
}

// The "Best match" on top: a bigger card, only used for EXACT matches (the query is the
// item's full name or its quick launch code). Like Spotlight's "Top Hit".
export function BestMatchCard({ item, index, isActive, onHover, onLaunch, onDetails }: BestMatchCardProps) {
  const typeStyle = contentTypeStyles[item.type]
  const TypeIcon = typeStyle.icon

  // The line under the name: what it opens in, or how many lessons it holds.
  let openedIn: string | null = null
  if (item.type === 'lesson' || item.type === 'resource') openedIn = item.application
  if (item.type === 'model') openedIn = 'Studio'

  return (
    <div
      data-result-index={index}
      role="option"
      aria-selected={isActive}
      onMouseMove={() => onHover(index)}
      onClick={() => onLaunch(item)}
      // A soft violet glow sets it apart from the normal rows.
      // TWEAK: the gradient colors (from-/to-) and ring color.
      className={`flex cursor-pointer items-center gap-4 rounded-2xl bg-gradient-to-r from-[#2a2350] to-[#151329] p-4 ring-1 transition-shadow ${
        isActive ? 'ring-[#8b7cf6] shadow-[0_0_32px_-8px_#8b7cf6]' : 'ring-[#3a3566]'
      }`}
    >
      {/* Big icon tile for the type */}
      <div className={`grid size-14 shrink-0 place-items-center rounded-xl ${typeStyle.iconTileClasses}`}>
        <TypeIcon className="size-7" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`truncate text-xl font-semibold ${zcentral.textStrong}`}>{item.name}</span>
          {'code' in item && <CodeChip code={item.code} />}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <TypeTag type={item.type} />
          {'subject' in item && <SubjectLabel subject={item.subject} />}
          {item.type === 'collection' && (
            <span className={`text-xs ${zcentral.textMuted}`}>{item.lessonCodes.length} lessons</span>
          )}
          {openedIn && <AppLabel appName={openedIn} />}
        </div>
      </div>

      <div className="flex shrink-0 gap-2">
        <RowButton label="Details" onClick={() => onDetails(item)} />
        <RowButton label={item.type === 'resource' ? 'Open' : 'Launch'} primary onClick={() => onLaunch(item)} />
      </div>
    </div>
  )
}
