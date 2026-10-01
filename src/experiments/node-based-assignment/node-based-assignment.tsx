import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { toast } from 'sonner'
import {
  applyOperation,
  checkBatch,
  commitStagedSoftware,
  type AssignOperation,
  type DraggedSoftware,
  type DropTarget,
  type MoveOperation,
  type StagedOperation,
} from './assignment-rules'
import { DeviceNode } from './components/device-node'
import { setDragLabel } from './components/drag-image'
import { GroupBackdrop } from './components/group-backdrop'
import { GroupConnector } from './components/group-connector'
import { GroupNode } from './components/group-node'
import { InfiniteCanvas, type FocusRequest, type WorldBounds } from './components/infinite-canvas'
import type { DropState, Emphasis } from './components/node-styles'
import { ReviewDialog } from './components/review-dialog'
import { SearchBox } from './components/search-box'
import { SoftwarePanel } from './components/software-panel'
import { SummaryPanel } from './components/summary-panel'
import { ToolbarButtons } from './components/toolbar-buttons'
import { buildSeatUsage, initialDeviceGroups } from './data/assignment-data'
import {
  computeLayout,
  containerPaddingBottom,
  containerPaddingSide,
  containerPaddingTop,
  countUnassignedDevices,
  getContainerSize,
  getStartingPositions,
  groupNodeHeight,
  groupNodeWidth,
  type LayoutItem,
  type Position,
} from './layout'
import { placeContainer, type Rect } from './placement'
import { deviceMatches, groupMatches } from './search-groups'
import { useAnimatedLayout, type AnimatedItem } from './use-animated-layout'
import { InfoExplainer } from '@/components/info/info-explainer'

// TWEAK: where the canvas starts. x and y shift the world (the left panel covers
// about 340px, so we start the content to its right); scale is the zoom (1 = 100%).
const initialView = { x: 380, y: 140, scale: 0.8 }
// TWEAK: how far (in screen pixels) you must move the pointer before pressing on something
// counts as a DRAG instead of a click.
const dragThreshold = 4
// TWEAK: the "Devices without assignments" container (made by the Arrange button).
const arrangeCellGap = 20 // space between the group nodes inside it
const arrangeAspect = 1.6 // how much wider than tall it should be (1 = square)
const arrangeDistance = 200 // how far to the right of everything else it is put
// TWEAK: while you search, the matching groups are stacked in a column starting here
// (this is where the groups start when the page first loads).
const searchStackX = 0
const searchStackY = 0
const searchStackGap = 28 // vertical space between the stacked groups

// Is any part of this box inside the visible part of the world?
function isOnScreen(item: LayoutItem, bounds: WorldBounds): boolean {
  return (
    item.x < bounds.right &&
    item.x + item.width > bounds.left &&
    item.y < bounds.bottom &&
    item.y + item.height > bounds.top
  )
}

// The sales orders involved in a group, in two categories, each listed once with the most
// common first: the ones its DEVICES belong to, and the ones the APPS (the software on those
// devices) were bought with. They can differ, because software can use a seat from another order.
function getGroupSalesOrders(group: { devices: { salesOrderId: string; software: { salesOrderId: string }[] }[] }) {
  const mostCommonFirst = (ids: string[]) => {
    const counts = new Map<string, number>()
    for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id)
  }
  return {
    devices: mostCommonFirst(group.devices.map((device) => device.salesOrderId)),
    apps: mostCommonFirst(group.devices.flatMap((device) => device.software.map((assigned) => assigned.salesOrderId))),
  }
}

// What a press-and-drag can move:
//   a group NODE (only the node moves; its container stays and the line stretches),
//   a group's CONTAINER (only the container moves),
//   the ARRANGE container (it and all the group nodes inside move together).
type DragTarget = { kind: 'node'; groupId: string } | { kind: 'container'; groupId: string } | { kind: 'arrange' }

// The "Devices without assignments" container: a rectangle, plus how many groups it holds.
type ArrangeBox = Rect & { count: number }

// Experiment: Node based assignment
// An infinite canvas of 50 device groups. Click a group to open its devices in a gray
// container (any number can be open). Containers are placed so they never overlap, and a
// line always joins each one to its group. Drag group nodes and containers around
// independently. Press Arrange to gather the groups that have devices without software
// into one container. The search box on the right hides groups that don't match; the one
// on the left filters the software list. Hover software to see where it's used, and
// drag it (tick several to drag them together) onto a group or a device to STAGE an
// assignment. Drag a device card onto another group to STAGE a move. Staged changes collect
// in the summary panel on the right, where you can undo / redo / reset them, or review and apply them.
export default function NodeBasedAssignmentExperiment() {
  // ---------- State: everything that can change on this page ----------
  // The groups as they are for real (applied). Staged changes are NOT in here.
  const [baseGroups, setBaseGroups] = useState(initialDeviceGroups)
  // The staged changes, oldest first. "Undo" takes the last one off this list and puts
  // it on the redo list; "Redo" moves it back.
  const [operations, setOperations] = useState<StagedOperation[]>([])
  const [redoStack, setRedoStack] = useState<StagedOperation[]>([])
  // Where each group NODE sits on the canvas.
  const [nodePositions, setNodePositions] = useState<Record<string, Position>>(() =>
    getStartingPositions(initialDeviceGroups),
  )
  // Where each open group's CONTAINER sits (the gray panel with its device cards). Separate
  // from the node's position, so the two can be moved independently.
  const [containerPositions, setContainerPositions] = useState<Record<string, Position>>({})
  // The ids of the groups that are open (any number can be).
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([])
  // The "Devices without assignments" container made by Arrange (null = not showing).
  const [arrangeBox, setArrangeBox] = useState<ArrangeBox | null>(null)
  // Group ids from least to most recently used. The last one is drawn on top of the others.
  const [frontOrder, setFrontOrder] = useState<string[]>([])
  // True while something is being dragged around (the animation steps aside so it follows the pointer).
  const [isDragging, setIsDragging] = useState(false)
  // What's typed in the canvas search box (top right).
  const [canvasQuery, setCanvasQuery] = useState('')
  // The software title the pointer is over in the left panel (null = none).
  const [hoveredSoftware, setHoveredSoftware] = useState<string | null>(null)
  // The software titles you have ticked in the left panel (drag one of them to drag all).
  const [selectedSoftware, setSelectedSoftware] = useState<DraggedSoftware[]>([])
  // The software titles being dragged right now (an empty list = not dragging software).
  const [draggedSoftware, setDraggedSoftware] = useState<DraggedSoftware[]>([])
  // The id of the node the dragged software is currently over.
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  // The device card being dragged right now (null = not dragging a device), and the id of the
  // group it is currently over (so that group can light up as a place to drop it).
  const [draggedDevice, setDraggedDevice] = useState<{ deviceId: string; fromGroupId: string } | null>(null)
  const [deviceDropGroupId, setDeviceDropGroupId] = useState<string | null>(null)
  // Whether the "Review and apply" window is open.
  const [reviewOpen, setReviewOpen] = useState(false)
  // A request for the canvas camera to fly somewhere.
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null)

  const canvasWrapperRef = useRef<HTMLDivElement>(null)
  const nextOperationId = useRef(1)
  // A drag ends with a "click" event; this flag makes the page ignore that one click.
  const suppressNextClick = useRef(false)
  // Where the groups were before Arrange moved them, so pressing Arrange again can put them back.
  const positionsBeforeArrange = useRef<Record<string, Position>>({})
  // Where the groups were before the canvas search stacked them, so clearing the search can put them back.
  const positionsBeforeSearch = useRef<Record<string, Position>>({})

  // ---------- Derived data: worked out from the state above ----------
  // The groups AS THEY WOULD BE once the staged changes are applied. Every staged change
  // is replayed on top of the real groups. Everything on screen uses these, so staged
  // software shows up on the cards (as "Staged") and counts against the seats.
  const groups = useMemo(
    () => operations.reduce((current, operation) => applyOperation(current, operation), baseGroups),
    [baseGroups, operations],
  )
  // Seats in use, with and without the staged changes. (Counting is slow with this much
  // data, so it's done once per change here and shared.)
  const seatUsage = useMemo(() => buildSeatUsage(groups), [groups])
  const baseSeatUsage = useMemo(() => buildSeatUsage(baseGroups), [baseGroups])
  // Lookups by id, so finding a device or group doesn't mean searching a list of 900.
  const devicesById = useMemo(
    () => new Map(groups.flatMap((group) => group.devices).map((device) => [device.id, device])),
    [groups],
  )
  const groupsById = useMemo(() => new Map(groups.map((group) => [group.id, group])), [groups])

  // The latest values of some state, readable from functions that must not change on
  // every render (so the side panels can skip redrawing) or that run inside event handlers.
  const latest = useRef({ groups, nodePositions, containerPositions, expandedGroupIds, arrangeBox })
  useEffect(() => {
    latest.current = { groups, nodePositions, containerPositions, expandedGroupIds, arrangeBox }
  })

  // The software to highlight: the titles being dragged, or else the one being hovered.
  const isDraggingSoftware = draggedSoftware.length > 0
  const activeSoftwareNames = useMemo(
    () => (draggedSoftware.length > 0 ? draggedSoftware.map((item) => item.software) : hoveredSoftware ? [hoveredSoftware] : []),
    [draggedSoftware, hoveredSoftware],
  )
  // A short label for the highlighted software: its name, or "3 titles".
  const activeLabel =
    activeSoftwareNames.length === 0
      ? null
      : activeSoftwareNames.length === 1
        ? activeSoftwareNames[0]
        : `${activeSoftwareNames.length} titles`
  // Does this device have any of the highlighted software?
  const hasActiveSoftware = (device: { software: { name: string }[] }) =>
    device.software.some((assigned) => activeSoftwareNames.includes(assigned.name))
  // For each group, how many of its devices have the highlighted software (for highlights).
  const appliedCountByGroup = useMemo(() => {
    const counts = new Map<string, number>()
    if (activeSoftwareNames.length === 0) return counts
    for (const group of groups) {
      counts.set(
        group.id,
        group.devices.filter((device) => device.software.some((assigned) => activeSoftwareNames.includes(assigned.name))).length,
      )
    }
    return counts
  }, [groups, activeSoftwareNames])

  // THE CANVAS SEARCH. Groups that don't match are hidden completely (not opened or
  // changed). Which devices match is worked out once per search, not per frame.
  const isSearching = canvasQuery.trim() !== ''
  const searchMatches = useMemo(() => {
    const matchingDeviceIds = new Set<string>()
    const matchCountByGroup = new Map<string, number>()
    for (const group of groups) {
      const matchingDevices = group.devices.filter((device) => deviceMatches(device, canvasQuery))
      matchingDevices.forEach((device) => matchingDeviceIds.add(device.id))
      matchCountByGroup.set(group.id, matchingDevices.length)
    }
    return { matchingDeviceIds, matchCountByGroup }
  }, [groups, canvasQuery])
  // The groups that are shown: all of them, or only the matching ones while searching.
  const visibleGroups = useMemo(
    () => (isSearching ? groups.filter((group) => groupMatches(group, canvasQuery)) : groups),
    [groups, isSearching, canvasQuery],
  )
  // The open groups that are also shown (a group the search hides is skipped).
  const openGroupIds = useMemo(
    () => expandedGroupIds.filter((id) => visibleGroups.some((group) => group.id === id)),
    [expandedGroupIds, visibleGroups],
  )

  // ---------- Layout ----------
  // Where everything SHOULD be. `useMemo` only recalculates it when something it depends
  // on changes (otherwise the animation below would restart on every render).
  const targetLayout = useMemo(
    () => computeLayout(visibleGroups, openGroupIds, nodePositions, containerPositions),
    [visibleGroups, openGroupIds, nodePositions, containerPositions],
  )
  // Where everything IS right now. It fades and glides toward the target, except while
  // you drag, when it just follows the pointer.
  const animatedItems = useAnimatedLayout(targetLayout, isDragging)

  // How far forward each group is drawn. Groups used more recently are in front.
  // (A group takes 3 layers: the container and line, the group node, and the device cards.)
  const getLayer = (groupId: string) => 3 * (frontOrder.indexOf(groupId) + 1)
  const bringToFront = useCallback((groupId: string) => {
    setFrontOrder((current) => [...current.filter((id) => id !== groupId), groupId])
  }, [])

  // ---------- Camera ----------
  // Flies the camera to a group: the middle of its node and (if open) its container.
  const flyToGroup = useCallback((groupId: string) => {
    const { groups: allGroups, nodePositions: nodes, containerPositions: containers, expandedGroupIds: open } = latest.current
    const node = nodes[groupId]
    if (!node) return
    let left = node.x
    let top = node.y
    let right = node.x + groupNodeWidth
    let bottom = node.y + groupNodeHeight
    const group = allGroups.find((candidate) => candidate.id === groupId)
    const container = containers[groupId]
    if (group && container && open.includes(groupId)) {
      const size = getContainerSize(group)
      left = Math.min(left, container.x)
      top = Math.min(top, container.y)
      right = Math.max(right, container.x + size.width)
      bottom = Math.max(bottom, container.y + size.height)
    }
    setFocusRequest({ id: Date.now(), x: (left + right) / 2, y: (top + bottom) / 2 })
  }, [])

  // ---------- Opening and closing groups ----------
  // OPENING a group works out where its container fits without overlapping anything
  // (see placement.ts), remembers that spot, and adds the group to the open list.
  const openGroup = useCallback(
    (groupId: string) => {
      const { groups: allGroups, nodePositions: nodes, containerPositions: containers, expandedGroupIds: open, arrangeBox: box } =
        latest.current
      bringToFront(groupId)
      if (open.includes(groupId)) return
      const group = allGroups.find((candidate) => candidate.id === groupId)
      if (!group) return
      const position = placeContainer(group, allGroups, nodes, containers, open, box)
      setContainerPositions((current) => ({ ...current, [groupId]: position }))
      setExpandedGroupIds((current) => [...current, groupId])
    },
    [bringToFront],
  )

  // CLOSING forgets the container's spot, so next time it is placed fresh.
  const closeGroup = (groupId: string) => {
    setExpandedGroupIds((current) => current.filter((id) => id !== groupId))
    setContainerPositions((current) => {
      const remaining = { ...current }
      delete remaining[groupId]
      return remaining
    })
  }

  const closeAllGroups = () => {
    setExpandedGroupIds([])
    setContainerPositions({})
  }

  // ---------- Actions ----------
  // Clicking a group opens it, or closes it if it was open. (Ignored if the click was
  // really the end of a drag.)
  const toggleGroup = (groupId: string) => {
    if (suppressNextClick.current) return
    if (openGroupIds.includes(groupId)) closeGroup(groupId)
    else openGroup(groupId)
  }

  // Finds a new free spot for the container of every OPEN group in `groupIds`. Used after
  // group nodes have been moved around, so each container ends up next to its node again.
  const replaceOpenContainers = (
    groupIds: string[],
    shownGroups: typeof groups,
    newNodePositions: Record<string, Position>,
  ): Record<string, Position> => {
    const result = { ...containerPositions }
    for (const group of shownGroups) {
      if (!groupIds.includes(group.id) || !expandedGroupIds.includes(group.id)) continue
      result[group.id] = placeContainer(group, shownGroups, newNodePositions, result, expandedGroupIds, arrangeBox)
    }
    return result
  }

  // THE CANVAS SEARCH. Groups that don't match are hidden. The ones that match are moved
  // into one tidy column, one below the other (in their usual order), and the camera
  // flies to the top of it, so you never have to hunt around the canvas for them.
  // Nothing opens by itself. Clearing the search puts every group back where it was.
  const handleCanvasSearchChange = (newQuery: string) => {
    const wasSearching = isSearching
    const isNowSearching = newQuery.trim() !== ''
    setCanvasQuery(newQuery)

    // The search was cleared: put the stacked groups back.
    if (!isNowSearching) {
      if (wasSearching) {
        const restoredIds = Object.keys(positionsBeforeSearch.current)
        const newNodePositions = { ...nodePositions, ...positionsBeforeSearch.current }
        setNodePositions(newNodePositions)
        setContainerPositions(replaceOpenContainers(restoredIds, groups, newNodePositions))
        positionsBeforeSearch.current = {}
      }
      return
    }

    // A new search is starting: forget the old "before" positions.
    if (!wasSearching) positionsBeforeSearch.current = {}

    // Stack the matching groups, one below the other. The first time a group is moved, its
    // old position is remembered.
    const matches = groups.filter((group) => groupMatches(group, newQuery))
    const newNodePositions = { ...nodePositions }
    matches.forEach((group, index) => {
      if (!(group.id in positionsBeforeSearch.current)) {
        positionsBeforeSearch.current[group.id] = nodePositions[group.id]
      }
      newNodePositions[group.id] = {
        x: searchStackX,
        y: searchStackY + index * (groupNodeHeight + searchStackGap),
      }
    })
    setNodePositions(newNodePositions)
    // Open groups among the matches get their containers re-placed next to their new spot.
    setContainerPositions(replaceOpenContainers(matches.map((group) => group.id), matches, newNodePositions))

    // Fly to the top of the stack.
    if (matches.length > 0) {
      const stackHeight = matches.length * (groupNodeHeight + searchStackGap)
      setFocusRequest({
        id: Date.now(),
        x: searchStackX + groupNodeWidth / 2,
        y: searchStackY + Math.min(stackHeight / 2, 280),
      })
    }
  }

  // THE ARRANGE BUTTON. Switches the "Devices without assignments" container on or off.
  // ON: every group that has at least one device without software moves into one new gray
  // container (biggest number of unassigned devices first), placed to the right of everything
  // else. OFF: those groups go back to where they were.
  const handleToggleArrange = () => {
    if (arrangeBox) {
      setNodePositions((current) => ({ ...current, ...positionsBeforeArrange.current }))
      setArrangeBox(null)
      return
    }

    const members = visibleGroups
      .filter((group) => countUnassignedDevices(group) > 0)
      .sort((a, b) => countUnassignedDevices(b) - countUnassignedDevices(a))
    if (members.length === 0) {
      toast('Every device already has software', { position: 'top-center' })
      return
    }

    // The grid of group nodes inside the container: how many columns, and how big.
    const cellWidth = groupNodeWidth + arrangeCellGap
    const cellHeight = groupNodeHeight + arrangeCellGap
    const columns = Math.max(1, Math.round(Math.sqrt((members.length * arrangeAspect * cellHeight) / cellWidth)))
    const rows = Math.ceil(members.length / columns)

    // Put it to the right of everything on the canvas (nodes and open containers), level with the top.
    let rightEdge = 0
    let top = Infinity
    for (const group of groups) {
      const node = nodePositions[group.id]
      if (!node) continue
      rightEdge = Math.max(rightEdge, node.x + groupNodeWidth)
      top = Math.min(top, node.y)
      const container = containerPositions[group.id]
      if (container && openGroupIds.includes(group.id)) {
        rightEdge = Math.max(rightEdge, container.x + getContainerSize(group).width)
      }
    }
    const box: ArrangeBox = {
      x: rightEdge + arrangeDistance,
      y: Number.isFinite(top) ? top : 0,
      width: columns * cellWidth - arrangeCellGap + containerPaddingSide * 2,
      height: rows * cellHeight - arrangeCellGap + containerPaddingTop + containerPaddingBottom,
      count: members.length,
    }

    // Move each member into its cell (remembering where it was).
    positionsBeforeArrange.current = {}
    const newNodePositions = { ...nodePositions }
    members.forEach((group, index) => {
      positionsBeforeArrange.current[group.id] = nodePositions[group.id]
      newNodePositions[group.id] = {
        x: box.x + containerPaddingSide + (index % columns) * cellWidth,
        y: box.y + containerPaddingTop + Math.floor(index / columns) * cellHeight,
      }
    })

    // Open members' containers might now be in the way, so find each a new free spot.
    const newContainerPositions = { ...containerPositions }
    for (const group of members) {
      if (!openGroupIds.includes(group.id)) continue
      newContainerPositions[group.id] = placeContainer(group, groups, newNodePositions, newContainerPositions, openGroupIds, box)
    }

    setNodePositions(newNodePositions)
    setContainerPositions(newContainerPositions)
    setArrangeBox(box)
    // Fly the camera so the whole container fits on screen.
    setFocusRequest({
      id: Date.now(),
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
      fit: { width: box.width, height: box.height },
    })
  }

  // DRAGGING. Pressing on something and moving the pointer moves it (see DragTarget above).
  // We listen on the whole window while the button is down, so the drag keeps working
  // even if the pointer is fast.
  const startDrag = (event: React.PointerEvent, target: DragTarget) => {
    if (event.button !== 0) return
    if (target.kind !== 'arrange') bringToFront(target.groupId)

    // The canvas zoom, read from the world's CSS transform: the movement on screen has
    // to be divided by it to get the movement in the world.
    const world = (event.currentTarget as HTMLElement).closest('[data-world]') as HTMLElement
    const scale = new DOMMatrixReadOnly(getComputedStyle(world).transform).a
    const startX = event.clientX
    const startY = event.clientY
    const { nodePositions: nodes, containerPositions: containers, arrangeBox: box } = latest.current

    // Remember where everything that will move started. Moving the Arrange container
    // moves it, the group nodes sitting inside it, and those groups' containers.
    const movingNodeIds: string[] = []
    if (target.kind === 'arrange' && box) {
      for (const [id, position] of Object.entries(nodes)) {
        const centerX = position.x + groupNodeWidth / 2
        const centerY = position.y + groupNodeHeight / 2
        if (centerX >= box.x && centerX <= box.x + box.width && centerY >= box.y && centerY <= box.y + box.height) {
          movingNodeIds.push(id)
        }
      }
    }
    const nodeOrigins = Object.fromEntries(
      (target.kind === 'node' ? [target.groupId] : movingNodeIds).map((id) => [id, nodes[id]]),
    )
    const containerOrigins = Object.fromEntries(
      (target.kind === 'container' ? [target.groupId] : target.kind === 'arrange' ? movingNodeIds : [])
        .filter((id) => containers[id])
        .map((id) => [id, containers[id]]),
    )
    let hasMoved = false

    const handleMove = (moveEvent: PointerEvent) => {
      const dx = (moveEvent.clientX - startX) / scale
      const dy = (moveEvent.clientY - startY) / scale
      // Tiny movements are still a click, not a drag.
      if (!hasMoved && Math.hypot(dx * scale, dy * scale) < dragThreshold) return
      if (!hasMoved) {
        hasMoved = true
        setIsDragging(true)
      }
      const shift = (origins: Record<string, Position>) =>
        Object.fromEntries(Object.entries(origins).map(([id, origin]) => [id, { x: origin.x + dx, y: origin.y + dy }]))
      if (Object.keys(nodeOrigins).length > 0) setNodePositions((current) => ({ ...current, ...shift(nodeOrigins) }))
      if (Object.keys(containerOrigins).length > 0) setContainerPositions((current) => ({ ...current, ...shift(containerOrigins) }))
      if (target.kind === 'arrange' && box) {
        setArrangeBox({ ...box, x: box.x + dx, y: box.y + dy })
      }
    }
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
      if (hasMoved) {
        // The browser is about to fire a click for this release; ignore it.
        suppressNextClick.current = true
        setTimeout(() => {
          suppressNextClick.current = false
        }, 0)
        setIsDragging(false)
      }
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
  }

  // A short animation on a node: a shake for an error, a small pop for a success.
  const animateNode = (nodeId: string, type: 'shake' | 'pop') => {
    const node = canvasWrapperRef.current?.querySelector(`[data-node-id="${nodeId}"]`)
    if (!node) return
    if (type === 'shake') {
      gsap.fromTo(node, { x: 0 }, { keyframes: { x: [-10, 10, -7, 7, -3, 3, 0] }, duration: 0.5, ease: 'power1.out' })
    } else {
      gsap.fromTo(node, { scale: 1 }, { scale: 1.04, duration: 0.18, yoyo: true, repeat: 1, ease: 'power1.out' })
    }
  }

  // Works out what a layout item is: the group or device it stands for, as a drop target.
  const getDropTarget = (item: LayoutItem): DropTarget | null => {
    if (item.kind === 'group') {
      const group = groupsById.get(item.id)
      return group ? { kind: 'group', group } : null
    }
    const device = devicesById.get(item.id)
    return device ? { kind: 'device', device } : null
  }

  // Software was dropped on a node: check the rules for each title, then STAGE the ones that
  // pass (nothing is applied until "Review and apply"). Titles that break a rule are skipped,
  // and an error says why.
  const handleDrop = (item: LayoutItem) => {
    const target = getDropTarget(item)
    if (!isDraggingSoftware || !target) return

    const check = checkBatch(groups, seatUsage, draggedSoftware, target)
    const reasons = check.rejected.map((rejection) => rejection.message).join(' ')

    // Nothing passed: show why, and shake the target.
    if (check.accepted.length === 0) {
      toast.error(check.rejected.length === 1 ? check.rejected[0].title : "These titles can't be assigned", {
        description: reasons,
        position: 'top-center',
      })
      animateNode(item.id, 'shake')
      return
    }

    const newOperation: AssignOperation = {
      kind: 'assign',
      id: nextOperationId.current++,
      groupId: item.groupId,
      software: check.accepted,
      targetKind: target.kind,
      targetName: target.kind === 'group' ? target.group.name : target.device.name,
      deviceIds: check.devices.map((device) => device.id),
    }
    setOperations([...operations, newOperation])
    setRedoStack([]) // a new change makes the old "redo" history meaningless
    setSelectedSoftware([]) // the ticks have done their job
    openGroup(item.groupId) // open the group so you can see the result
    const deviceCount = check.devices.length
    toast.success(
      check.accepted.length === 1 ? `${check.accepted[0].software} staged` : `${check.accepted.length} software titles staged`,
      {
        description: `For ${deviceCount} ${deviceCount === 1 ? 'device' : 'devices'}. Review and apply when ready.`,
        position: 'top-center',
      },
    )
    // Some titles were skipped: say so, separately.
    if (check.rejected.length > 0) {
      toast.warning(`${check.rejected.length} ${check.rejected.length === 1 ? 'title was' : 'titles were'} skipped`, {
        description: reasons,
        position: 'top-center',
      })
    }
    animateNode(item.id, 'pop')
  }

  // A device card was dropped on a group (its node, its container, or one of its cards):
  // STAGE a move of that device into the group.
  const handleDeviceMove = (toGroupId: string) => {
    if (!draggedDevice) return
    const device = devicesById.get(draggedDevice.deviceId)
    const fromGroup = groupsById.get(draggedDevice.fromGroupId)
    const toGroup = groupsById.get(toGroupId)
    if (!device || !fromGroup || !toGroup || fromGroup.id === toGroup.id) return

    const newOperation: MoveOperation = {
      kind: 'move',
      id: nextOperationId.current++,
      groupId: toGroup.id,
      deviceId: device.id,
      deviceName: device.name,
      fromGroupId: fromGroup.id,
      fromGroupName: fromGroup.name,
      toGroupName: toGroup.name,
    }
    setOperations([...operations, newOperation])
    setRedoStack([])
    openGroup(toGroup.id) // open the destination so you can see the device arrive
    toast.success(`${device.name} moved`, {
      description: `${fromGroup.name} → ${toGroup.name}. Review and apply when ready.`,
      position: 'top-center',
    })
  }

  // ---------- Undo, redo, reset, apply ----------
  // These are wrapped in useCallback so they stay the same function between renders,
  // which lets the panels skip redrawing while the canvas animates.
  const undo = useCallback(() => {
    if (operations.length === 0) return
    setRedoStack([...redoStack, operations[operations.length - 1]])
    setOperations(operations.slice(0, -1))
  }, [operations, redoStack])

  const redo = useCallback(() => {
    if (redoStack.length === 0) return
    setOperations([...operations, redoStack[redoStack.length - 1]])
    setRedoStack(redoStack.slice(0, -1))
  }, [operations, redoStack])

  const reset = useCallback(() => {
    toast('Staged changes cleared', {
      description: `${operations.length} ${operations.length === 1 ? 'change' : 'changes'} discarded.`,
      position: 'top-center',
    })
    setOperations([])
    setRedoStack([])
  }, [operations])

  // The trash can on a change: cancels just that one, leaving the others alone. A toast
  // offers to bring it back, in the same place in the list.
  const removeOperation = useCallback(
    (operationId: number) => {
      const index = operations.findIndex((operation) => operation.id === operationId)
      if (index === -1) return
      const removed = operations[index]
      setOperations(operations.filter((operation) => operation.id !== operationId))
      // If that was the last one, there is nothing left to review.
      if (operations.length === 1) setReviewOpen(false)
      toast('Change removed', {
        position: 'top-center',
        action: {
          label: 'Undo',
          // Put it back at the position it was in (functional update: works on the latest list).
          onClick: () =>
            setOperations((current) => [...current.slice(0, index), removed, ...current.slice(index)]),
        },
      })
    },
    [operations],
  )

  // Applying makes the staged software real: it becomes part of the base groups, as "Pending".
  const apply = useCallback(() => {
    setBaseGroups(commitStagedSoftware(groups))
    toast.success('Changes applied', {
      description: `${operations.length} ${operations.length === 1 ? 'change' : 'changes'} sent. The software is now Pending.`,
      position: 'top-center',
    })
    setOperations([])
    setRedoStack([])
    setReviewOpen(false)
  }, [groups, operations])

  // Clicking a staged change in the summary: open its group and fly there. If the
  // canvas search is hiding that group, the search is cleared so the group comes back.
  const showOperation = useCallback(
    (operation: StagedOperation) => {
      if (!visibleGroups.some((group) => group.id === operation.groupId)) setCanvasQuery('')
      openGroup(operation.groupId)
      flyToGroup(operation.groupId)
    },
    [visibleGroups, openGroup, flyToGroup],
  )

  const openReview = useCallback(() => setReviewOpen(true), [])
  const handleDragEnd = useCallback(() => {
    setDraggedSoftware([])
    setDropTargetId(null)
    setHoveredSoftware(null)
  }, [])
  // Ticking a software row adds it to the selection, or removes it if it was already there.
  const toggleSelectedSoftware = useCallback((dragged: DraggedSoftware) => {
    setSelectedSoftware((current) =>
      current.some((item) => item.salesOrderId === dragged.salesOrderId && item.software === dragged.software)
        ? current.filter((item) => !(item.salesOrderId === dragged.salesOrderId && item.software === dragged.software))
        : [...current, dragged],
    )
  }, [])
  const clearSelectedSoftware = useCallback(() => setSelectedSoftware([]), [])

  // KEYBOARD SHORTCUTS: ⌘Z / Ctrl+Z undoes, ⇧⌘Z / Ctrl+Shift+Z / Ctrl+Y redoes.
  // (Skipped while typing in a search box, so it can undo its own text.)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return
      const isModifierDown = event.metaKey || event.ctrlKey
      if (!isModifierDown) return
      const key = event.key.toLowerCase()
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  // ---------- How each node should look ----------
  // Dimmed = fades back; highlighted = blue outline.
  // `searchState` says how a device relates to the canvas search: 'match', 'no-match',
  // or 'not-searching' (also used for group nodes, which are simply hidden if they don't match).
  const getEmphasis = (hasHighlightedSoftware: boolean, searchState: 'match' | 'no-match' | 'not-searching'): Emphasis => {
    // While dragging we don't dim anything, so the places you can drop stay clear.
    const dimmedBySoftware = activeSoftwareNames.length > 0 && !isDraggingSoftware && !hasHighlightedSoftware
    if (dimmedBySoftware || searchState === 'no-match') return 'dimmed'
    if ((activeSoftwareNames.length > 0 && hasHighlightedSoftware) || searchState === 'match') return 'highlighted'
    return 'normal'
  }

  // While dragging over a node: green if the drop would work, red if it would be an error.
  //  - dragging software: green if at least one of the titles could be assigned;
  //  - dragging a device: the group node of the group it is over lights up green (unless it's its own group).
  const getDropState = (item: LayoutItem): DropState => {
    if (draggedDevice) {
      const isOtherGroup = deviceDropGroupId === item.id && item.id !== draggedDevice.fromGroupId
      return item.kind === 'group' && isOtherGroup ? 'valid' : 'none'
    }
    if (!isDraggingSoftware || dropTargetId !== item.id) return 'none'
    const target = getDropTarget(item)
    if (!target) return 'none'
    return checkBatch(groups, seatUsage, draggedSoftware, target).accepted.length > 0 ? 'valid' : 'invalid'
  }

  // Is a device being dragged over this group (and it's not the group the device came from)?
  const isDeviceDropTarget = (groupId: string) =>
    draggedDevice !== null && deviceDropGroupId === groupId && draggedDevice.fromGroupId !== groupId

  // Draws one box (a group node or a device card) at its current animated spot.
  const renderItem = (item: AnimatedItem) => {
    const group = groupsById.get(item.groupId)
    const device = item.kind === 'device' ? devicesById.get(item.id) : undefined
    if (!group) return null

    return (
      <div
        key={item.id}
        data-node-id={item.id}
        className="absolute"
        style={{
          left: item.x,
          top: item.y,
          width: item.width,
          height: item.height,
          opacity: item.opacity,
          zIndex: getLayer(item.groupId) + (item.kind === 'group' ? 1 : 2),
        }}
        // Pressing a group node can start dragging it; pressing a device card just
        // brings its group to the front.
        onPointerDown={(event) =>
          item.kind === 'group' ? startDrag(event, { kind: 'node', groupId: item.groupId }) : bringToFront(item.groupId)
        }
        // DRAGGING A DEVICE. A device card can be picked up (HTML's built-in drag and drop) and
        // dropped on another group to move it there.
        draggable={item.kind === 'device'}
        onDragStart={(event) => {
          if (item.kind !== 'device') return
          event.dataTransfer.setData('text/plain', item.id) // browsers need some data to allow a drag
          event.dataTransfer.effectAllowed = 'move'
          setDragLabel(event.dataTransfer, devicesById.get(item.id)?.name ?? 'Device') // our own label under the pointer
          setDraggedDevice({ deviceId: item.id, fromGroupId: item.groupId })
        }}
        onDragEnd={() => {
          setDraggedDevice(null)
          setDeviceDropGroupId(null)
        }}
        // DROPPING. These three handlers make the box a drop target, for software AND for devices:
        // - dragover: "yes, you may drop here" (preventDefault says yes) and remember where;
        // - dragleave: forget it when the pointer moves out;
        // - drop: do the assignment (software) or the move (device).
        onDragOver={(event) => {
          if (draggedDevice) {
            event.preventDefault()
            event.dataTransfer.dropEffect = 'move'
            if (deviceDropGroupId !== item.groupId) setDeviceDropGroupId(item.groupId)
            return
          }
          if (!isDraggingSoftware) return
          event.preventDefault()
          event.dataTransfer.dropEffect = 'copy'
          if (dropTargetId !== item.id) setDropTargetId(item.id)
        }}
        onDragLeave={(event) => {
          const stillInside = event.currentTarget.contains(event.relatedTarget as Node | null)
          if (stillInside) return
          setDropTargetId((current) => (current === item.id ? null : current))
          setDeviceDropGroupId((current) => (current === item.groupId ? null : current))
        }}
        onDrop={(event) => {
          event.preventDefault()
          setDropTargetId(null)
          if (draggedDevice) {
            handleDeviceMove(item.groupId)
            setDraggedDevice(null)
            setDeviceDropGroupId(null)
            return
          }
          handleDrop(item)
        }}
      >
        {item.kind === 'group' && (
          <GroupNode
            group={group}
            isExpanded={openGroupIds.includes(group.id)}
            onToggle={() => toggleGroup(group.id)}
            emphasis={getEmphasis((appliedCountByGroup.get(group.id) ?? 0) > 0, 'not-searching')}
            dropState={getDropState(item)}
            appliedCount={appliedCountByGroup.get(group.id) ?? 0}
            appliedSoftware={activeLabel}
            searchMatchCount={isSearching ? (searchMatches.matchCountByGroup.get(group.id) ?? 0) : null}
            unassignedCount={countUnassignedDevices(group)}
          />
        )}
        {item.kind === 'device' && device && (
          <DeviceNode
            device={device}
            emphasis={getEmphasis(
              hasActiveSoftware(device),
              // Devices are only marked when the search matched at least one device in this group
              // (if it only matched the group's name, there is nothing to single out).
              isSearching && (searchMatches.matchCountByGroup.get(group.id) ?? 0) > 0
                ? searchMatches.matchingDeviceIds.has(device.id)
                  ? 'match'
                  : 'no-match'
                : 'not-searching',
            )}
            dropState={getDropState(item)}
            activeSoftwareNames={activeSoftwareNames}
          />
        )}
      </div>
    )
  }

  return (
    // `isolate` makes the page its own "stacking context": all the layering numbers inside
    // it (the panels at 1000, the info button at 2000...) stay inside, so dialogs, which are
    // added outside the page, always appear above the whole page.
    <main className="isolate h-svh w-full overflow-hidden">
      <InfiniteCanvas
        initialView={initialView}
        focusRequest={focusRequest}
        toolbar={
          <ToolbarButtons
            isArranged={arrangeBox !== null}
            onToggleArrange={handleToggleArrange}
            onCloseAll={closeAllGroups}
          />
        }
      >
        {/* The canvas tells us which part of the world is on screen. We only draw the boxes
            inside it, which keeps things fast with hundreds of devices. */}
        {(visibleBounds) => {
          const visibleItems = animatedItems.filter((item) => isOnScreen(item, visibleBounds))

          // THE CONTAINERS. For each open group, a soft panel behind its cards. Each is
          // measured from the cards' CURRENT positions, so it fades in and out together with them.
          const cardBoxes = new Map<
            string,
            { left: number; top: number; right: number; bottom: number; opacity: number; count: number }
          >()
          for (const item of animatedItems) {
            if (item.kind !== 'device') continue
            const box = cardBoxes.get(item.groupId)
            cardBoxes.set(item.groupId, {
              left: Math.min(box?.left ?? Infinity, item.x),
              top: Math.min(box?.top ?? Infinity, item.y),
              right: Math.max(box?.right ?? -Infinity, item.x + item.width),
              bottom: Math.max(box?.bottom ?? -Infinity, item.y + item.height),
              opacity: Math.max(box?.opacity ?? 0, item.opacity),
              count: (box?.count ?? 0) + 1,
            })
          }
          const groupItemsById = new Map(
            animatedItems.filter((item) => item.kind === 'group').map((item) => [item.id, item]),
          )

          return (
            // `ref` lets animateNode find nodes.
            <div ref={canvasWrapperRef}>
              {/* The "Devices without assignments" container (made by Arrange), behind the group nodes. */}
              {arrangeBox && (
                <GroupBackdrop
                  title={`Devices without assignments · ${arrangeBox.count} groups`}
                  box={{ left: arrangeBox.x, top: arrangeBox.y, width: arrangeBox.width, height: arrangeBox.height }}
                  zIndex={0}
                  fadeInOnMount
                  onPointerDown={(event) => startDrag(event, { kind: 'arrange' })}
                />
              )}

              {/* Each open group's container, and the line joining it to its group node. */}
              {[...cardBoxes.entries()].map(([groupId, box]) => {
                const group = groupsById.get(groupId)
                const groupItem = groupItemsById.get(groupId)
                if (!group || !groupItem) return null
                const containerBox = {
                  left: box.left - containerPaddingSide,
                  top: box.top - containerPaddingTop,
                  right: box.right + containerPaddingSide,
                  bottom: box.bottom + containerPaddingBottom,
                }
                return (
                  <div key={groupId}>
                    <GroupConnector
                      node={{
                        left: groupItem.x,
                        top: groupItem.y,
                        right: groupItem.x + groupItem.width,
                        bottom: groupItem.y + groupItem.height,
                      }}
                      container={containerBox}
                      opacity={box.opacity}
                      zIndex={getLayer(groupId)}
                    />
                    <GroupBackdrop
                      title={`${group.name} · ${box.count} devices`}
                      salesOrders={getGroupSalesOrders(group)}
                      box={{
                        left: containerBox.left,
                        top: containerBox.top,
                        width: containerBox.right - containerBox.left,
                        height: containerBox.bottom - containerBox.top,
                      }}
                      opacity={box.opacity}
                      zIndex={getLayer(groupId)}
                      dropState={isDeviceDropTarget(groupId) ? 'valid' : 'none'}
                      onPointerDown={(event) => startDrag(event, { kind: 'container', groupId })}
                      // A device dropped on the empty part of the container is moved into this group.
                      onDragOver={(event) => {
                        if (!draggedDevice) return
                        event.preventDefault()
                        event.dataTransfer.dropEffect = 'move'
                        if (deviceDropGroupId !== groupId) setDeviceDropGroupId(groupId)
                      }}
                      onDragLeave={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                          setDeviceDropGroupId((current) => (current === groupId ? null : current))
                        }
                      }}
                      onDrop={(event) => {
                        if (!draggedDevice) return
                        event.preventDefault()
                        handleDeviceMove(groupId)
                        setDraggedDevice(null)
                        setDeviceDropGroupId(null)
                      }}
                    />
                  </div>
                )
              })}

              {visibleItems.map(renderItem)}
            </div>
          )
        }}
      </InfiniteCanvas>

      {/* The left column floats on top of the canvas (so it doesn't move with it): the
          software panel, which brings its own search box. */}
      <div className="pointer-events-none absolute top-4 bottom-4 left-4 z-[1000] flex w-80 flex-col gap-3 [&>*]:pointer-events-auto">
        <SoftwarePanel
          seatUsage={seatUsage}
          selectedSoftware={selectedSoftware}
          onToggleSelected={toggleSelectedSoftware}
          onClearSelection={clearSelectedSoftware}
          onHoverSoftware={setHoveredSoftware}
          onDragStartSoftware={setDraggedSoftware}
          onDragEndSoftware={handleDragEnd}
        />
      </div>

      {/* The right column: the canvas search box on top (`top-16` leaves room for the info
          button in the corner), and under it the staged changes with undo / redo / reset / review. */}
      <div className="pointer-events-none absolute top-16 right-4 bottom-4 z-[1000] flex w-80 flex-col gap-3 [&>*]:pointer-events-auto">
        <SearchBox
          value={canvasQuery}
          onChange={handleCanvasSearchChange}
          placeholder="Search groups, devices, serials…"
          countLabel={`${visibleGroups.length} ${visibleGroups.length === 1 ? 'group' : 'groups'}`}
        />
        <SummaryPanel
          operations={operations}
          canUndo={operations.length > 0}
          canRedo={redoStack.length > 0}
          onUndo={undo}
          onRedo={redo}
          onReset={reset}
          onReview={openReview}
          onShowOperation={showOperation}
          onRemoveOperation={removeOperation}
        />
      </div>

      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        operations={operations}
        seatsBefore={baseSeatUsage}
        seatsAfter={seatUsage}
        onApply={apply}
        onRemoveOperation={removeOperation}
      />

      <InfoExplainer title="How this was built">
        <p>
          <strong>The idea:</strong> an infinite canvas of 50 device groups (about 900 devices).
          Click a group and its devices open in a gray container (a grid of cards). Any number of
          groups can be open. On the left: the software seats still available per sales order,
          with its own search. On the right: the canvas search, and the changes you have staged.
        </p>
        <p>
          <strong>The folder:</strong> this experiment keeps everything in its own folder
          (<code>src/experiments/node-based-assignment/</code>): its data, its rules, its layout
          code and its components. Nothing is shared with other experiments, except shadcn's
          building blocks and this info button.
        </p>
        <p>
          <strong>The data:</strong> <code>data/assignment-data.ts</code> generates it with a loop
          and a "seeded" random number generator, so it's chaotic but identical on every reload.
          Sales orders own pools of seats; every assigned software remembers which pool its seat
          came from. Pool sizes are random on purpose: some are nearly full so you can hit the
          errors quickly. Change <code>numberOfGroups</code> or <code>randomSeed</code> at the top.
        </p>
        <p>
          <strong>Two things move independently:</strong> a group's <em>node</em> and its{' '}
          <em>container</em> each have their own position, kept in the page's state. Drag either
          one and only that one moves; the line joining them always stays, stretching and curving
          as needed (<code>group-connector.tsx</code> picks the sides that face each other).
          Movement shorter than a few pixels counts as a click, which opens or closes the group
          (<code>dragThreshold</code>). The group you touched last is drawn on top.
        </p>
        <p>
          <strong>Smart opening:</strong> <code>placement.ts</code>. When a group opens, its
          container starts at the ideal spot, right next to the node. If anything is in the way
          (another container, a group node, the "Devices without assignments" container), it tries
          spots further right and higher or lower, and takes the closest free one. So containers
          never overlap when they open, even if that means they end up away from their group, with
          the line to show where they belong. (Dragging can still make things overlap; that's up to you.)
        </p>
        <p>
          <strong>Arrange (bottom):</strong> gathers every group that has devices without
          software into one gray container titled "Devices without assignments", with the groups
          that have the most such devices first. The nodes glide into it, the container is placed to
          the right of everything, and the camera zooms to fit it. Drag the container and all the
          nodes inside move together (and their open containers with them); drag one node and only
          it moves. Press Arrange again and the groups go back where they were. Groups show, in
          amber, how many of their devices have no software.
        </p>
        <p>
          <strong>The layout and animation:</strong> <code>layout.ts</code> turns positions into
          boxes (a group's device grid is 4 rows tall, filled column by column; change{' '}
          <code>gridRows</code>). <code>use-animated-layout.ts</code> keeps animation simple: boxes
          that stay glide, new cards fade in, removed cards fade out. While you drag, it steps
          aside so things follow the pointer.
        </p>
        <p>
          <strong>Canvas search (top right):</strong> <code>search-groups.ts</code>. Every word you
          type must appear in a device's name, serial number, sales order or assigned software
          (remove the software part in that file if you only want the first three), or in a
          group's name. Groups that don't match are hidden, and the ones that do are lined up in a
          single column, one below the other, with the camera flying to the top of it, so you
          don't have to scrub around the canvas. Nothing opens by itself. In an open group, the
          devices that matched are outlined and the others fade back. Clear the search and every
          group glides back to where it was (the page remembers the old positions).
        </p>
        <p>
          <strong>Software search (left):</strong> a separate box that only filters the software
          list, by software name or sales order (id or customer). Entries that don't match are
          hidden.
        </p>
        <p>
          <strong>Staging:</strong> dropping software does not change anything for real. It adds a
          "staged change" to a list. What you see (cards, seat counts) is the real data with all
          staged changes replayed on top, shown as violet "Staged". <strong>Undo</strong> moves
          the last change to a redo list, <strong>redo</strong> moves it back, and{' '}
          <strong>reset</strong> empties the list (⌘Z and ⇧⌘Z work too).{' '}
          <strong>Review and apply</strong> shows every change and what it does to the seats;
          confirming makes them real, as "Pending". To cancel a single change without undoing
          everything after it, use the trash can on its row (in the panel or in the review
          window); a message offers to put it back.
        </p>
        <p>
          <strong>Hover and drag software:</strong> hovering a software title highlights every
          group and device that has it. Software rows use the browser's built-in drag and drop,
          and every node listens for drops. Green means the drop works, red means an error. The
          rules are in <code>assignment-rules.ts</code>: (1) the pool needs a free seat per device,
          and (2) no device may already have that software, even from another sales order.
        </p>
        <p>
          <strong>Dragging several titles:</strong> click software rows to tick them (a checkbox
          shows it, and a bar at the top of the panel counts them). Dragging any ticked row drags
          all the ticked ones; dragging an unticked row drags just that one. On drop, every title
          is checked against the rules on its own, as if the earlier ones were already staged
          (<code>checkBatch</code>). The ones that pass are staged as one change; the ones that
          break a rule are skipped, and a message says why for each.
        </p>
        <p>
          <strong>Moving devices:</strong> drag a device card onto another group. The group's node
          and container light up green as you hover, and dropping stages a "move", which appears in
          the summary as <em>device: from group → to group</em>. It's undoable and redoable like
          everything else, and "Review and apply" lists it. On screen, the card leaves its old
          container and appears at the end of the new group's. Software assignments stay with the
          device.
        </p>
        <p>
          <strong>Staying fast:</strong> only the boxes on screen are drawn
          (<code>isOnScreen</code>), seat counts are calculated once per change, and the side
          panels use <code>memo</code> so they don't redraw while the canvas animates.
        </p>
      </InfoExplainer>
    </main>
  )
}
