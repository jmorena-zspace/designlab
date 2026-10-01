import { getSeatsLeft, makeSeatKey, type Device, type DeviceGroup, type SeatUsage } from './data/assignment-data'

// The rules for dragging software onto devices and groups, and for moving devices between
// groups, in plain functions (no drawing here, so they're easy to read and to change).

// A piece of software being dragged: which sales order's pool it comes from, and its name.
export type DraggedSoftware = { salesOrderId: string; software: string }

// What software was dropped on: a whole group, or a single device.
export type DropTarget = { kind: 'group'; group: DeviceGroup } | { kind: 'device'; device: Device }

// ---------- Staged changes ----------
// A staged change ("operation") is a draft: it is not applied for real until you press
// "Review and apply". There are two kinds.

// Some software was dropped on a group or a device. One drop can carry several titles
// (when you drag a multi-selection). Storing the device ids means the change always
// affects the same devices, even if the lists change later.
export type AssignOperation = {
  kind: 'assign'
  id: number
  groupId: string // the group it landed in (for jumping the camera to it)
  software: DraggedSoftware[]
  targetKind: 'group' | 'device'
  targetName: string
  deviceIds: string[]
}

// A device was dragged from one group into another.
export type MoveOperation = {
  kind: 'move'
  id: number
  groupId: string // the group it moved INTO (for jumping the camera to it)
  deviceId: string
  deviceName: string
  fromGroupId: string
  fromGroupName: string
  toGroupName: string
}

export type StagedOperation = AssignOperation | MoveOperation

// How many software assignments a change makes (a move makes none).
export function countAssignments(operation: StagedOperation): number {
  return operation.kind === 'assign' ? operation.deviceIds.length * operation.software.length : 0
}

// ---------- Checking a software drop ----------

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

// Checks the two rules for ONE piece of software:
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

// The result of dropping several titles at once: the ones that pass the rules, and the
// ones that don't (each with the reason).
export type BatchCheck = {
  accepted: DraggedSoftware[]
  rejected: { dragged: DraggedSoftware; title: string; message: string }[]
  devices: Device[] // the devices the accepted titles would go to
}

// Checks each title in turn, as if the earlier ones had already been staged. That matters
// when two titles with the same name (from different sales orders) are dragged together:
// the first is fine, the second is rejected because the devices would already have it.
export function checkBatch(
  groups: DeviceGroup[],
  seatUsage: SeatUsage,
  draggedList: DraggedSoftware[],
  target: DropTarget,
): BatchCheck {
  const accepted: DraggedSoftware[] = []
  const rejected: BatchCheck['rejected'] = []
  let currentGroups = groups
  let currentUsage = seatUsage
  let currentTarget = target
  let devices: Device[] = []

  for (const dragged of draggedList) {
    const check = checkAssignment(currentUsage, dragged, currentTarget)
    if (!check.ok) {
      rejected.push({ dragged, title: check.title, message: check.message })
      continue
    }
    accepted.push(dragged)
    devices = check.devices
    // Pretend it was staged: update the groups, the target, and the seat counts.
    const deviceIds = check.devices.map((device) => device.id)
    currentGroups = assignSoftware(currentGroups, dragged, deviceIds, 'Staged')
    currentTarget = findTarget(currentGroups, currentTarget)
    currentUsage = new Map(currentUsage)
    const key = makeSeatKey(dragged.salesOrderId, dragged.software)
    currentUsage.set(key, (currentUsage.get(key) ?? 0) + deviceIds.length)
  }

  return { accepted, rejected, devices }
}

// Finds the same group or device again in an updated list of groups.
function findTarget(groups: DeviceGroup[], target: DropTarget): DropTarget {
  if (target.kind === 'group') {
    return { kind: 'group', group: groups.find((group) => group.id === target.group.id) ?? target.group }
  }
  for (const group of groups) {
    const device = group.devices.find((candidate) => candidate.id === target.device.id)
    if (device) return { kind: 'device', device }
  }
  return target
}

// ---------- Applying changes ----------

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

// Returns a NEW list of groups where the device has been taken out of its group and put
// at the end of another one.
export function moveDevice(groups: DeviceGroup[], deviceId: string, toGroupId: string): DeviceGroup[] {
  const device = groups.flatMap((group) => group.devices).find((candidate) => candidate.id === deviceId)
  if (!device) return groups
  return groups.map((group) => {
    if (group.id === toGroupId) {
      // (If it is already here, remove it first so it isn't listed twice.)
      return { ...group, devices: [...group.devices.filter((candidate) => candidate.id !== deviceId), device] }
    }
    if (group.devices.some((candidate) => candidate.id === deviceId)) {
      return { ...group, devices: group.devices.filter((candidate) => candidate.id !== deviceId) }
    }
    return group
  })
}

// Replays one staged change on top of the groups.
export function applyOperation(groups: DeviceGroup[], operation: StagedOperation): DeviceGroup[] {
  if (operation.kind === 'move') return moveDevice(groups, operation.deviceId, operation.groupId)
  return operation.software.reduce(
    (current, dragged) => assignSoftware(current, dragged, operation.deviceIds, 'Staged'),
    groups,
  )
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
