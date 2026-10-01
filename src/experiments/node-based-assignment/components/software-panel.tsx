import { memo, useState } from 'react'
import { GripVerticalIcon, PackageIcon } from 'lucide-react'
import { getSeatsLeft, salesOrders, type SalesOrder, type SeatUsage } from '../data/assignment-data'
import type { DraggedSoftware } from '../assignment-rules'
import { SearchBox } from './search-box'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

// The panel on the left: the software seats still available, organized as
// sales order -> software. The same software can appear under several sales orders;
// each has its own seats, independent of the others.
//
// It has its OWN search box (separate from the canvas search). Typing there hides
// every entry that doesn't match, by software name or sales order.
//
// Each software row can be:
//   - HOVERED: the page highlights the nodes that already have that software;
//   - DRAGGED: drop it on a group or a device to stage an assignment.
//
// Seats used come from `seatUsage`, a lookup the page rebuilds whenever assignments
// change (including staged ones), so this panel updates by itself.
//
// `memo` at the bottom tells React to skip redrawing this panel when nothing it
// shows has changed. With hundreds of nodes animating, that keeps it smooth.

// TWEAK: when this share of a pool is used (0.8 = 80%), its bar turns red.
const almostFullThreshold = 0.8
// TWEAK: how many sales orders start expanded (the rest are collapsed, since there are many).
const salesOrdersOpenAtStart = 2

// What the search leaves visible: for each sales order, which of its software to show.
// The search matches a software's name, or its sales order's id or customer name.
// If the sales order matches, all of its software is shown; otherwise just the
// software whose name matches. Sales orders with nothing to show are dropped.
function filterSalesOrders(query: string): { order: SalesOrder; pools: SalesOrder['seatPools'] }[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return salesOrders.map((order) => ({ order, pools: order.seatPools }))

  return salesOrders
    .map((order) => {
      const orderText = `${order.id} ${order.customer}`.toLowerCase()
      const orderMatches = words.every((word) => orderText.includes(word))
      const pools = order.seatPools.filter((pool) => {
        // A word may match the software name or the sales order text.
        const poolText = `${pool.software} ${orderText}`.toLowerCase()
        return orderMatches || words.every((word) => poolText.includes(word))
      })
      return { order, pools }
    })
    .filter((entry) => entry.pools.length > 0)
}

function SoftwarePanelContent({
  seatUsage,
  onHoverSoftware,
  onDragStartSoftware,
  onDragEndSoftware,
}: {
  seatUsage: SeatUsage // how many seats of each pool are in use right now
  onHoverSoftware: (softwareName: string | null) => void
  onDragStartSoftware: (dragged: DraggedSoftware) => void
  onDragEndSoftware: () => void
}) {
  const [query, setQuery] = useState('')
  // Which sales orders are open in the list (a list of sales order ids).
  const [openOrderIds, setOpenOrderIds] = useState<string[]>(
    salesOrders.slice(0, salesOrdersOpenAtStart).map((order) => order.id),
  )

  const visibleEntries = filterSalesOrders(query)
  const matchCount = visibleEntries.reduce((total, entry) => total + entry.pools.length, 0)

  // Typing opens every sales order that still has results, so you can see them.
  // Clearing the search goes back to the starting open list.
  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery)
    setOpenOrderIds(
      newQuery.trim()
        ? filterSalesOrders(newQuery).map((entry) => entry.order.id)
        : salesOrders.slice(0, salesOrdersOpenAtStart).map((order) => order.id),
    )
  }

  return (
    // This returns two things, one under the other: the search box and the card. The
    // page's left column lines them up.
    <>
      <SearchBox
        value={query}
        onChange={handleQueryChange}
        placeholder="Search software or sales orders…"
        countLabel={`${matchCount} ${matchCount === 1 ? 'title' : 'titles'}`}
      />

      {/* `min-h-0 flex-1` lets the card fill the space under the search box.
          `data-canvas-control` tells the canvas not to start panning from here. */}
      <Card
        data-canvas-control
        className="min-h-0 flex-1 gap-0 rounded-2xl bg-card/95 py-0 shadow-xl backdrop-blur"
      >
        <CardHeader className="px-5 pt-5 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <PackageIcon className="size-4 text-muted-foreground" />
            Available software
          </CardTitle>
          <CardDescription>Seats left, by sales order. Drag one onto a group or device.</CardDescription>
        </CardHeader>

        {/* `overflow-y-auto` makes the list scroll if there are many sales orders. */}
        <CardContent className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
          {visibleEntries.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No software or sales orders match.</p>
          )}
          <Accordion value={openOrderIds} onValueChange={setOpenOrderIds}>
            {visibleEntries.map(({ order, pools }) => (
              <AccordionItem key={order.id} value={order.id}>
                <AccordionTrigger>
                  <span className="flex flex-col items-start gap-0.5">
                    <Badge variant="secondary" className="font-mono">
                      {order.id}
                    </Badge>
                    <span className="text-xs font-normal text-muted-foreground">{order.customer}</span>
                  </span>
                </AccordionTrigger>

                <AccordionContent>
                  <div className="flex flex-col gap-1 pt-1">
                    {pools.map((pool) => {
                      const left = getSeatsLeft(seatUsage, order.id, pool.software)
                      const share = (pool.seats - left) / pool.seats
                      return (
                        // The draggable row. HTML's built-in drag and drop does the work:
                        // `draggable` makes it pick-up-able, and the handlers tell the page
                        // what is being dragged, so it can react.
                        <div
                          key={pool.software}
                          draggable
                          onDragStart={(event) => {
                            // Browsers need some data to be set before they allow a drag.
                            event.dataTransfer.setData('text/plain', pool.software)
                            event.dataTransfer.effectAllowed = 'copy'
                            onDragStartSoftware({ salesOrderId: order.id, software: pool.software })
                          }}
                          onDragEnd={onDragEndSoftware}
                          onMouseEnter={() => onHoverSoftware(pool.software)}
                          onMouseLeave={() => onHoverSoftware(null)}
                          className="group/row -mx-2 flex cursor-grab flex-col gap-1.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted active:cursor-grabbing"
                        >
                          <div className="flex items-baseline justify-between gap-2 text-sm">
                            <span className="flex min-w-0 items-center gap-1">
                              {/* A grip icon that appears on hover, hinting "you can drag this". */}
                              <GripVerticalIcon className="-ml-1 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/row:opacity-100" />
                              <span className="truncate">{pool.software}</span>
                            </span>
                            <span className="shrink-0 text-muted-foreground tabular-nums">
                              <span className="font-medium text-foreground">{left}</span> of {pool.seats} left
                            </span>
                          </div>
                          {/* The bar fills as seats get used. It is blue, and turns red when almost full. */}
                          <Progress
                            value={share * 100}
                            className={
                              share >= almostFullThreshold
                                ? '[&_[data-slot=progress-indicator]]:bg-red-500'
                                : '[&_[data-slot=progress-indicator]]:bg-blue-500'
                            }
                          />
                        </div>
                      )
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </>
  )
}

export const SoftwarePanel = memo(SoftwarePanelContent)
