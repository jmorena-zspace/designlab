import type { DeviceGroup } from './data/assignment-data'
import {
  getContainerSize,
  getPreferredContainerPosition,
  groupNodeHeight,
  groupNodeWidth,
  type Position,
  type Size,
} from './layout'

// SMART PLACEMENT: when a group opens, where should its container go so that it doesn't
// overlap anything? The container may end up away from its group node, and that's fine:
// a line always connects them.
//
// The idea, in plain words: start from the ideal spot (right next to the group node).
// If something is in the way, try spots further and further away (further right, and
// higher or lower) and take the closest one that is free.

// A rectangle on the canvas.
export type Rect = { x: number; y: number; width: number; height: number }

// ---------- TWEAK: how the search for a free spot works ----------
const keepClear = 32 // the empty space to leave around things (pixels)
const stepAcross = 120 // how far each try moves to the right (pixels)
const stepDown = 80 // how far each try moves up or down (pixels)
const maxStepsAcross = 80 // how many tries to the right (80 steps = 9,600 pixels)
const maxStepsDown = 60 // how many tries up and down, each way
// -----------------------------------------------------------------

// Do two rectangles overlap (with `keepClear` of breathing room around the first)?
function overlaps(a: Rect, b: Rect): boolean {
  return (
    a.x - keepClear < b.x + b.width &&
    a.x + a.width + keepClear > b.x &&
    a.y - keepClear < b.y + b.height &&
    a.y + a.height + keepClear > b.y
  )
}

// Finds the free spot closest to `preferred` for something of the given size.
export function findFreeSpot(size: Size, preferred: Position, obstacles: Rect[]): Position {
  const isFree = (position: Position) =>
    !obstacles.some((obstacle) => overlaps({ ...position, ...size }, obstacle))

  // Good news first: the ideal spot is free.
  if (isFree(preferred)) return preferred

  // Otherwise list lots of other spots (to the right, and up / down), nearest first.
  const candidates: { position: Position; distance: number }[] = []
  for (let across = 0; across <= maxStepsAcross; across++) {
    for (let down = -maxStepsDown; down <= maxStepsDown; down++) {
      const dx = across * stepAcross
      const dy = down * stepDown
      candidates.push({ position: { x: preferred.x + dx, y: preferred.y + dy }, distance: Math.hypot(dx, dy) })
    }
  }
  candidates.sort((a, b) => a.distance - b.distance)

  const freeSpot = candidates.find((candidate) => isFree(candidate.position))
  return freeSpot ? freeSpot.position : preferred
}

// Works out where a group's container should go when it opens, avoiding:
//   - every group node,
//   - the containers of the other open groups,
//   - the "devices without assignments" container (if it is on screen).
export function placeContainer(
  group: DeviceGroup,
  allGroups: DeviceGroup[],
  nodePositions: Record<string, Position>,
  containerPositions: Record<string, Position>,
  openGroupIds: string[],
  arrangeBox: Rect | null,
): Position {
  const obstacles: Rect[] = []

  for (const other of allGroups) {
    const position = nodePositions[other.id]
    if (position) obstacles.push({ ...position, width: groupNodeWidth, height: groupNodeHeight })
  }
  for (const otherId of openGroupIds) {
    if (otherId === group.id) continue
    const otherGroup = allGroups.find((candidate) => candidate.id === otherId)
    const position = containerPositions[otherId]
    if (otherGroup && position) obstacles.push({ ...position, ...getContainerSize(otherGroup) })
  }
  if (arrangeBox) obstacles.push(arrangeBox)

  const nodePosition = nodePositions[group.id] ?? { x: 0, y: 0 }
  return findFreeSpot(getContainerSize(group), getPreferredContainerPosition(group, nodePosition), obstacles)
}
