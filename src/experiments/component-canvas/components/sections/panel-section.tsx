import { useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { iconSize, iconStroke, panelPaddingClass } from '../controls/panel-styles'

// ─────────────────────────────────────────────────────────────────────────────
// PANEL SECTION: a collapsible block of the right panel ("Layout", "Fill"…).
// The title row toggles it open/closed. An optional `action` (like a small
// button) sits on the right of the title. Sections are separated by a thin line.
// ─────────────────────────────────────────────────────────────────────────────

type PanelSectionProps = {
  title: string
  children: ReactNode
  action?: ReactNode
  defaultOpen?: boolean
}

export function PanelSection({ title, children, action, defaultOpen = true }: PanelSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <section className={cn('border-t border-border/70 py-2', panelPaddingClass)}>
      <div className="flex h-7 items-center justify-between">
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => setIsOpen(!isOpen)}
          className="-ml-1 flex h-6 items-center gap-1 rounded-md pr-1.5 pl-1 text-xs font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <ChevronRight
            size={iconSize - 2}
            strokeWidth={iconStroke}
            className={cn('text-muted-foreground transition-transform duration-150', isOpen && 'rotate-90')}
          />
          {title}
        </button>
        {action}
      </div>

      {isOpen && <div className="flex flex-col gap-1 pt-1 pb-1">{children}</div>}
    </section>
  )
}
