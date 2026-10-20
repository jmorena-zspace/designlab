import type { ReactNode } from 'react'
import { findAppByName } from '../data'
import type { ContentType } from '../data/types'
import { contentTypeStyles, getSubjectStyle, zcentral } from '../theme'

// Small building blocks used by the result rows: code chips, type tags, subject
// labels, application labels, and the name with the typed words highlighted.

// A quick launch code in a little dark chip, like "A638".
export function CodeChip({ code }: { code: string }) {
  return (
    <span className={`rounded-md px-1.5 py-0.5 font-mono text-xs font-medium tracking-wide ${zcentral.codeChip}`}>
      {code}
    </span>
  )
}

// The colored outlined tag that says what kind of content this is ("Lesson", "App"...).
export function TypeTag({ type }: { type: ContentType }) {
  const style = contentTypeStyles[type]
  const Icon = style.icon
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ${style.tagClasses}`}>
      <Icon className="size-3.5" />
      {style.label}
    </span>
  )
}

// A subject with its little colored icon, like "🧪 Physical Science".
export function SubjectLabel({ subject }: { subject: string }) {
  const style = getSubjectStyle(subject)
  const Icon = style.icon
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${zcentral.textMuted}`}>
      <span className={`grid size-4 place-items-center rounded-[4px] ${style.tileClasses}`}>
        <Icon className="size-3" />
      </span>
      {subject}
    </span>
  )
}

// TWEAK: the colors used for the made-up app icons (picked by the app's name).
const appIconColors = ['bg-[#3b82f6]', 'bg-[#8b5cf6]', 'bg-[#14b8a6]', 'bg-[#f59e0b]', 'bg-[#ec4899]', 'bg-[#22c55e]']

// A stand-in app icon: the app's initials on a color picked from its name, so the same
// app always gets the same color. (Real app icons could replace this later.)
export function AppIcon({ appName }: { appName: string }) {
  const initials = appName
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
  const colorIndex = [...appName].reduce((total, letter) => total + letter.charCodeAt(0), 0) % appIconColors.length
  return (
    <span className={`grid size-5 shrink-0 place-items-center rounded-md text-[9px] font-bold text-white ${appIconColors[colorIndex]}`}>
      {initials}
    </span>
  )
}

// "Which app does this open in": icon + name + the app's code, shown on the right of a row.
export function AppLabel({ appName }: { appName: string }) {
  const app = findAppByName(appName)
  return (
    <span className={`inline-flex min-w-0 items-center gap-2 text-sm ${zcentral.textStrong}`}>
      <AppIcon appName={appName} />
      <span className="truncate">{appName}</span>
      {app && <CodeChip code={app.code} />}
    </span>
  )
}

// A keyboard key, like the "ESC" in the search bar.
export function KeyHint({ children }: { children: ReactNode }) {
  return (
    <kbd className={`rounded-md px-1.5 py-0.5 font-sans text-[11px] font-medium ${zcentral.codeChip}`}>{children}</kbd>
  )
}

// Show `text` with every typed word in it made bright, and the rest a little dimmer,
// so you can see WHY a name matched.
export function HighlightedText({ text, words }: { text: string; words: string[] }) {
  if (words.length === 0) return <>{text}</>

  // Build one pattern that finds any of the words, e.g. /(chem|cave)/gi.
  // Special characters like "?" or "(" are escaped so they're treated as plain text.
  const escapedWords = words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp(`(${escapedWords.join('|')})`, 'gi')

  // split() with a (group) keeps the matched pieces, at every odd position.
  return (
    <>
      {text.split(pattern).map((piece, index) =>
        index % 2 === 1 ? (
          <mark key={index} className="rounded-sm bg-[#8b7cf6]/25 text-white">
            {piece}
          </mark>
        ) : (
          <span key={index}>{piece}</span>
        ),
      )}
    </>
  )
}
