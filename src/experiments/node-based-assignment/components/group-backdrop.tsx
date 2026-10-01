import type { PointerEvent } from 'react'

// The soft container behind an open group's grid of device cards, with a short
// connecting line from the group node to it.
//
// You can drag the container (by its header or any empty part) to move the whole
// group, just like dragging the group node. The page supplies the pointer handlers.
//
// All the numbers come from the page, measured from the cards' current positions, so
// the container fades in and out together with the cards.

// TWEAK: the connecting line.
const lineThickness = 2
const lineColor = 'color-mix(in oklab, var(--foreground) 30%, transparent)'
const lineDotSize = 8

export function GroupBackdrop({
  title,
  box,
  groupNodeRight,
  lineY,
  opacity,
  zIndex,
  onPointerDown,
}: {
  title: string // "Science Wing – Room 101 · 19 devices"
  box: { left: number; top: number; width: number; height: number } // the container, in world pixels
  groupNodeRight: number // where the group node's right edge is (the line starts here)
  lineY: number // the line's vertical position (the middle of the group node)
  opacity: number
  zIndex: number
  onPointerDown: (event: PointerEvent<HTMLElement>) => void // starts dragging the group (see the page)
}) {
  return (
    <>
      {/* The connecting line: from the group node's right edge to the container's left edge,
          with a small dot at each end. */}
      <div
        className="pointer-events-none absolute"
        style={{
          left: groupNodeRight,
          top: lineY - lineThickness / 2,
          width: box.left - groupNodeRight,
          height: lineThickness,
          background: lineColor,
          opacity,
          zIndex,
        }}
      >
        <span
          className="absolute rounded-full"
          style={{ left: -lineDotSize / 2, top: (lineThickness - lineDotSize) / 2, width: lineDotSize, height: lineDotSize, background: lineColor }}
        />
        <span
          className="absolute rounded-full"
          style={{ right: -lineDotSize / 2, top: (lineThickness - lineDotSize) / 2, width: lineDotSize, height: lineDotSize, background: lineColor }}
        />
      </div>

      {/* The container itself. `data-canvas-node` tells the canvas not to pan when you press here. */}
      <div
        data-canvas-node
        onPointerDown={onPointerDown}
        className="absolute cursor-grab rounded-3xl bg-card/60 ring-1 ring-foreground/10"
        style={{ left: box.left, top: box.top, width: box.width, height: box.height, opacity, zIndex }}
      >
        <p className="truncate px-5 pt-3 text-sm font-medium text-muted-foreground">{title}</p>
      </div>
    </>
  )
}
