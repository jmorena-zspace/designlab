import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import { fieldClass } from './panel-styles'

// ─────────────────────────────────────────────────────────────────────────────
// TEXT FIELD: a small input that only saves when you're done typing.
//
// While you type, the text lives in a local "draft". It is saved (onCommit) when
// you press Enter or click away. Esc throws the draft away. Saving once instead of
// on every keystroke keeps the undo history clean: one edit = one undo step.
// ─────────────────────────────────────────────────────────────────────────────

type TextFieldProps = {
  value: string
  onCommit: (value: string) => void
  ariaLabel: string
  placeholder?: string
  type?: 'text' | 'number'
  min?: number
  max?: number
  mono?: boolean // monospace text, nice for CSS values
  className?: string
}

export function TextField({ value, onCommit, ariaLabel, placeholder, type = 'text', min, max, mono, className }: TextFieldProps) {
  const [draft, setDraft] = useState(value)

  // If the saved value changes from outside (undo, reset, another layer selected),
  // show the new value. This is React's "adjust state when a prop changes" pattern:
  // we remember the last value we saw and compare during render.
  const [lastSeenValue, setLastSeenValue] = useState(value)
  if (value !== lastSeenValue) {
    setLastSeenValue(value)
    setDraft(value)
  }

  function commit() {
    if (draft === value) return
    onCommit(draft)
    // Remember it's saved, so the unmount save below doesn't save it a second time.
    latestRef.current = { ...latestRef.current, value: draft }
  }

  // SAVE ON UNMOUNT. Clicking a layer on the canvas changes the selection, and the
  // right panel swaps in new sections, so this field disappears. The stage blocks
  // that click (so the layer doesn't react to it), which also means the browser never
  // fires "blur" here, and the typed words would be lost. So when the field goes away,
  // we save any unsaved draft ourselves.
  // The cleanup function only sees values from the first render, so we keep the
  // LATEST draft, value and onCommit in a ref (a box React doesn't re-render for).
  const latestRef = useRef({ draft, value, onCommit })
  useEffect(() => {
    latestRef.current = { draft, value, onCommit }
  })
  useEffect(() => {
    return () => {
      const latest = latestRef.current
      if (latest.draft !== latest.value) latest.onCommit(latest.draft)
    }
  }, [])

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') event.currentTarget.blur() // blur → commit
    if (event.key === 'Escape') {
      setDraft(value)
      // Wait for React to show the old value, then leave the field without saving.
      requestAnimationFrame(() => (event.target as HTMLInputElement).blur())
    }
  }

  return (
    <input
      type={type}
      min={min}
      max={max}
      value={draft}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      className={cn(fieldClass, 'placeholder:text-muted-foreground/70 focus:bg-background focus:ring-1 focus:ring-ring/50', mono && 'font-mono text-[11px]', className)}
    />
  )
}
