import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

// A round "i" button that expands a panel explaining how an experiment was built.
// Every experiment page should include one. The button's look will be redesigned
// later, and since every experiment uses this file, one change updates them all.
//
// Usage:  <InfoExplainer title="How it's built"> ...your explanation... </InfoExplainer>
export function InfoExplainer({ title, children }: { title: string; children: ReactNode }) {
  // `isOpen` remembers whether the panel is expanded. Clicking the button flips it.
  const [isOpen, setIsOpen] = useState(false)

  return (
    // Pinned to the top-right corner of the screen.
    // TWEAK: change top-6 / right-6 to move it, or swap for bottom-6 to put it at the bottom.
    // z-[2000] keeps it above everything on the page, even experiments with floating panels.
    <div className="fixed top-6 right-6 z-[2000] flex flex-col items-end gap-3">
      <Button
        variant="outline"
        size="icon"
        aria-label="How this experiment was built"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        i
      </Button>

      {/* Only draws the panel while it's open. */}
      {isOpen && (
        // TWEAK: max-w-sm sets the panel width; max-h-[70vh] caps its height before it scrolls.
        <div className="max-h-[70vh] w-[calc(100vw-3rem)] max-w-sm overflow-y-auto rounded-xl bg-card p-5 text-sm text-card-foreground shadow-lg ring-1 ring-foreground/10">
          <h2 className="mb-3 text-base font-semibold">{title}</h2>
          <div className="flex flex-col gap-3 text-muted-foreground">{children}</div>
        </div>
      )}
    </div>
  )
}
