import { getSeatsLeft, type Device, type DeviceGroup, type SeatUsage } from './data/assignment-data'

// The rules for dragging software onto devices and groups, in plain functions
// (no drawing here, so they're easy to read and to change).

// A piece of software being dragged: which sales order's pool it comes from, and its name.
export type DraggedSoftware = { salesOrderId: string; software: string }

// What it was dropped on: a whole group, or a single device.
export type DropTarget = { kind: 'group'; group: DeviceGroup } | { kind: 'device'; device: Device }

// One staged change ("operation"): this software was dropped on this target. It is
// not applied for real until you press "Review and apply". Storing the device ids
// means the change always affects the same devices, even if the lists change later.
export type StagedOperation = {
  id: number
  dragged: DraggedSoftware
  targetKind: 'group' | 'device'
  targetId: string // the id of the group or device it was dropped on
  targetName: string
  groupId: string // the group it landed in (for jumping the camera to it)
  deviceIds: string[]
}

// The answer to "can this drop happen?". Either it's fine (and here are the devices
// that would get the software), or it's an error with a title and a message to show.
export type AssignmentCheck =
  | { ok: true; devices: Device[] }
  | { ok: false; title: string; message: string }

// Writes a list of names like "A, B and C", or "A, B, C and 2 more" when it's long.
// TWEAK: maxNamesShown is how many names are listed before "and N more".
const maxNamesShown = 3
function listNames(names: string[]): string {
  if (names.length === 1) return names[0]
  const shown = names.slice(0, maxNamesShown)
  const hiddenCount = names.length - shown.length
  if (hiddenCount > 0) return `${shown.join(', ')} and ${hiddenCount} more`
  return `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`
}

// Checks the two rules:
//   1. The pool must have at least one free seat per device that would get the software.
//   2. None of those devices may already have this software, even if that copy uses a
//      seat from a different sales order.
// `seatUsage` and the groups inside `target` must already include staged changes, so
// changes you have already staged count too.
export function checkAssignment(
  seatUsage: SeatUsage,
  dragged: DraggedSoftware,
  target: DropTarget,
): AssignmentCheck {
  const devices = target.kind === 'group' ? target.group.devices : [target.device]
  const targetName = target.kind === 'group' ? target.group.name : target.device.name

  // Rule 1: enough seats?
  const seatsLeft = getSeatsLeft(seatUsage, dragged.salesOrderId, dragged.software)
  if (seatsLeft < devices.length) {
    const seatsText = `${seatsLeft} seat${seatsLeft === 1 ? '' : 's'} left`
    // "but zSpace Laptop 05 needs one" (one device) or "but 18 devices in Engineering Lab 1 need one each" (a group).
    const needText =
      target.kind === 'device'
        ? `${targetName} needs one`
        : `${devices.length} devices in ${targetName} need one each`
    return {
      ok: false,
      title: 'Not enough seats',
      message: `${dragged.software} (${dragged.salesOrderId}) has ${seatsText}, but ${needText}.`,
    }
  }

  // Rule 2: does any device already have it?
  const devicesWithIt = devices.filter((device) =>
    device.software.some((assigned) => assigned.name === dragged.software),
  )
  if (devicesWithIt.length > 0) {
    const verb = devicesWithIt.length === 1 ? 'already has' : 'already have'
    return {
      ok: false,
      title: 'Already assigned',
      message: `${listNames(devicesWithIt.map((device) => device.name))} ${verb} ${dragged.software}.`,
    }
  }

  return { ok: true, devices }
}

// Returns a NEW list of groups where the devices with the given ids have the software
// added, with the given status ('Staged' while it's only a draft).
export function assignSoftware(
  groups: DeviceGroup[],
  dragged: DraggedSoftware,
  deviceIds: string[],
  status: 'Staged' | 'Pending',
): DeviceGroup[] {
  const idsToChange = new Set(deviceIds)
  return groups.map((group) => {
    // Skip groups that have none of the devices (keeps them untouched, which is faster).
    if (!group.devices.some((device) => idsToChange.has(device.id))) return group
    return {
      ...group,
      devices: group.devices.map((device) =>
        idsToChange.has(device.id)
          ? {
              ...device,
              software: [...device.software, { name: dragged.software, status, salesOrderId: dragged.salesOrderId }],
            }
          : device,
      ),
    }
  })
}

// Turns every 'Staged' software into 'Pending' (used when you press "Apply").
export function commitStagedSoftware(groups: DeviceGroup[]): DeviceGroup[] {
  return groups.map((group) => ({
    ...group,
    devices: group.devices.map((device) => ({
      ...device,
      software: device.software.map((assigned) =>
        assigned.status === 'Staged' ? { ...assigned, status: 'Pending' as const } : assigned,
      ),
    })),
  }))
}
