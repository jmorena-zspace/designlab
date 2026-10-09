import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { iconButtonClass, iconSize, iconStroke, smallButtonClass } from './panel-styles'

// ─────────────────────────────────────────────────────────────────────────────
// COPY BUTTON: copies some text to the clipboard and shows a ✓ for a moment.
// With a `label` it's a small text button; without one it's an icon-only button.
// ─────────────────────────────────────────────────────────────────────────────

// TWEAK: copiedFeedbackMs — how long (ms) the ✓ stays after copying (try 800 to 2500)
const copiedFeedbackMs = 1500

type CopyButtonProps = {
  getText: () => string // called on click, so the text is built only when needed
  label?: string
  ariaLabel?: string
  disabled?: boolean
  className?: string
}

export function CopyButton({ getText, label, ariaLabel, disabled, className }: CopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false)

  // After a copy, switch the ✓ back to the copy icon. The cleanup cancels the
  // timer if the button disappears first.
  useEffect(() => {
    if (!isCopied) return
    const timerId = window.setTimeout(() => setIsCopied(false), copiedFeedbackMs)
    return () => window.clearTimeout(timerId)
  }, [isCopied])

  async function handleClick() {
    await navigator.clipboard.writeText(getText())
    setIsCopied(true)
  }

  const Icon = isCopied ? Check : Copy
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      aria-label={ariaLabel ?? label}
      title={label ? undefined : (ariaLabel ?? 'Copy')}
      className={cn(label ? smallButtonClass : iconButtonClass, className)}
    >
      <Icon size={iconSize - 1} strokeWidth={iconStroke} className={cn(label && 'text-muted-foreground')} />
      {label && <span>{isCopied ? 'Copied' : label}</span>}
    </button>
  )
}
