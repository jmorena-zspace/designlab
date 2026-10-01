import { ArrowRightIcon, Trash2Icon } from 'lucide-react'
import { countAssignments, type StagedOperation } from '../assignment-rules'
import { getSeatsLeft, type SeatUsage } from '../data/assignment-data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// The "Review and apply" window: a last look at everything that is about to be applied,
// including what it does to the seat counts, before you confirm.
//
// `seatsBefore` is the seat usage as it is now (without the staged changes) and
// `seatsAfter` includes them, so we can show "12 left -> 4 left" for each pool.
export function ReviewDialog({
  open,
  onOpenChange,
  operations,
  seatsBefore,
  seatsAfter,
  onApply,
  onRemoveOperation,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  operations: StagedOperation[]
  seatsBefore: SeatUsage
  seatsAfter: SeatUsage
  onApply: () => void
  onRemoveOperation: (operationId: number) => void // cancel just this one change
}) {
  const totalAssignments = operations.reduce((total, operation) => total + countAssignments(operation), 0)
  const totalMoves = operations.filter((operation) => operation.kind === 'move').length

  // The pools these changes touch, each listed once (a pool can appear in many changes).
  // (Device moves don't use seats, so only software changes count.)
  const touchedPools = [
    ...new Map(
      operations.flatMap((operation) =>
        operation.kind === 'assign'
          ? operation.software.map((item) => [`${item.salesOrderId}|${item.software}`, item] as const)
          : [],
      ),
    ).values(),
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Review and apply</DialogTitle>
          <DialogDescription>
            {operations.length} {operations.length === 1 ? 'change' : 'changes'}: {totalAssignments} software{' '}
            {totalAssignments === 1 ? 'assignment' : 'assignments'} and {totalMoves} device{' '}
            {totalMoves === 1 ? 'move' : 'moves'}. Applied software starts as Pending.
          </DialogDescription>
        </DialogHeader>

        {/* `max-h-72 overflow-y-auto`: the lists scroll if they are long. */}
        <div className="flex max-h-[55vh] flex-col gap-5 overflow-y-auto pr-1">
          <section>
            <h3 className="mb-2 text-sm font-medium">Changes</h3>
            <ul className="flex flex-col gap-1.5">
              {operations.map((operation) => (
                <li key={operation.id} className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm">
                  {operation.kind === 'assign' ? (
                    <>
                      {/* A software drop: the titles -> the target -> how many devices. */}
                      <span className="font-medium">
                        {operation.software.length === 1
                          ? operation.software[0].software
                          : `${operation.software.length} titles`}
                      </span>
                      {operation.software.length === 1 && (
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {operation.software[0].salesOrderId}
                        </Badge>
                      )}
                      <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{operation.targetName}</span>
                      <span className="shrink-0 text-muted-foreground">{operation.deviceIds.length}</span>
                    </>
                  ) : (
                    <>
                      {/* A device move: the device -> its new group. */}
                      <span className="font-medium">{operation.deviceName}</span>
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">
                        {operation.fromGroupName}
                      </span>
                      <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{operation.toGroupName}</span>
                    </>
                  )}
                  {/* The trash can cancels just this change. */}
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label="Remove this change"
                    title="Remove this change"
                    className="shrink-0 text-muted-foreground hover:text-red-600"
                    onClick={() => onRemoveOperation(operation.id)}
                  >
                    <Trash2Icon />
                  </Button>
                </li>
              ))}
            </ul>
          </section>

          {touchedPools.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-medium">Seats left after applying</h3>
            <ul className="flex flex-col gap-1.5">
              {touchedPools.map((pool) => (
                <li key={`${pool.salesOrderId}|${pool.software}`} className="flex items-center gap-2 text-sm">
                  <span>{pool.software}</span>
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {pool.salesOrderId}
                  </Badge>
                  <span className="ml-auto text-muted-foreground tabular-nums">
                    {getSeatsLeft(seatsBefore, pool.salesOrderId, pool.software)}
                    <ArrowRightIcon className="mx-1.5 inline size-3.5" />
                    <span className="font-medium text-foreground">
                      {getSeatsLeft(seatsAfter, pool.salesOrderId, pool.software)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep editing
          </Button>
          <Button onClick={onApply}>Apply {operations.length === 1 ? 'change' : `${operations.length} changes`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
