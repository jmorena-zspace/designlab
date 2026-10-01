import type { ReactNode } from 'react'

// The tag colors, matching Notion's palette. Each color has a soft background
// and a darker text color.
// TWEAK: change any hex code (like #D3E5EF) to adjust a color, or add a new one
// (also add its name to `TagColor` below).
const tagColorClasses = {
  gray: 'bg-[#E3E2E0] text-[#32302C]',
  brown: 'bg-[#EEE0DA] text-[#442A1E]',
  orange: 'bg-[#FADEC9] text-[#49290E]',
  yellow: 'bg-[#FDECC8] text-[#402C1B]',
  green: 'bg-[#DBEDDB] text-[#1C3829]',
  blue: 'bg-[#D3E5EF] text-[#183347]',
  purple: 'bg-[#E8DEEE] text-[#412454]',
  pink: 'bg-[#F5E0E9] text-[#4C2337]',
  red: 'bg-[#FFE2DD] text-[#5D1715]',
}

// The list of color names you can use, e.g. <NotionTag color="green">.
export type TagColor = keyof typeof tagColorClasses

// A small colored label, like the ones in a Notion database.
// Usage:  <NotionTag color="green">Active</NotionTag>
// With `highlighted`, the tag gets a thin outline (used to mark search matches).
// TWEAK: ring-foreground/25 is the outline color at 25% strength. Go lower (/15)
// for a fainter outline, or higher (/40) for a stronger one.
export function NotionTag({
  color,
  highlighted = false,
  children,
}: {
  color: TagColor
  highlighted?: boolean
  children: ReactNode
}) {
  return (
    // `rounded-sm` gives the slightly rounded corners; `whitespace-nowrap`
    // keeps a tag's text on one line.
    <span
      data-highlighted={highlighted || undefined}
      className={`inline-flex shrink-0 items-center gap-1 rounded-sm px-1.5 py-0.5 text-sm leading-tight whitespace-nowrap ${tagColorClasses[color]} ${highlighted ? 'ring-1 ring-foreground/25 ring-inset' : ''}`}
    >
      {children}
    </span>
  )
}
