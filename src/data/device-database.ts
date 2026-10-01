// A tiny local "database" for the experiments: four lists (tables) of made-up
// records, plus helper functions to look things up across them.
//
// HOW IT'S ORGANIZED
// Each fact is stored in exactly ONE place, and other tables point to it by id.
// This is how real databases avoid contradicting themselves:
//   - a device stores which group it is in            (deviceGroupId)
//   - a sales order stores its customer and its devices (customerId, deviceSerials)
// Everything else (a group's devices, a customer's sales orders...) is worked out
// by the helper functions at the bottom of this file.
//
// TWEAK: add, edit or remove records in the four lists to change the data.

// ---------- Types: what each record looks like ----------

export type DeviceType = 'Inspire' | 'Inspire 2' | 'Imagine'
export type DeviceStatus = 'Active' | 'Inactive' | 'In repair' | 'Retired'

export type Device = {
  serialNumber: string
  name: string
  deviceGroupId: string
  type: DeviceType
  status: DeviceStatus
  softwareAssignments: string[] // a device can have several
}

// How many seats (licenses) of one piece of software a sales order includes.
export type SoftwareSeats = { software: string; seats: number }

export type SalesOrder = {
  id: string // "SO" followed by 6 numbers, like SO118742
  customerId: string
  endUser: string // an email address
  deviceSerials: string[]
  softwareSeats: SoftwareSeats[]
}

export type Customer = {
  id: string
  name: string // the organization
  endUser: string // an email address
}

export type DeviceGroup = {
  id: string
  name: string
}

// ---------- The data ----------

export const customers: Customer[] = [
  { id: 'cust-lincoln', name: 'Lincoln High School District', endUser: 'jane.doe@lincolnhsd.example.org' },
  { id: 'cust-riverside', name: 'Riverside University', endUser: 'it.support@riverside.example.edu' },
  { id: 'cust-northgate', name: 'Northgate Academy', endUser: 'admin@northgate.example.org' },
  { id: 'cust-harbor', name: 'Harbor City Museum', endUser: 'education@harborcity.example.org' },
  { id: 'cust-summit', name: 'Summit STEM Charter School', endUser: 'tech@summitstem.example.org' },
]

export const deviceGroups: DeviceGroup[] = [
  { id: 'group-science', name: 'Science Wing – Classroom A' },
  { id: 'group-engineering', name: 'Engineering Lab 1' },
  { id: 'group-media', name: 'Media Center' },
  { id: 'group-physics', name: 'Physics Lab – Room 105' },
  { id: 'group-museum', name: 'Museum Discovery Hall' },
  { id: 'group-stem', name: 'STEM Makerspace' },
]

// A small helper so each device below fits on one readable line.
// The serial number is "ZS-2026-" plus the number you give.
function makeDevice(
  serialEnd: string,
  name: string,
  deviceGroupId: string,
  type: DeviceType,
  status: DeviceStatus,
  softwareAssignments: string[],
): Device {
  return { serialNumber: `ZS-2026-${serialEnd}`, name, deviceGroupId, type, status, softwareAssignments }
}

export const devices: Device[] = [
  // Lincoln High School District (sales orders SO118742 and SO120455)
  makeDevice('004821', 'zSpace Laptop 01', 'group-science', 'Inspire', 'Active', ['zSpace Studio 5.2', 'zSpace Apps Suite']),
  makeDevice('004822', 'zSpace Laptop 02', 'group-science', 'Inspire', 'Active', ['zSpace Studio 5.2']),
  makeDevice('004823', 'zSpace Laptop 03', 'group-engineering', 'Inspire 2', 'In repair', ['zSpace Experience 4.0']),
  makeDevice('004824', 'zSpace Laptop 04', 'group-science', 'Inspire 2', 'Active', ['zSpace Studio 5.2', 'Anatomy Explorer']),
  makeDevice('005201', 'zSpace Desktop 07', 'group-engineering', 'Inspire', 'Retired', []),
  makeDevice('005202', 'zSpace Desktop 08', 'group-engineering', 'Inspire 2', 'Active', ['Physics Lab Simulator']),
  // Riverside University (sales orders SO119310 and SO124100)
  makeDevice('005107', 'zSpace Desktop 05', 'group-media', 'Imagine', 'Inactive', ['zSpace Studio 5.1']),
  makeDevice('005108', 'zSpace Desktop 06', 'group-media', 'Imagine', 'Active', ['zSpace Studio 5.2']),
  makeDevice('005601', 'zSpace Desktop 21', 'group-media', 'Imagine', 'Active', ['zSpace Studio 5.2', 'CAD Studio']),
  makeDevice('005602', 'zSpace Desktop 22', 'group-media', 'Imagine', 'Active', ['zSpace Studio 5.2', 'CAD Studio']),
  makeDevice('005603', 'zSpace Desktop 23', 'group-engineering', 'Inspire 2', 'In repair', ['CAD Studio']),
  // Northgate Academy (sales order SO121870)
  makeDevice('005301', 'zSpace Laptop 09', 'group-physics', 'Inspire 2', 'Active', ['Physics Lab Simulator', 'zSpace Studio 5.2']),
  makeDevice('005302', 'zSpace Laptop 10', 'group-physics', 'Inspire 2', 'Active', ['Physics Lab Simulator']),
  makeDevice('005303', 'zSpace Laptop 11', 'group-physics', 'Inspire 2', 'Inactive', ['Physics Lab Simulator']),
  makeDevice('005304', 'zSpace Laptop 12', 'group-stem', 'Inspire', 'Active', ['zSpace Studio 5.2', 'CAD Studio']),
  makeDevice('005305', 'zSpace Laptop 13', 'group-stem', 'Inspire', 'Active', ['zSpace Studio 5.2']),
  makeDevice('005306', 'zSpace Laptop 14', 'group-stem', 'Inspire', 'Retired', []),
  // Harbor City Museum (sales order SO122415)
  makeDevice('005401', 'zSpace Desktop 15', 'group-museum', 'Imagine', 'Active', ['Museum Guide', 'Astronomy Atlas']),
  makeDevice('005402', 'zSpace Desktop 16', 'group-museum', 'Imagine', 'Active', ['Museum Guide', 'Astronomy Atlas']),
  makeDevice('005403', 'zSpace Desktop 17', 'group-museum', 'Imagine', 'Active', ['Museum Guide']),
  makeDevice('005404', 'zSpace Desktop 18', 'group-museum', 'Imagine', 'In repair', ['Museum Guide']),
  makeDevice('005405', 'zSpace Desktop 19', 'group-museum', 'Imagine', 'Active', ['Astronomy Atlas']),
  makeDevice('005406', 'zSpace Desktop 20', 'group-museum', 'Inspire 2', 'Active', ['Museum Guide', 'Anatomy Explorer']),
  // Summit STEM Charter School (sales order SO123008)
  makeDevice('005501', 'zSpace Laptop 24', 'group-stem', 'Inspire 2', 'Active', ['zSpace Studio 5.2', 'CAD Studio', 'Physics Lab Simulator']),
  makeDevice('005502', 'zSpace Laptop 25', 'group-stem', 'Inspire 2', 'Active', ['zSpace Studio 5.2', 'CAD Studio']),
  makeDevice('005503', 'zSpace Laptop 26', 'group-stem', 'Inspire 2', 'Inactive', ['zSpace Studio 5.2']),
  makeDevice('005504', 'zSpace Laptop 27', 'group-science', 'Inspire', 'Active', ['Anatomy Explorer', 'zSpace Experience 4.0']),
  makeDevice('005505', 'zSpace Laptop 28', 'group-science', 'Inspire', 'Active', ['Anatomy Explorer']),
]

// Each sales order lists the full serial numbers of its devices.
export const salesOrders: SalesOrder[] = [
  {
    id: 'SO118742',
    customerId: 'cust-lincoln',
    endUser: 'jane.doe@lincolnhsd.example.org',
    deviceSerials: ['ZS-2026-004821', 'ZS-2026-004822', 'ZS-2026-004823'],
    softwareSeats: [
      { software: 'zSpace Studio 5.2', seats: 10 },
      { software: 'zSpace Experience 4.0', seats: 5 },
    ],
  },
  {
    id: 'SO120455',
    customerId: 'cust-lincoln',
    endUser: 'sam.lee@lincolnhsd.example.org',
    deviceSerials: ['ZS-2026-004824', 'ZS-2026-005201', 'ZS-2026-005202'],
    softwareSeats: [
      { software: 'Anatomy Explorer', seats: 3 },
      { software: 'Physics Lab Simulator', seats: 3 },
    ],
  },
  {
    id: 'SO119310',
    customerId: 'cust-riverside',
    endUser: 'it.support@riverside.example.edu',
    deviceSerials: ['ZS-2026-005107', 'ZS-2026-005108'],
    softwareSeats: [
      { software: 'zSpace Studio 5.1', seats: 2 },
      { software: 'zSpace Studio 5.2', seats: 2 },
    ],
  },
  {
    id: 'SO124100',
    customerId: 'cust-riverside',
    endUser: 'lab.manager@riverside.example.edu',
    deviceSerials: ['ZS-2026-005601', 'ZS-2026-005602', 'ZS-2026-005603'],
    softwareSeats: [
      { software: 'CAD Studio', seats: 6 },
      { software: 'zSpace Studio 5.2', seats: 4 },
    ],
  },
  {
    id: 'SO121870',
    customerId: 'cust-northgate',
    endUser: 'admin@northgate.example.org',
    deviceSerials: [
      'ZS-2026-005301',
      'ZS-2026-005302',
      'ZS-2026-005303',
      'ZS-2026-005304',
      'ZS-2026-005305',
      'ZS-2026-005306',
    ],
    softwareSeats: [
      { software: 'Physics Lab Simulator', seats: 8 },
      { software: 'zSpace Studio 5.2', seats: 6 },
      { software: 'CAD Studio', seats: 2 },
    ],
  },
  {
    id: 'SO122415',
    customerId: 'cust-harbor',
    endUser: 'education@harborcity.example.org',
    deviceSerials: [
      'ZS-2026-005401',
      'ZS-2026-005402',
      'ZS-2026-005403',
      'ZS-2026-005404',
      'ZS-2026-005405',
      'ZS-2026-005406',
    ],
    softwareSeats: [
      { software: 'Museum Guide', seats: 10 },
      { software: 'Astronomy Atlas', seats: 5 },
    ],
  },
  {
    id: 'SO123008',
    customerId: 'cust-summit',
    endUser: 'tech@summitstem.example.org',
    deviceSerials: [
      'ZS-2026-005501',
      'ZS-2026-005502',
      'ZS-2026-005503',
      'ZS-2026-005504',
      'ZS-2026-005505',
    ],
    softwareSeats: [
      { software: 'zSpace Studio 5.2', seats: 5 },
      { software: 'CAD Studio', seats: 3 },
      { software: 'Anatomy Explorer', seats: 2 },
    ],
  },
]

// ---------- Helpers: look things up across the tables ----------
// Each one answers a plain question, like "which devices are in this group?".

// Finds one device by its serial number.
export function findDevice(serialNumber: string): Device | undefined {
  return devices.find((device) => device.serialNumber === serialNumber)
}

// Finds one customer by id.
export function findCustomer(customerId: string): Customer | undefined {
  return customers.find((customer) => customer.id === customerId)
}

// Finds one device group by id.
export function findDeviceGroup(groupId: string): DeviceGroup | undefined {
  return deviceGroups.find((group) => group.id === groupId)
}

// All devices that belong to a group.
export function getDevicesInGroup(groupId: string): Device[] {
  return devices.filter((device) => device.deviceGroupId === groupId)
}

// All sales orders placed by a customer.
export function getSalesOrdersForCustomer(customerId: string): SalesOrder[] {
  return salesOrders.filter((order) => order.customerId === customerId)
}

// All sales orders that include at least one device from the group.
export function getSalesOrdersForGroup(groupId: string): SalesOrder[] {
  const serialsInGroup = getDevicesInGroup(groupId).map((device) => device.serialNumber)
  return salesOrders.filter((order) =>
    order.deviceSerials.some((serial) => serialsInGroup.includes(serial)),
  )
}
