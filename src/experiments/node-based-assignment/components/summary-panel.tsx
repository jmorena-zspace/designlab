import { memo } from 'react'
import { ClipboardListIcon, FolderIcon, LaptopIcon, Redo2Icon, RotateCcwIcon, Undo2Icon } from 'lucide-react'
import type { StagedOperation } from '../assignment-rules'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// The summary panel on the right: every change you have staged (dragged on but not
// applied yet), with undo, redo, reset, and "Review and apply".
//
// It only shows the list and reports clicks; the page owns the actual list of changes
// and does the undoing, resetting and applying.
//
// `memo` at the bottom skips redrawing when nothing it shows has changed.

function SummaryPanelContent({
  operations,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onReset,
  onReview,
  onShowOperation,
}: {
  operations: StagedOperation[]
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onReset: () => void
  onReview: () => void
  onShowOperation: (operation: StagedOperation) => void // fly the camera to a change
}) {
  const totalAssignments = operations.reduce((total, operation) => total + operation.deviceIds.length, 0)

  return (
    // `min-h-0 flex-1` lets it fill the space under the search box (the page's right
    // column positions it). `data-canvas-control` tells the canvas not to start panning from here.
    <Card
      data-canvas-control
      className="min-h-0 flex-1 gap-0 rounded-2xl bg-card/95 py-0 shadow-xl backdrop-blur"
    >
      <CardHeader className="px-5 pt-5 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardListIcon className="size-4 text-muted-foreground" />
          Pending changes
          {operations.length > 0 && <Badge className="ml-auto">{operations.length}</Badge>}
        </CardTitle>
        <CardDescription>
          {operations.length === 0
            ? 'Nothing staged yet.'
            : `${totalAssignments} software ${totalAssignments === 1 ? 'assignment' : 'assignments'} waiting to be applied.`}
        </CardDescription>

        {/* Undo / redo on the left, reset on the right. */}
        <div className="flex items-center gap-1 pt-2">
          <Button size="icon-sm" variant="outline" aria-label="Undo" title="Undo (⌘Z)" disabled={!canUndo} onClick={onUndo}>
            <Undo2Icon />
          </Button>
          <Button size="icon-sm" variant="outline" aria-label="Redo" title="Redo (⇧⌘Z)" disabled={!canRedo} onClick={onRedo}>
            <Redo2Icon />
          </Button>
          <Button size="sm" variant="ghost" className="ml-auto" disabled={operations.length === 0} onClick={onReset}>
            <RotateCcwIcon />
            Reset
          </Button>
        </div>
      </CardHeader>

      {/* The list of staged changes, newest first. It scrolls if it gets long. */}
      <CardContent className="min-h-0 flex-1 overflow-y-auto border-t px-3 py-3">
        {operations.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            Drag a software title from the left onto a group or a device to stage a change.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {[...operations].reverse().map((operation) => {
              const TargetIcon = operation.targetKind === 'group' ? FolderIcon : LaptopIcon
              return (
                <li key={operation.id}>
                  {/* Clicking a change flies the camera to where it was made. */}
                  <button
                    type="button"
                    onClick={() => onShowOperation(operation)}
                    className="flex w-full flex-col gap-1 rounded-xl bg-muted/60 px-3 py-2 text-left transition-colors hover:bg-muted"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{operation.dragged.software}</span>
                      <Badge variant="secondary" className="shrink-0 font-mono text-[10px]">
                        {operation.dragged.salesOrderId}
                      </Badge>
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <TargetIcon className="size-3.5 shrink-0" />
                      <span className="truncate">{operation.targetName}</span>
                      <span className="shrink-0">
                        · {operation.deviceIds.length} {operation.deviceIds.length === 1 ? 'device' : 'devices'}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>

      <div className="border-t p-4">
        <Button className="w-full" disabled={operations.length === 0} onClick={onReview}>
          Review and apply{operations.length > 0 ? ` (${operations.length})` : ''}
        </Button>
      </div>
    </Card>
  )
}

export const SummaryPanel = memo(SummaryPanelContent)
