import { LabelList } from '@/components/tags/label-list'
import type { SearchEntry } from '@/data/device-search'

// One search result on a single line: icon, name, then the labels. The name is cut
// off with "…" if it's too long, and the labels are cut off with a fade.
// Labels that match the search words (`words`) get an outline.
// TWEAK: max-w-[45%] is the most width the name may take.
export function SearchResultRow({ entry, words }: { entry: SearchEntry; words: string[] }) {
  const { icon: RecordIcon, name, labels } = entry.row
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <RecordIcon className="size-4 shrink-0 text-muted-foreground" />
      <span className="max-w-[45%] shrink-0 truncate font-medium">{name}</span>
      <div className="min-w-0 flex-1">
        <LabelList labels={labels} singleLine highlightWords={words} />
      </div>
    </div>
  )
}
