import type { Device, DeviceGroup } from './data/assignment-data'

// Works out WHERE everything sits on the canvas. Nothing here draws anything:
// it just returns a list of boxes (position + size). The canvas then draws them.
//
// Every group has its OWN position (you can drag groups around, and the Arrange menu
// sets them). An open group shows its devices in a grid to its right: 4 rows tall, and
// as many columns as it takes, filled column by column (devices 1-4 in the first
// column, 5-8 in the next, and so on). The grid is positioned relative to its group,
// so when a group moves, its grid moves with it.

// ---------- TWEAK: sizes and spacing (pixels on the canvas) ----------
export const groupNodeWidth = 320
export const groupNodeHeight = 76
export const deviceCardWidth = 280
export const gridRows = 4 // how many rows the device grid has
export const groupGap = 28 // vertical space between groups when they are arranged
const gridGap = 14 // space between device cards, both across and down
export const gridStartGap = 56 // horizontal space between the group node and the grid's backdrop (the connector line crosses it)
// The soft backdrop behind the open group's grid has this much padding. The top is
// bigger because the group's name is written there.
export const backdropPaddingSide = 16
export const backdropPaddingTop = 46
export const backdropPaddingBottom = 16

// A device card's height depends on how many software lines it has. These numbers
// match the spacing inside device-node.tsx. If you change the card's padding or row
// height there, change them here too.
const deviceCardBaseHeight = 103
export const deviceSoftwareRowHeight = 28
// ---------------------------------------------------------------------

export function getDeviceCardHeight(device: Device): number {
  // A device with no software still shows one row ("No software assigned").
  const rows = Math.max(1, device.software.length)
  return deviceCardBaseHeight + rows * deviceSoftwareRowHeight
}

// The size of a group's device grid. Device number i goes in row (i mod 4) and column
// (i divided by 4, rounded down). Every card in a row is as tall as the tallest card
// in that row, so the rows line up.
function getGridMetrics(group: DeviceGroup) {
  const rowCount = Math.min(gridRows, group.devices.length)
  const columnCount = Math.ceil(group.devices.length / gridRows)
  const rowHeights = Array.from({ length: rowCount }, () => 0)
  group.devices.forEach((device, index) => {
    const row = index % gridRows
    rowHeights[row] = Math.max(rowHeights[row], getDeviceCardHeight(device))
  })
  const gridHeight = rowHeights.reduce((total, height) => total + height, 0) + gridGap * (rowCount - 1)
  const gridWidth = columnCount * deviceCardWidth + (columnCount - 1) * gridGap
  return { rowHeights, gridHeight, gridWidth }
}

// How much room a group takes up on the canvas: just its node when closed, or its node
// plus the grid and backdrop when open. The Arrange menu uses this to leave enough space.
export function getGroupFootprint(group: DeviceGroup, isOpen: boolean): { width: number; height: number } {
  if (!isOpen) return { width: groupNodeWidth, height: groupNodeHeight }
  const { gridHeight, gridWidth } = getGridMetrics(group)
  return {
    width: groupNodeWidth + gridStartGap + backdropPaddingSide * 2 + gridWidth,
    // The grid is centered on the group node, so leave the bigger padding on both sides.
    height: Math.max(groupNodeHeight, gridHeight + backdropPaddingTop * 2),
  }
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

export type Position = { x: number; y: number }

// Lays out the groups at their positions, plus the device grids of the open ones.
export function computeLayout(
  groups: DeviceGroup[],
  openGroupIds: string[],
  positions: Record<string, Position>,
): LayoutItem[] {
  const items: LayoutItem[] = []

  for (const group of groups) {
    const position = positions[group.id] ?? { x: 0, y: 0 }
    items.push({
      id: group.id,
      kind: 'group',
      groupId: group.id,
      x: position.x,
      y: position.y,
      width: groupNodeWidth,
      height: groupNodeHeight,
    })

    if (openGroupIds.includes(group.id)) {
      const { rowHeights, gridHeight } = getGridMetrics(group)
      // The grid starts to the right of the group node, and is centered on the node vertically.
      const gridLeft = position.x + groupNodeWidth + gridStartGap + backdropPaddingSide
      const gridTop = position.y + groupNodeHeight / 2 - gridHeight / 2
      group.devices.forEach((device, index) => {
        const row = index % gridRows
        const column = Math.floor(index / gridRows)
        const rowTop = rowHeights.slice(0, row).reduce((total, height) => total + height + gridGap, 0)
        items.push({
          id: device.id,
          kind: 'device',
          groupId: group.id,
          x: gridLeft + column * (deviceCardWidth + gridGap),
          y: gridTop + rowTop,
          width: deviceCardWidth,
          height: rowHeights[row],
        })
      })
    }
  }

  return items
}
