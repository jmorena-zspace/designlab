import { salesOrders, type DeviceGroup } from './data/assignment-data'
import { getGroupFootprint, groupGap, groupNodeHeight, type Position } from './layout'

// AUTO ARRANGE: works out a position for every group, in columns, based on a rule.
//   'default'     - one long column, in the original order
//   'sales-order' - one column per sales order (the one most of the group's devices
//                   belong to). Groups with the most devices that have no software
//                   come first in each column.
//   'unassigned'  - columns by how many devices have no software assigned:
//                   7 or more, 5-6, 3-4, and 0-2.
// Groups that are open take more room (their grid), so the arrangement leaves space
// for them.

export type ArrangeMode = 'default' | 'sales-order' | 'unassigned'

// A heading shown above a column on the canvas.
export type ArrangementLabel = { id: string; x: number; y: number; title: string; subtitle: string }

export type Arrangement = { positions: Record<string, Position>; labels: ArrangementLabel[] }

// ---------- TWEAK: spacing ----------
const columnGap = 80 // horizontal space between columns
const labelSpace = 84 // vertical space reserved above columns for their headings
// ------------------------------------

// How many of a group's devices have no software assigned at all.
export function countUnassignedDevices(group: DeviceGroup): number {
  return group.devices.filter((device) => device.software.length === 0).length
}

// The sales order most of a group's devices belong to.
function getMainSalesOrderId(group: DeviceGroup): string {
  const counts = new Map<string, number>()
  for (const device of group.devices) counts.set(device.salesOrderId, (counts.get(device.salesOrderId) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

// Most devices without software first; ties go by name.
function sortByUnassigned(groups: DeviceGroup[]): DeviceGroup[] {
  return [...groups].sort(
    (a, b) => countUnassignedDevices(b) - countUnassignedDevices(a) || a.name.localeCompare(b.name),
  )
}

type Column = { id: string; title: string; subtitle: string; groups: DeviceGroup[] }

// Places the columns side by side, and the groups of each column one under the other.
function placeColumns(columns: Column[], openGroupIds: string[], showLabels: boolean): Arrangement {
  const positions: Record<string, Position> = {}
  const labels: ArrangementLabel[] = []
  let columnLeft = 0

  for (const column of columns) {
    let groupTop = showLabels ? labelSpace : 0
    let columnWidth = 0
    for (const group of column.groups) {
      const footprint = getGroupFootprint(group, openGroupIds.includes(group.id))
      // The group node sits in the middle of its band (matters for open groups, whose band is taller).
      positions[group.id] = { x: columnLeft, y: groupTop + (footprint.height - groupNodeHeight) / 2 }
      groupTop += footprint.height + groupGap
      columnWidth = Math.max(columnWidth, footprint.width)
    }
    if (showLabels) {
      labels.push({ id: column.id, x: columnLeft, y: 0, title: column.title, subtitle: column.subtitle })
    }
    columnLeft += columnWidth + columnGap
  }

  return { positions, labels }
}

export function arrangeGroups(groups: DeviceGroup[], mode: ArrangeMode, openGroupIds: string[]): Arrangement {
  if (mode === 'default') {
    return placeColumns([{ id: 'all', title: '', subtitle: '', groups }], openGroupIds, false)
  }

  if (mode === 'sales-order') {
    const columns: Column[] = salesOrders
      .map((order) => {
        const orderGroups = groups.filter((group) => getMainSalesOrderId(group) === order.id)
        return {
          id: order.id,
          title: order.id,
          subtitle: `${order.customer} · ${orderGroups.length} ${orderGroups.length === 1 ? 'group' : 'groups'}`,
          groups: sortByUnassigned(orderGroups),
        }
      })
      .filter((column) => column.groups.length > 0)
    return placeColumns(columns, openGroupIds, true)
  }

  // 'unassigned': one column per bucket.
  // TWEAK: the buckets. About a quarter of the sample devices have no software, so a
  // typical group has around 5 such devices; these ranges split the groups fairly evenly.
  const buckets = [
    { id: 'seven-plus', title: '7+ without software', matches: (count: number) => count >= 7 },
    { id: 'five-six', title: '5–6 without software', matches: (count: number) => count >= 5 && count <= 6 },
    { id: 'three-four', title: '3–4 without software', matches: (count: number) => count >= 3 && count <= 4 },
    { id: 'zero-two', title: '0–2 without software', matches: (count: number) => count <= 2 },
  ]
  const columns: Column[] = buckets
    .map((bucket) => {
      const bucketGroups = groups.filter((group) => bucket.matches(countUnassignedDevices(group)))
      return {
        id: bucket.id,
        title: bucket.title,
        subtitle: `${bucketGroups.length} ${bucketGroups.length === 1 ? 'group' : 'groups'}`,
        groups: sortByUnassigned(bucketGroups),
      }
    })
    .filter((column) => column.groups.length > 0)
  return placeColumns(columns, openGroupIds, true)
}
