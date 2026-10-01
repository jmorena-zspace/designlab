import { useEffect, useRef } from 'react'
import { headerIcons } from '@/components/tables/notion-table'
import { NotionTag, type TagColor } from '@/components/tags/notion-tag'

// One label: the text, its color, and which icon (by column type) to show.
export type Label = { text: string; color: TagColor; icon: keyof typeof headerIcons }

// TWEAK: how wide the soft fade is at the edges of a single-line list.
const edgeFadeWidth = '2rem'

// A group of colored labels, each with a small icon for its type
// (mail = email, arrow = link to another record, and so on).
// By default the labels wrap onto new lines. With `singleLine`, they stay on one
// line: whatever doesn't fit is hidden, with a soft fade at the edge. The row
// can be scrolled sideways from code (`scrollLeft`), and the fades follow along:
// a fade shows on the left only once it's scrolled, and on the right only while
// there's more to see.
//
// `highlightWords` (search words, lowercase) marks the labels that contain one
// with an outline. In a single-line list, the row also scrolls so the first
// match is visible.
export function LabelList({
  labels,
  singleLine = false,
  highlightWords = [],
}: {
  labels: Label[]
  singleLine?: boolean
  highlightWords?: string[]
}) {
  const listRef = useRef<HTMLDivElement>(null)
  // A label matches if its text contains any of the words.
  const matchesSearch = (label: Label) =>
    highlightWords.some((word) => label.text.toLowerCase().includes(word))
  // A simple text version of the words, so the effect below only re-runs when they change.
  const highlightKey = highlightWords.join(' ')

  // Scrolls a single-line row so the first matching label is in view, if it
  // would otherwise be hidden at the right edge.
  useEffect(() => {
    const list = listRef.current
    if (!singleLine || !list) return
    const firstMatch = list.querySelector<HTMLElement>('[data-highlighted]')
    if (!firstMatch) return
    const matchEnd = firstMatch.offsetLeft + firstMatch.offsetWidth
    if (matchEnd > list.clientWidth - 32) list.scrollLeft = firstMatch.offsetLeft - 40
  }, [singleLine, labels, highlightKey])

  // Keeps the two edge fades up to date (single-line lists only). We store how
  // wide each fade is in CSS variables; the `mask-image` class below reads them.
  useEffect(() => {
    const list = listRef.current
    if (!singleLine || !list) return

    const updateFades = () => {
      const maxScroll = list.scrollWidth - list.clientWidth
      list.style.setProperty('--fade-left', list.scrollLeft > 1 ? edgeFadeWidth : '0px')
      list.style.setProperty('--fade-right', list.scrollLeft < maxScroll - 1 ? edgeFadeWidth : '0px')
    }

    updateFades()
    list.addEventListener('scroll', updateFades) // when scrolled
    const resizeObserver = new ResizeObserver(updateFades) // when the width changes
    resizeObserver.observe(list)
    return () => {
      list.removeEventListener('scroll', updateFades)
      resizeObserver.disconnect()
    }
  }, [singleLine, labels])

  return (
    <div
      ref={listRef}
      data-label-scroller // lets other code find the row that can be scrolled
      className={
        // `relative` makes the labels' positions count from this row (needed by the scroll above).
        singleLine
          ? // `mask-image` fades out the left and right edges, by the widths in the variables.
            'relative flex flex-nowrap gap-1.5 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_var(--fade-left,0px),black_calc(100%-var(--fade-right,2rem)),transparent)]'
          : 'flex flex-wrap gap-1.5'
      }
    >
      {labels.map((label, labelIndex) => {
        const LabelIcon = headerIcons[label.icon]
        return (
          <NotionTag key={labelIndex} color={label.color} highlighted={matchesSearch(label)}>
            <LabelIcon className="size-3 opacity-60" />
            {label.text}
          </NotionTag>
        )
      })}
    </div>
  )
}
