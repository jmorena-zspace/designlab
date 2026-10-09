import { useState, type ReactNode } from 'react'
import { Minus, MousePointer2, Play, Plus, Redo2, Undo2 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { ToolbarProps } from '../types'
import { iconSize, iconStroke, smallButtonClass } from './controls/panel-styles'

// ─────────────────────────────────────────────────────────────────────────────
// TOOLBAR: the floating pill at the bottom of the canvas (like Figma UI3).
//   [ Design | Interact ] | [ undo  redo ] | [ −  100%  + ] | [ 3 changes  Reset ]
// The page positions it; this file only draws it. Every button has a tooltip
// with its keyboard shortcut.
// ─────────────────────────────────────────────────────────────────────────────

// TWEAK: toolbarButtonSizeClass — size of each icon button (size-7 = 28px, size-8 = 32px)
const toolbarButtonSizeClass = 'size-8'

// A thin vertical line between groups.
function Divider() {
  return <span className="mx-1 h-5 w-px bg-border" aria-hidden />
}

// Shortcut "key cap" shown inside tooltips.
function Shortcut({ children }: { children: ReactNode }) {
  return <kbd className="rounded-[4px] bg-background/15 px-1 font-sans text-[11px] text-background/80">{children}</kbd>
}

// An icon button with a tooltip ("Undo  ⌘Z").
function ToolbarButton({
  label,
  shortcut,
  onClick,
  disabled,
  isActive,
  children,
}: {
  label: string
  shortcut?: string
  onClick: () => void
  disabled?: boolean
  isActive?: boolean
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={label}
        aria-pressed={isActive}
        disabled={disabled}
        onClick={onClick}
        className={cn(
          toolbarButtonSizeClass,
          'inline-flex items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-35',
          isActive && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
        )}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8}>
        {label}
        {shortcut && <Shortcut>{shortcut}</Shortcut>}
      </TooltipContent>
    </Tooltip>
  )
}

export function Toolbar({
  mode,
  onModeChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomToFit,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  changeCount,
  onResetAll,
}: ToolbarProps) {
  const [isResetOpen, setIsResetOpen] = useState(false)
  const zoomPercent = Math.round(zoom * 100)
  const changeWord = changeCount === 1 ? 'change' : 'changes'

  return (
    <div className="flex items-center rounded-xl border border-border/80 bg-background/95 p-1 text-foreground shadow-[0_2px_12px_-4px_rgb(0_0_0/0.12)] backdrop-blur">
      {/* ── Mode: Design (select layers) or Interact (use the components). P toggles. ── */}
      <ToolbarButton label="Design" shortcut="P" isActive={mode === 'design'} onClick={() => onModeChange('design')}>
        <MousePointer2 size={iconSize + 2} strokeWidth={iconStroke} />
      </ToolbarButton>
      <ToolbarButton label="Interact" shortcut="P" isActive={mode === 'interact'} onClick={() => onModeChange('interact')}>
        <Play size={iconSize + 1} strokeWidth={iconStroke} />
      </ToolbarButton>

      <Divider />

      {/* ── History ── */}
      <ToolbarButton label="Undo" shortcut="⌘Z" disabled={!canUndo} onClick={onUndo}>
        <Undo2 size={iconSize + 1} strokeWidth={iconStroke} />
      </ToolbarButton>
      <ToolbarButton label="Redo" shortcut="⇧⌘Z" disabled={!canRedo} onClick={onRedo}>
        <Redo2 size={iconSize + 1} strokeWidth={iconStroke} />
      </ToolbarButton>

      <Divider />

      {/* ── Zoom: − 100% +. Clicking the percentage zooms to fit everything. ── */}
      <ToolbarButton label="Zoom out" onClick={onZoomOut}>
        <Minus size={iconSize} strokeWidth={iconStroke} />
      </ToolbarButton>
      <Tooltip>
        <TooltipTrigger
          onClick={onZoomToFit}
          aria-label={`Zoom ${zoomPercent}%. Zoom to fit`}
          className="h-8 min-w-12 rounded-lg px-1 text-xs tabular-nums text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          {zoomPercent}%
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          Zoom to fit <Shortcut>⇧1</Shortcut>
        </TooltipContent>
      </Tooltip>
      <ToolbarButton label="Zoom in" onClick={onZoomIn}>
        <Plus size={iconSize} strokeWidth={iconStroke} />
      </ToolbarButton>

      <Divider />

      {/* ── Changes count + Reset (asks first, because it throws all edits away) ── */}
      <span className="px-2 text-xs whitespace-nowrap text-muted-foreground tabular-nums">
        {changeCount === 0 ? 'No changes' : `${changeCount} ${changeWord}`}
      </span>
      <Popover open={isResetOpen} onOpenChange={setIsResetOpen}>
        <PopoverTrigger disabled={changeCount === 0} className={cn(smallButtonClass, 'h-8 rounded-lg aria-expanded:bg-muted')}>
          Reset
        </PopoverTrigger>
        <PopoverContent side="top" sideOffset={10} className="w-56 gap-3 p-3">
          <p className="text-[13px] font-medium">
            Reset all {changeCount} {changeWord}?
          </p>
          <p className="-mt-2 text-xs text-muted-foreground">Every edit goes back to the original. You can still undo.</p>
          <div className="flex justify-end gap-1">
            <button type="button" className={smallButtonClass} onClick={() => setIsResetOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className={cn(smallButtonClass, 'bg-destructive/10 text-destructive hover:bg-destructive/15')}
              onClick={() => {
                onResetAll()
                setIsResetOpen(false)
              }}
            >
              Reset all
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
