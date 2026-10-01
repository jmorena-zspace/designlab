// The line that joins a group node to its container. It always exists while the group is
// open, however far apart you drag the two.
//
// It leaves the node from the side that faces the container, and enters the container
// on its facing side, as a smooth curve. Both ends have a small dot.

// TWEAK: line look.
const lineWidth = 2
const lineColor = 'color-mix(in oklab, var(--foreground) 30%, transparent)'
const dotRadius = 4
const minimumCurve = 40 // the curve always bulges out at least this much (pixels)

type Box = { left: number; top: number; right: number; bottom: number }

// Keeps a number between a lowest and a highest value.
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))

export function GroupConnector({
  node,
  container,
  opacity,
  zIndex,
}: {
  node: Box // the group node's edges, in world pixels
  container: Box // the gray container's edges
  opacity: number
  zIndex: number
}) {
  const nodeCenterX = (node.left + node.right) / 2
  const nodeCenterY = (node.top + node.bottom) / 2
  // Pad the container's range a little so the line doesn't meet its very corner.
  const cornerMargin = 30

  // Work out which sides face each other, then where the line starts and ends, and
  // which direction the curve leaves each end ("pull" is a step along the line's direction).
  let start: { x: number; y: number }
  let end: { x: number; y: number }
  let startPull: { x: number; y: number }
  let endPull: { x: number; y: number }
  const gapX = Math.max(container.left - node.right, node.left - container.right, 0)
  const gapY = Math.max(container.top - node.bottom, node.top - container.bottom, 0)
  const curve = Math.max(minimumCurve, Math.max(gapX, gapY) * 0.5)

  if (container.left >= node.right) {
    // The container is to the right of the node.
    start = { x: node.right, y: nodeCenterY }
    end = { x: container.left, y: clamp(nodeCenterY, container.top + cornerMargin, container.bottom - cornerMargin) }
    startPull = { x: curve, y: 0 }
    endPull = { x: -curve, y: 0 }
  } else if (container.right <= node.left) {
    // To the left.
    start = { x: node.left, y: nodeCenterY }
    end = { x: container.right, y: clamp(nodeCenterY, container.top + cornerMargin, container.bottom - cornerMargin) }
    startPull = { x: -curve, y: 0 }
    endPull = { x: curve, y: 0 }
  } else if (container.top >= node.bottom) {
    // Below.
    start = { x: nodeCenterX, y: node.bottom }
    end = { x: clamp(nodeCenterX, container.left + cornerMargin, container.right - cornerMargin), y: container.top }
    startPull = { x: 0, y: curve }
    endPull = { x: 0, y: -curve }
  } else {
    // Above (or overlapping: then the line is short and just goes up).
    start = { x: nodeCenterX, y: node.top }
    end = { x: clamp(nodeCenterX, container.left + cornerMargin, container.right - cornerMargin), y: container.bottom }
    startPull = { x: 0, y: -curve }
    endPull = { x: 0, y: curve }
  }

  return (
    // A 1px SVG whose contents are allowed to spill out (`overflow-visible`) in every direction.
    <svg className="pointer-events-none absolute top-0 left-0 overflow-visible" width={1} height={1} style={{ opacity, zIndex }}>
      {/* "M" = move to the start. "C" = a smooth curve to the end, with two control points. */}
      <path
        d={`M ${start.x} ${start.y} C ${start.x + startPull.x} ${start.y + startPull.y}, ${end.x + endPull.x} ${end.y + endPull.y}, ${end.x} ${end.y}`}
        fill="none"
        stroke={lineColor}
        strokeWidth={lineWidth}
        strokeLinecap="round"
      />
      <circle cx={start.x} cy={start.y} r={dotRadius} fill={lineColor} />
      <circle cx={end.x} cy={end.y} r={dotRadius} fill={lineColor} />
    </svg>
  )
}
