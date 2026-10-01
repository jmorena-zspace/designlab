import type { Device, DeviceGroup } from './data/assignment-data'

// The canvas search: which groups and devices match what was typed?
// Every word typed must appear somewhere in the text (capitals don't matter), so
// "laptop 12 SO118" finds device "zSpace Laptop 012" that belongs to a sales order
// starting SO118.
//
// What is searched:
//   - for a GROUP: its name;
//   - for a DEVICE: its name, serial number, sales order, and the names of the software
//     assigned to it. (The software names are an extra: remove `softwareNames` below to
//     search only name, serial and sales order.)
// A group matches if its name matches OR any of its devices matches.

function splitIntoWords(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean)
}

// All the text we search in for one device.
function deviceText(device: Device): string {
  const softwareNames = device.software.map((assigned) => assigned.name)
  return [device.name, device.serialNumber, device.salesOrderId, ...softwareNames].join(' ').toLowerCase()
}

// Does this device match? (Only the device's own text counts, not its group's name.)
export function deviceMatches(device: Device, query: string): boolean {
  const words = splitIntoWords(query)
  if (words.length === 0) return false
  const text = deviceText(device)
  return words.every((word) => text.includes(word))
}

// Does this group match? Either its name does, or at least one of its devices does.
export function groupMatches(group: DeviceGroup, query: string): boolean {
  const words = splitIntoWords(query)
  if (words.length === 0) return false
  const name = group.name.toLowerCase()
  if (words.every((word) => name.includes(word))) return true
  return group.devices.some((device) => deviceMatches(device, query))
}
