import type { DragEvent, PointerEvent } from 'react'

// A gray container: the soft panel behind a group's grid of device cards, and also the
// "Devices without assignments" container that holds group nodes. A group's container
// also lists the sales orders involved, in two categories (see `salesOrders`).
//
// You can drag it (by its header or any empty part) to move what is in it. The page
// supplies the pointer handler and says what "moving it" means.
//
// For a group's container the numbers come from the page, measured from the cards'
// current positions, so it fades in and out together with the cards.

// TWEAK: how many sales orders are listed per category before the rest are shown as "+2".
const maxSalesOrdersShown = 4

// One line of the header: a label, then the sales orders as small chips.
function SalesOrderLine({ label, ids }: { label: string; ids: string[] }) {
  return (
    <div className="flex items-center gap-2 overflow-hidden px-5 pt-1.5 text-[11px] text-muted-foreground">
      <span className="shrink-0">{label}</span>
      {ids.length === 0 ? (
        <span>none</span>
      ) : (
        <>
          {ids.slice(0, maxSalesOrdersShown).map((id) => (
            <span key={id} className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] leading-none text-foreground/70">
              {id}
            </span>
          ))}
          {ids.length > maxSalesOrdersShown && <span className="shrink-0">+{ids.length - maxSalesOrdersShown}</span>}
        </>
      )}
    </div>
  )
}

export function GroupBackdrop({
  title,
  salesOrders,
  box,
  opacity,
  zIndex,
  fadeInOnMount = false,
  dropState = 'none',
  onPointerDown,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  title: string // "Science Wing – Room 101 · 19 devices"
  // Optional. The sales orders of this group, in two categories: the ones its DEVICES belong
  // to, and the ones the APPS (software) on those devices were bought with.
  salesOrders?: { devices: string[]; apps: string[] }
  box: { left: number; top: number; width: number; height: number } // the container, in world pixels
  opacity?: number
  zIndex: number
  fadeInOnMount?: boolean // true for a container that isn't driven by the cards' fade
  dropState?: 'none' | 'valid' // 'valid' draws a green outline: a device dropped here would be moved into this group
  onPointerDown: (event: PointerEvent<HTMLElement>) => void // starts dragging (see the page)
  // Optional: make the container a place devices can be dropped (see the page).
  onDragOver?: (event: DragEvent<HTMLElement>) => void
  onDragLeave?: (event: DragEvent<HTMLElement>) => void
  onDrop?: (event: DragEvent<HTMLElement>) => void
}) {
  return (
    // `data-canvas-node` tells the canvas not to pan when you press here.
    <div
      data-canvas-node
      onPointerDown={onPointerDown}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`absolute cursor-grab rounded-3xl transition-colors ${
        dropState === 'valid' ? 'bg-green-50 ring-2 ring-green-500' : 'bg-card/60 ring-1 ring-foreground/10'
      } ${fadeInOnMount ? 'animate-in fade-in duration-300' : ''}`}
      style={{ left: box.left, top: box.top, width: box.width, height: box.height, opacity, zIndex }}
    >
      <p className="truncate px-5 pt-3 text-sm font-medium text-muted-foreground">{title}</p>
      {salesOrders && (
        <>
          <SalesOrderLine label="Device sales orders" ids={salesOrders.devices} />
          <SalesOrderLine label="App sales orders" ids={salesOrders.apps} />
        </>
      )}
    </div>
  )
}
