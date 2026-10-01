// The "database" for the Node based assignment experiment. It is separate from the
// one the search experiments use.
//
// HOW IT FITS TOGETHER
//   - A SALES ORDER owns pools of software SEATS (licenses). For example,
//     SO118742 includes 8 seats of Studio.
//   - A DEVICE belongs to a sales order and has software assigned to it. Each
//     assigned software uses up one seat from ONE sales order's pool.
//   - A DEVICE GROUP is a named collection of devices.
//
// The same software can appear in several sales orders, each with its own seats.
// They are independent pools. Each assignment remembers WHICH sales order's pool its
// seat came from, so a device can even have software from a different sales order
// than its own (you can do that by dragging software onto it).
//
// THIS DATA IS GENERATED, not typed out: there are 50 groups with 16 to 22 devices
// each (about 900 devices), so we use a loop and a "seeded" random number generator.
// Seeded means the randomness is always the same: reload the page and you get the
// same groups, devices and seats every time.
//
// The software titles come from zspace.com/apps.
//
// TWEAK: the numbers in the "Settings" block below change how big and how chaotic the
// data is. Try numberOfGroups = 5 for a calm version, or 80 for an even bigger one.

// ---------- Types ----------

// 'Staged' = dragged on by you but not applied yet. After "Review and apply" it becomes 'Pending'.
export type SoftwareStatus = 'Installed' | 'Pending' | 'Failed' | 'Staged'

export type SeatPool = { software: string; seats: number }

export type SalesOrder = {
  id: string
  customer: string
  seatPools: SeatPool[]
}

export type AssignedSoftware = {
  name: string
  status: SoftwareStatus
  salesOrderId: string // the sales order whose seat this uses
}

export type Device = {
  id: string
  name: string
  serialNumber: string
  salesOrderId: string
  software: AssignedSoftware[]
}

export type DeviceGroup = {
  id: string
  name: string
  devices: Device[]
}

// ---------- Settings ----------
const numberOfGroups = 50
const minDevicesPerGroup = 16 // every group has at least this many devices
const maxDevicesPerGroup = 22
const chanceOfOtherSalesOrder = 0.15 // share of a group's devices that belong to a different sales order
const randomSeed = 2026 // change this number to get a completely different (but repeatable) data set

// ---------- The raw material ----------

// Software titles from zspace.com/apps.
const softwareTitles = [
  'Studio',
  'BodyViz',
  'Applied Mechanical',
  'Visible Body+',
  'ParaView',
  "Franklin's Lab A3",
  "Newton's Park A3",
  "Euclid's Shapes",
  'Math Island A3',
  'zCentral',
  'zView',
  'Experiences',
  'Tinkercad',
  'Tilt Brush',
  'ShapeLab',
  'Visualizer',
  'Automotive Technician',
  'HVAC Fundamentals',
  'Electrical Fundamentals',
  'Industrial Robotics Training',
  'Dental',
  'Wave NG Welder',
  'Precision Measurement',
  'Unity Programming',
  'Virtual ECG',
  'Renewable Energy Fundamentals',
]

// One sales order per customer.
const customers = [
  'Lincoln High School District',
  'Riverside University',
  'Harbor City Museum',
  'Northgate Academy',
  'Summit STEM Charter School',
  'Oakwood Community College',
  'Maple Valley Schools',
  'Pioneer Technical Institute',
  'Cedar Ridge Academy',
  'Bayview Health Sciences College',
  'Granite State University',
  'Willow Creek Unified',
]

// Group names are a theme plus a room number, like "Physics Lab – Room 104".
const groupThemes = [
  'Science Wing',
  'Engineering Lab',
  'Medical Lab',
  'Media Center',
  'Maker Space',
  'Robotics Studio',
  'CTE Annex',
  'Physics Lab',
  'Anatomy Lab',
  'Math Lab',
]

// ---------- A seeded random number generator ----------
// Call the function it returns and you get a number from 0 up to (not including) 1.
// The same seed always gives the same series of numbers. (This is a well-known tiny
// generator called "mulberry32". You don't need to understand the maths.)
function makeRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state)
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}
const random = makeRandom(randomSeed)

// Small helpers built on it.
const randomInteger = (min: number, max: number) => min + Math.floor(random() * (max - min + 1))
function pickRandom<Item>(items: Item[]): Item {
  return items[Math.floor(random() * items.length)]
}
function pickSeveral<Item>(items: Item[], count: number): Item[] {
  const remaining = [...items]
  const picked: Item[] = []
  while (picked.length < count && remaining.length > 0) {
    picked.push(remaining.splice(Math.floor(random() * remaining.length), 1)[0])
  }
  return picked
}
// Most software is installed fine, some is still pending, a little has failed.
function randomStatus(): SoftwareStatus {
  const roll = random()
  if (roll < 0.7) return 'Installed'
  if (roll < 0.9) return 'Pending'
  return 'Failed'
}

// ---------- Step 1: sales orders, each with a list of software it includes ----------
// The seat COUNTS are filled in at the end (step 4), once we know how many seats
// the devices actually use.
const salesOrderSoftware = customers.map((customer, index) => ({
  id: `SO${118000 + index * 1337}`,
  customer,
  titles: pickSeveral(softwareTitles, randomInteger(6, 9)),
}))

// ---------- Step 2 and 3: groups and devices ----------
let nextDeviceNumber = 1
const generatedGroups: DeviceGroup[] = Array.from({ length: numberOfGroups }, (_, groupIndex) => {
  // Each group mainly belongs to one sales order; the groups share them out evenly.
  const mainOrder = salesOrderSoftware[groupIndex % salesOrderSoftware.length]
  const theme = groupThemes[groupIndex % groupThemes.length]
  const roomNumber = 101 + Math.floor(groupIndex / groupThemes.length) * 3 + (groupIndex % 3)

  const deviceCount = randomInteger(minDevicesPerGroup, maxDevicesPerGroup)
  const devices: Device[] = Array.from({ length: deviceCount }, () => {
    // Some devices in a group belong to a different sales order.
    const order = random() < chanceOfOtherSalesOrder ? pickRandom(salesOrderSoftware) : mainOrder
    const number = nextDeviceNumber++
    // Each device gets 0 to 3 software titles from its sales order's list.
    const titles = pickSeveral(order.titles, randomInteger(0, 3))
    return {
      id: `device-${String(number).padStart(4, '0')}`,
      name: `zSpace ${number % 3 === 0 ? 'Desktop' : 'Laptop'} ${String(number).padStart(3, '0')}`,
      serialNumber: `ZS-2026-${String(10000 + number)}`,
      salesOrderId: order.id,
      software: titles.map((name) => ({ name, status: randomStatus(), salesOrderId: order.id })),
    }
  })

  return { id: `group-${String(groupIndex + 1).padStart(2, '0')}`, name: `${theme} – Room ${roomNumber}`, devices }
})

// ---------- Step 4: seat counts ----------
// Count how many seats each pool uses, then give it that many PLUS some spare seats.
// The spare amount is random on purpose, to be chaotic: some pools are nearly full
// (so you can easily hit the "not enough seats" error), some have plenty.
function countSeatsUsed(salesOrderId: string, software: string): number {
  return generatedGroups
    .flatMap((group) => group.devices)
    .flatMap((device) => device.software)
    .filter((assigned) => assigned.salesOrderId === salesOrderId && assigned.name === software).length
}

export const salesOrders: SalesOrder[] = salesOrderSoftware.map((order) => ({
  id: order.id,
  customer: order.customer,
  seatPools: order.titles.map((software) => {
    const used = countSeatsUsed(order.id, software)
    const roll = random()
    const spareSeats = roll < 0.25 ? randomInteger(0, 3) : roll < 0.75 ? randomInteger(4, 25) : randomInteger(30, 90)
    return { software, seats: used + spareSeats }
  }),
}))

// The starting groups. The page copies them into state, so assigning software
// changes that copy and never this list.
export const initialDeviceGroups: DeviceGroup[] = generatedGroups

// ---------- Helpers ----------

// Seats in use are counted once and kept in a lookup, because counting them again for
// every row of the panel on every change would be slow with this much data.
// The lookup's keys look like "SO118742|Studio" and its values are seat counts.
export type SeatUsage = Map<string, number>

export function makeSeatKey(salesOrderId: string, software: string): string {
  return `${salesOrderId}|${software}`
}

// Counts every assignment on every device, once.
export function buildSeatUsage(groups: DeviceGroup[]): SeatUsage {
  const usage: SeatUsage = new Map()
  for (const group of groups) {
    for (const device of group.devices) {
      for (const assigned of device.software) {
        const key = makeSeatKey(assigned.salesOrderId, assigned.name)
        usage.set(key, (usage.get(key) ?? 0) + 1)
      }
    }
  }
  return usage
}

// How many seats of a pool are still free.
export function getSeatsLeft(usage: SeatUsage, salesOrderId: string, software: string): number {
  const pool = salesOrders
    .find((order) => order.id === salesOrderId)
    ?.seatPools.find((candidate) => candidate.software === software)
  return (pool?.seats ?? 0) - (usage.get(makeSeatKey(salesOrderId, software)) ?? 0)
}
