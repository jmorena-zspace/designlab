import type { Device, DeviceGroup } from './data/assignment-data'

// Works out WHERE everything sits on the canvas. Nothing here draws anything:
// it just returns a list of boxes (position + size). The canvas then draws them.
//
// THE TWO KINDS OF THINGS THAT MOVE:
//   - GROUP NODES. Each group has a position of its own.
//   - GRID CONTAINERS. When a group is open, its devices appear in a grid inside a gray
//     container. The container has a position of its own too, separate from its group's,
//     so you can move the two independently. A line always joins them.
// The grid is 4 rows tall and as many columns wide as it takes, filled column by column
// (devices 1-4 in the first column, 5-8 in the next, and so on).

// ---------- TWEAK: sizes and spacing (pixels on the canvas) ----------
export const groupNodeWidth = 320
export const groupNodeHeight = 98 // tall enough for the name, the device count and the sales orders line
export const deviceCardWidth = 280
export const gridRows = 4 // how many rows a group's device grid has
const groupGap = 28 // vertical space between groups in the starting column
const gridGap = 14 // space between device cards, both across and down
export const gridStartGap = 56 // horizontal space between a group node and its container when it first opens
// The gray container has this much padding around the cards. The top is bigger because
// the title and the two lines of sales orders are written there.
export const containerPaddingSide = 16
export const containerPaddingTop = 94
export const containerPaddingBottom = 16

// A device card's height depends on how many software lines it has. These numbers
// match the spacing inside device-node.tsx. If you change the card's padding or row
// height there, change them here too.
const deviceCardBaseHeight = 103
export const deviceSoftwareRowHeight = 28
// ---------------------------------------------------------------------

export type Position = { x: number; y: number }
export type Size = { width: number; height: number }

export function getDeviceCardHeight(device: Device): number {
  // A device with no software still shows one row ("No software assigned").
  const rows = Math.max(1, device.software.length)
  return deviceCardBaseHeight + rows * deviceSoftwareRowHeight
}

// A device with no software assigned at all.
export function isUnassigned(device: Device): boolean {
  return device.software.length === 0
}

// How many of a group's devices have no software.
export function countUnassignedDevices(group: DeviceGroup): number {
  return group.devices.filter(isUnassigned).length
}

// The size of a group's grid of cards. Device number i goes in row (i mod 4) and
// column (i divided by 4, rounded down). Every card in a row is as tall as the
// tallest card in that row, so the rows line up.
function getGridMetrics(group: DeviceGroup) {
  const devices = group.devices
  if (devices.length === 0) return { rowHeights: [] as number[], gridHeight: 0, gridWidth: 0 }
  const rowCount = Math.min(gridRows, devices.length)
  const columnCount = Math.ceil(devices.length / gridRows)
  const rowHeights = Array.from({ length: rowCount }, () => 0)
  devices.forEach((device, index) => {
    const row = index % gridRows
    rowHeights[row] = Math.max(rowHeights[row], getDeviceCardHeight(device))
  })
  const gridHeight = rowHeights.reduce((total, height) => total + height, 0) + gridGap * (rowCount - 1)
  const gridWidth = columnCount * deviceCardWidth + (columnCount - 1) * gridGap
  return { rowHeights, gridHeight, gridWidth }
}

// The size of a group's gray container (its grid plus the padding around it).
export function getContainerSize(group: DeviceGroup): Size {
  const { gridHeight, gridWidth } = getGridMetrics(group)
  return {
    width: gridWidth + containerPaddingSide * 2,
    height: gridHeight + containerPaddingTop + containerPaddingBottom,
  }
}

// Where a group's container would sit if nothing were in the way: to the right of the
// group node, vertically centered on it.
export function getPreferredContainerPosition(group: DeviceGroup, nodePosition: Position): Position {
  const size = getContainerSize(group)
  return {
    x: nodePosition.x + groupNodeWidth + gridStartGap,
    y: nodePosition.y + groupNodeHeight / 2 - size.height / 2,
  }
}

// Where the groups start: one long column, in order.
export function getStartingPositions(groups: DeviceGroup[]): Record<string, Position> {
  const positions: Record<string, Position> = {}
  groups.forEach((group, index) => {
    positions[group.id] = { x: 0, y: index * (groupNodeHeight + groupGap) }
  })
  return positions
}

// One box on the canvas.
export type LayoutItem = {
  id: string
  kind: 'group' | 'device'
  groupId: string // for a group, its own id; for a device, the group it belongs to
  x: number
  y: number
  width: number
  height: number
}

// Lays out the group nodes at their positions, and the cards of the open groups inside
// their containers (at the containers' positions).
export function computeLayout(
  groups: DeviceGroup[],
  openGroupIds: string[],
  nodePositions: Record<string, Position>,
  containerPositions: Record<string, Position>,
): LayoutItem[] {
  const items: LayoutItem[] = []

  for (const group of groups) {
    const nodePosition = nodePositions[group.id] ?? { x: 0, y: 0 }
    items.push({
      id: group.id,
      kind: 'group',
      groupId: group.id,
      x: nodePosition.x,
      y: nodePosition.y,
      width: groupNodeWidth,
      height: groupNodeHeight,
    })

    if (openGroupIds.includes(group.id)) {
      const containerPosition = containerPositions[group.id] ?? getPreferredContainerPosition(group, nodePosition)
      const { rowHeights } = getGridMetrics(group)
      group.devices.forEach((device, index) => {
        const row = index % gridRows
        const column = Math.floor(index / gridRows)
        const rowTop = rowHeights.slice(0, row).reduce((total, height) => total + height + gridGap, 0)
        items.push({
          id: device.id,
          kind: 'device',
          groupId: group.id,
          x: containerPosition.x + containerPaddingSide + column * (deviceCardWidth + gridGap),
          y: containerPosition.y + containerPaddingTop + rowTop,
          width: deviceCardWidth,
          height: rowHeights[row],
        })
      })
    }
  }

  return items
}
