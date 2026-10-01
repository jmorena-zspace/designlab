import { memo } from 'react'
import {
  ArrowRightIcon,
  ClipboardListIcon,
  FolderIcon,
  LaptopIcon,
  MoveRightIcon,
  Redo2Icon,
  RotateCcwIcon,
  Trash2Icon,
  Undo2Icon,
} from 'lucide-react'
import { countAssignments, type StagedOperation } from '../assignment-rules'
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
  onRemoveOperation,
}: {
  operations: StagedOperation[]
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onReset: () => void
  onReview: () => void
  onShowOperation: (operation: StagedOperation) => void // fly the camera to a change
  onRemoveOperation: (operationId: number) => void // cancel just this one change
}) {
  const totalAssignments = operations.reduce((total, operation) => total + countAssignments(operation), 0)
  const totalMoves = operations.filter((operation) => operation.kind === 'move').length
  // "12 software assignments and 2 device moves waiting to be applied."
  const summaryParts = [
    totalAssignments > 0 ? `${totalAssignments} software ${totalAssignments === 1 ? 'assignment' : 'assignments'}` : '',
    totalMoves > 0 ? `${totalMoves} device ${totalMoves === 1 ? 'move' : 'moves'}` : '',
  ].filter(Boolean)

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
            : `${summaryParts.join(' and ')} waiting to be applied.`}
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
            Drag software from the left onto a group or a device, or drag a device onto another group, to stage a change.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {[...operations].reverse().map((operation) => (
              // `group/item` lets the trash icon appear when the pointer is over this row.
              <li key={operation.id} className="group/item flex items-stretch gap-1 rounded-xl bg-muted/60 transition-colors hover:bg-muted">
                {/* Clicking a change flies the camera to where it was made. */}
                <button
                  type="button"
                  onClick={() => onShowOperation(operation)}
                  className="flex min-w-0 flex-1 flex-col gap-1 rounded-xl py-2 pl-3 text-left"
                >
                  {operation.kind === 'assign' ? (
                    <>
                      {/* A software drop: the titles, then where they went. */}
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">
                          {operation.software.length === 1
                            ? operation.software[0].software
                            : `${operation.software.length} software titles`}
                        </span>
                        {operation.software.length === 1 && (
                          <Badge variant="secondary" className="shrink-0 font-mono text-[10px]">
                            {operation.software[0].salesOrderId}
                          </Badge>
                        )}
                      </span>
                      {operation.software.length > 1 && (
                        <span className="truncate text-xs text-muted-foreground">
                          {operation.software.map((item) => item.software).join(', ')}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {operation.targetKind === 'group' ? (
                          <FolderIcon className="size-3.5 shrink-0" />
                        ) : (
                          <LaptopIcon className="size-3.5 shrink-0" />
                        )}
                        <span className="truncate">{operation.targetName}</span>
                        <span className="shrink-0">
                          · {operation.deviceIds.length} {operation.deviceIds.length === 1 ? 'device' : 'devices'}
                        </span>
                      </span>
                    </>
                  ) : (
                    <>
                      {/* A device move: the device, then "from group -> to group". */}
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        <MoveRightIcon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{operation.deviceName}</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="truncate">{operation.fromGroupName}</span>
                        <ArrowRightIcon className="size-3.5 shrink-0" />
                        <span className="truncate">{operation.toGroupName}</span>
                      </span>
                    </>
                  )}
                </button>

                {/* The trash can cancels just this change. It's faint until you point at the row,
                    but always there for keyboards and touch screens. */}
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label="Remove this change"
                  title="Remove this change"
                  className="mt-2 mr-2 shrink-0 text-muted-foreground opacity-40 transition-opacity group-hover/item:opacity-100 hover:text-red-600 focus-visible:opacity-100"
                  onClick={() => onRemoveOperation(operation.id)}
                >
                  <Trash2Icon />
                </Button>
              </li>
            ))}
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
