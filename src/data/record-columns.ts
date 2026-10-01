import { FolderIcon, InboxIcon, LaptopIcon, UsersIcon } from 'lucide-react'
import type { NotionColumn } from '@/components/tables/notion-table'
import type { TagColor } from '@/components/tags/notion-tag'
import {
  findCustomer,
  findDevice,
  findDeviceGroup,
  getDevicesInGroup,
  getSalesOrdersForCustomer,
  getSalesOrdersForGroup,
  type Customer,
  type Device,
  type DeviceGroup,
  type SalesOrder,
} from '@/data/device-database'

// How each kind of record is DISPLAYED: its icon, its tag colors, and its list of
// columns. The Data tables and Consolidated search experiments both use this, so
// a record looks the same everywhere. Change something here and it updates
// in every experiment.

// ---------- TWEAK: icons ----------
// Browse icon names at lucide.dev/icons, then import them above.
export const recordIcons = {
  device: LaptopIcon,
  salesOrder: InboxIcon,
  customer: UsersIcon,
  deviceGroup: FolderIcon,
}

// ---------- TWEAK: tag colors ----------
// Which color each value gets. Colors: gray, brown, orange, yellow, green,
// blue, purple, pink, red.
const deviceTypeColors: Record<string, TagColor> = {
  Inspire: 'blue',
  'Inspire 2': 'purple',
  Imagine: 'pink',
}
const deviceStatusColors: Record<string, TagColor> = {
  Active: 'green',
  Inactive: 'gray',
  'In repair': 'orange',
  Retired: 'red',
}
// Software tags cycle through these colors, so different software looks different.
const softwareColorCycle: TagColor[] = ['yellow', 'brown', 'blue', 'green', 'orange']

// Picks a stable color for a piece of software from its name: the same name
// always gives the same color.
function colorForSoftware(softwareName: string): TagColor {
  let total = 0
  for (const letter of softwareName) total += letter.charCodeAt(0)
  return softwareColorCycle[total % softwareColorCycle.length]
}

// ---------- The four column lists ----------
// Each list describes one kind of record's columns (see notion-table.tsx for what
// label / type / getValue / tagColor mean). To add a column, add a line.
// To reorder columns, reorder the lines.
// The column with type 'title' is the record's name.

export const deviceColumns: NotionColumn<Device>[] = [
  { label: 'Serial number', type: 'title', getValue: (d) => d.serialNumber, width: 200 },
  { label: 'Name', type: 'text', getValue: (d) => d.name },
  {
    label: 'Device group',
    type: 'relation',
    getValue: (d) => findDeviceGroup(d.deviceGroupId)?.name ?? '',
    width: 260,
  },
  { label: 'Type', type: 'select', getValue: (d) => d.type, tagColor: (v) => deviceTypeColors[v], width: 130 },
  { label: 'Status', type: 'select', getValue: (d) => d.status, tagColor: (v) => deviceStatusColors[v], width: 130 },
  { label: 'Software assignment', type: 'multiSelect', getValue: (d) => d.softwareAssignments, tagColor: colorForSoftware, width: 300 },
]

export const salesOrderColumns: NotionColumn<SalesOrder>[] = [
  { label: 'ID', type: 'title', getValue: (o) => o.id, width: 160 },
  { label: 'Customer', type: 'relation', getValue: (o) => findCustomer(o.customerId)?.name ?? '', width: 260 },
  { label: 'End user', type: 'email', getValue: (o) => o.endUser, width: 260 },
  {
    label: 'Devices',
    type: 'relation',
    getValue: (o) => o.deviceSerials.map((serial) => findDevice(serial)?.name ?? serial),
    width: 320,
  },
  {
    label: 'Software seats',
    type: 'multiSelect',
    // Shows "Software name · 10 seats" for each item.
    getValue: (o) => o.softwareSeats.map((item) => `${item.software} · ${item.seats} seats`),
    tagColor: (v) => colorForSoftware(v.split(' · ')[0]),
    width: 340,
  },
]

export const customerColumns: NotionColumn<Customer>[] = [
  { label: 'Customer name', type: 'title', getValue: (c) => c.name, width: 280 },
  { label: 'End user', type: 'email', getValue: (c) => c.endUser, width: 280 },
  { label: 'Sales orders', type: 'relation', getValue: (c) => getSalesOrdersForCustomer(c.id).map((o) => o.id), width: 300 },
]

export const deviceGroupColumns: NotionColumn<DeviceGroup>[] = [
  { label: 'Name', type: 'title', getValue: (g) => g.name, width: 280 },
  { label: 'Devices', type: 'relation', getValue: (g) => getDevicesInGroup(g.id).map((d) => d.name), width: 340 },
  { label: 'Sales orders', type: 'relation', getValue: (g) => getSalesOrdersForGroup(g.id).map((o) => o.id), width: 260 },
]
