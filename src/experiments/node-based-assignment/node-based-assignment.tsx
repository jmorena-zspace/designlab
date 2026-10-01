import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { toast } from 'sonner'
import { arrangeGroups, countUnassignedDevices, type ArrangeMode, type ArrangementLabel } from './arrange'
import {
  assignSoftware,
  checkAssignment,
  commitStagedSoftware,
  type DraggedSoftware,
  type DropTarget,
  type StagedOperation,
} from './assignment-rules'
import { ArrangeMenu } from './components/arrange-menu'
import { DeviceNode } from './components/device-node'
import { GroupBackdrop } from './components/group-backdrop'
import { GroupNode } from './components/group-node'
import { InfiniteCanvas, type FocusRequest, type WorldBounds } from './components/infinite-canvas'
import type { DropState, Emphasis } from './components/node-styles'
import { ReviewDialog } from './components/review-dialog'
import { SearchBox } from './components/search-box'
import { SoftwarePanel } from './components/software-panel'
import { SummaryPanel } from './components/summary-panel'
import { buildSeatUsage, initialDeviceGroups } from './data/assignment-data'
import {
  backdropPaddingBottom,
  backdropPaddingSide,
  backdropPaddingTop,
  computeLayout,
  getGroupFootprint,
  groupNodeHeight,
  groupNodeWidth,
  type LayoutItem,
  type Position,
} from './layout'
import { deviceMatches, groupMatches } from './search-groups'
import { useAnimatedLayout, type AnimatedItem } from './use-animated-layout'
import { InfoExplainer } from '@/components/info/info-explainer'

// TWEAK: where the canvas starts. x and y shift the world (the left panel covers
// about 340px, so we start the content to its right); scale is the zoom (1 = 100%).
const initialView = { x: 380, y: 140, scale: 0.8 }
// TWEAK: how far (in screen pixels) you must move the pointer before pressing on a group
// counts as a DRAG instead of a click.
const dragThreshold = 4

// Is any part of this box inside the visible part of the world?
function isOnScreen(item: LayoutItem, bounds: WorldBounds): boolean {
  return (
    item.x < bounds.right &&
    item.x + item.width > bounds.left &&
    item.y < bounds.bottom &&
    item.y + item.height > bounds.top
  )
}

// Experiment: Node based assignment
// An infinite canvas of 50 device groups. Click a group to open its devices (any number
// of groups can be open; each shows its devices in a grid). Drag groups around, or use
// the Arrange menu. The search box on the right hides groups that don't match; the one
// on the left filters the software list. Hover software to see where it's used, and
// drag it onto a group or a device to STAGE an assignment. Staged changes collect in the
// summary panel on the right, where you can undo / redo / reset them, or review and apply them.
export default function NodeBasedAssignmentExperiment() {
  // ---------- State: everything that can change on this page ----------
  // The groups as they are for real (applied). Staged changes are NOT in here.
  const [baseGroups, setBaseGroups] = useState(initialDeviceGroups)
  // The staged changes, oldest first. "Undo" takes the last one off this list and puts
  // it on the redo list; "Redo" moves it back.
  const [operations, setOperations] = useState<StagedOperation[]>([])
  const [redoStack, setRedoStack] = useState<StagedOperation[]>([])
  // Where each group sits on the canvas. Dragging a group changes its entry here; the
  // Arrange menu replaces all of them.
  const [groupPositions, setGroupPositions] = useState<Record<string, Position>>(
    () => arrangeGroups(initialDeviceGroups, 'default', []).positions,
  )
  // The column headings the last arrangement put on the canvas (for example the sales orders).
  const [arrangementLabels, setArrangementLabels] = useState<ArrangementLabel[]>([])
  // The ids of the groups that are open (any number can be).
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([])
  // Group ids from least to most recently used. The last one is drawn on top of the others.
  const [frontOrder, setFrontOrder] = useState<string[]>([])
  // True while a group is being dragged around (the animation steps aside so it follows the pointer).
  const [isDragging, setIsDragging] = useState(false)
  // What's typed in the canvas search box (top right).
  const [canvasQuery, setCanvasQuery] = useState('')
  // The software title the pointer is over in the left panel (null = none).
  const [hoveredSoftware, setHoveredSoftware] = useState<string | null>(null)
  // The software being dragged right now (null = not dragging).
  const [draggedSoftware, setDraggedSoftware] = useState<DraggedSoftware | null>(null)
  // The id of the node the dragged software is currently over.
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  // Whether the "Review and apply" window is open.
  const [reviewOpen, setReviewOpen] = useState(false)
  // A request for the canvas camera to fly somewhere.
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null)

  const canvasWrapperRef = useRef<HTMLDivElement>(null)
  const nextOperationId = useRef(1)
  // A drag ends with a "click" event; this flag makes the page ignore that one click.
  const suppressNextClick = useRef(false)
  // The latest positions, readable from functions that must not change on every drag step.
  const groupPositionsRef = useRef(groupPositions)
  useEffect(() => {
    groupPositionsRef.current = groupPositions
  }, [groupPositions])

  // ---------- Derived data: worked out from the state above ----------
  // The groups AS THEY WOULD BE once the staged changes are applied. Every staged change
  // is replayed on top of the real groups. Everything on screen uses these, so staged
  // software shows up on the cards (as "Staged") and counts against the seats.
  const groups = useMemo(
    () =>
      operations.reduce(
        (current, operation) => assignSoftware(current, operation.dragged, operation.deviceIds, 'Staged'),
        baseGroups,
      ),
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

  // The software to highlight: the one being dragged, or else the one being hovered.
  const activeSoftware = draggedSoftware?.software ?? hoveredSoftware
  // For each group, how many of its devices have the active software (for highlights).
  const appliedCountByGroup = useMemo(() => {
    const counts = new Map<string, number>()
    if (activeSoftware === null) return counts
    for (const group of groups) {
      counts.set(
        group.id,
        group.devices.filter((device) => device.software.some((assigned) => assigned.name === activeSoftware)).length,
      )
    }
    return counts
  }, [groups, activeSoftware])

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
  // Where everything SHOULD be. `useMemo` only recalculates it when the groups, the open
  // groups or the positions change (otherwise the animation below would restart on every render).
  const targetLayout = useMemo(
    () => computeLayout(visibleGroups, openGroupIds, groupPositions),
    [visibleGroups, openGroupIds, groupPositions],
  )
  // Where everything IS right now. It fades and glides toward the target, except while
  // you drag a group, when it just follows the pointer.
  const animatedItems = useAnimatedLayout(targetLayout, isDragging)

  // How far forward each group is drawn. Groups used more recently are in front.
  // (A group takes 3 layers: the backdrop, the group node, and the device cards.)
  const getLayer = (groupId: string) => 3 * (frontOrder.indexOf(groupId) + 1)
  const bringToFront = (groupId: string) => {
    setFrontOrder((current) => [...current.filter((id) => id !== groupId), groupId])
  }

  // ---------- Camera ----------
  // Flies the camera to a group (aiming at the middle of the group and, if open, its grid).
  const flyToGroup = useCallback((groupId: string, includeGrid: boolean) => {
    const group = groupsById.get(groupId)
    const position = groupPositionsRef.current[groupId]
    if (!group || !position) return
    const width = getGroupFootprint(group, includeGrid).width
    setFocusRequest({ id: Date.now(), x: position.x + width / 2, y: position.y + groupNodeHeight / 2 })
  }, [groupsById])

  // ---------- Actions ----------
  // Clicking a group opens it, or closes it if it was open. (Ignored if the click was
  // really the end of a drag.)
  const toggleGroup = (groupId: string) => {
    if (suppressNextClick.current) return
    setExpandedGroupIds((current) =>
      current.includes(groupId) ? current.filter((id) => id !== groupId) : [...current, groupId],
    )
    bringToFront(groupId)
  }

  // Typing in the canvas search hides the groups that don't match (it never opens any),
  // and flies to the first group that is left.
  const handleCanvasSearchChange = (newQuery: string) => {
    setCanvasQuery(newQuery)
    const nextVisible = newQuery.trim() ? groups.filter((group) => groupMatches(group, newQuery)) : groups
    const firstGroup = nextVisible[0]
    const position = firstGroup ? groupPositions[firstGroup.id] : undefined
    if (position) {
      setFocusRequest({ id: Date.now(), x: position.x + groupNodeWidth / 2, y: position.y + groupNodeHeight / 2 })
    }
  }

  // THE ARRANGE MENU. Works out new positions for every group, then flies the camera so
  // the whole arrangement fits on screen.
  const handleArrange = (mode: ArrangeMode) => {
    const arrangement = arrangeGroups(groups, mode, expandedGroupIds)
    setGroupPositions(arrangement.positions)
    setArrangementLabels(arrangement.labels)

    // The area the arrangement covers, so the camera can fit it.
    let left = Infinity
    let top = Infinity
    let right = -Infinity
    let bottom = -Infinity
    for (const group of groups) {
      const position = arrangement.positions[group.id]
      const footprint = getGroupFootprint(group, expandedGroupIds.includes(group.id))
      left = Math.min(left, position.x)
      top = Math.min(top, position.y)
      right = Math.max(right, position.x + footprint.width)
      bottom = Math.max(bottom, position.y + footprint.height)
    }
    const labelSpace = arrangement.labels.length > 0 ? 84 : 0
    setFocusRequest({
      id: Date.now(),
      x: (left + right) / 2,
      y: (top - labelSpace + bottom) / 2,
      fit: { width: right - left, height: bottom - top + labelSpace },
    })
  }

  // DRAGGING A GROUP. Pressing on a group node (or its container) and moving the
  // pointer moves the whole group, including its grid. We listen on the whole window
  // while the button is down, so the drag keeps working even if the pointer is fast.
  const startGroupDrag = (event: React.PointerEvent, groupId: string) => {
    if (event.button !== 0) return
    bringToFront(groupId)

    // The canvas zoom, read from the world's CSS transform: the movement on screen has
    // to be divided by it to get the movement in the world.
    const world = (event.currentTarget as HTMLElement).closest('[data-world]') as HTMLElement
    const scale = new DOMMatrixReadOnly(getComputedStyle(world).transform).a
    const origin = groupPositionsRef.current[groupId] ?? { x: 0, y: 0 }
    const startX = event.clientX
    const startY = event.clientY
    let hasMoved = false

    const handleMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX
      const dy = moveEvent.clientY - startY
      // Tiny movements are still a click, not a drag.
      if (!hasMoved && Math.hypot(dx, dy) < dragThreshold) return
      if (!hasMoved) {
        hasMoved = true
        setIsDragging(true)
      }
      setGroupPositions((current) => ({
        ...current,
        [groupId]: { x: origin.x + dx / scale, y: origin.y + dy / scale },
      }))
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

  // Software was dropped on a node: check the rules, then either show the error or
  // STAGE the change (it isn't applied until "Review and apply").
  const handleDrop = (item: LayoutItem) => {
    const target = getDropTarget(item)
    if (!draggedSoftware || !target) return

    const check = checkAssignment(seatUsage, draggedSoftware, target)
    if (!check.ok) {
      toast.error(check.title, { description: check.message, position: 'top-center' })
      animateNode(item.id, 'shake')
      return
    }

    const newOperation: StagedOperation = {
      id: nextOperationId.current++,
      dragged: draggedSoftware,
      targetKind: target.kind,
      targetId: item.id,
      targetName: target.kind === 'group' ? target.group.name : target.device.name,
      groupId: item.groupId,
      deviceIds: check.devices.map((device) => device.id),
    }
    setOperations([...operations, newOperation])
    setRedoStack([]) // a new change makes the old "redo" history meaningless
    // Open the group so you can see the result.
    setExpandedGroupIds((current) => (current.includes(item.groupId) ? current : [...current, item.groupId]))
    bringToFront(item.groupId)
    toast.success(`${draggedSoftware.software} staged`, {
      description: `For ${check.devices.length} ${check.devices.length === 1 ? 'device' : 'devices'}. Review and apply when ready.`,
      position: 'top-center',
    })
    animateNode(item.id, 'pop')
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
      setExpandedGroupIds((current) => (current.includes(operation.groupId) ? current : [...current, operation.groupId]))
      setFrontOrder((current) => [...current.filter((id) => id !== operation.groupId), operation.groupId])
      flyToGroup(operation.groupId, true)
    },
    [visibleGroups, flyToGroup],
  )

  const openReview = useCallback(() => setReviewOpen(true), [])
  const handleDragEnd = useCallback(() => {
    setDraggedSoftware(null)
    setDropTargetId(null)
    setHoveredSoftware(null)
  }, [])

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
  const getEmphasis = (hasActiveSoftware: boolean, searchState: 'match' | 'no-match' | 'not-searching'): Emphasis => {
    // While dragging software we don't dim anything, so the places you can drop stay clear.
    const dimmedBySoftware = activeSoftware !== null && !draggedSoftware && !hasActiveSoftware
    if (dimmedBySoftware || searchState === 'no-match') return 'dimmed'
    if ((activeSoftware !== null && hasActiveSoftware) || searchState === 'match') return 'highlighted'
    return 'normal'
  }

  // While dragging software over a node: green if the drop would work, red if it would be an error.
  const getDropState = (item: LayoutItem): DropState => {
    if (!draggedSoftware || dropTargetId !== item.id) return 'none'
    const target = getDropTarget(item)
    if (!target) return 'none'
    return checkAssignment(seatUsage, draggedSoftware, target).ok ? 'valid' : 'invalid'
  }

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
        // Pressing a group node can start dragging the group; pressing a device card
        // just brings its group to the front.
        onPointerDown={(event) =>
          item.kind === 'group' ? startGroupDrag(event, item.groupId) : bringToFront(item.groupId)
        }
        // DROPPING SOFTWARE. These three handlers make the box a drop target:
        // - dragover: "yes, you may drop here" (preventDefault says yes) and remember it;
        // - dragleave: forget it when the pointer moves out;
        // - drop: do the assignment.
        onDragOver={(event) => {
          if (!draggedSoftware) return
          event.preventDefault()
          event.dataTransfer.dropEffect = 'copy'
          if (dropTargetId !== item.id) setDropTargetId(item.id)
        }}
        onDragLeave={(event) => {
          const stillInside = event.currentTarget.contains(event.relatedTarget as Node | null)
          if (!stillInside) setDropTargetId((current) => (current === item.id ? null : current))
        }}
        onDrop={(event) => {
          event.preventDefault()
          setDropTargetId(null)
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
            appliedSoftware={activeSoftware}
            searchMatchCount={isSearching ? (searchMatches.matchCountByGroup.get(group.id) ?? 0) : null}
            unassignedCount={countUnassignedDevices(group)}
          />
        )}
        {item.kind === 'device' && device && (
          <DeviceNode
            device={device}
            emphasis={getEmphasis(
              device.software.some((assigned) => assigned.name === activeSoftware),
              // Devices are only marked when the search matched at least one device in this group
              // (if it only matched the group's name, there is nothing to single out).
              isSearching && (searchMatches.matchCountByGroup.get(group.id) ?? 0) > 0
                ? searchMatches.matchingDeviceIds.has(device.id)
                  ? 'match'
                  : 'no-match'
                : 'not-searching',
            )}
            dropState={getDropState(item)}
            activeSoftware={activeSoftware}
          />
        )}
      </div>
    )
  }

  return (
    <main className="h-svh w-full overflow-hidden">
      <InfiniteCanvas
        initialView={initialView}
        focusRequest={focusRequest}
        toolbar={<ArrangeMenu onArrange={handleArrange} onCloseAll={() => setExpandedGroupIds([])} />}
      >
        {/* The canvas tells us which part of the world is on screen. We only draw the boxes
            inside it, which keeps things fast with hundreds of devices. */}
        {(visibleBounds) => {
          const visibleItems = animatedItems.filter((item) => isOnScreen(item, visibleBounds))

          // THE CONTAINERS. For each open group, a soft panel behind its grid of cards, joined
          // to the group node by a short line. Each is measured from the cards' CURRENT
          // positions, so it fades in and out together with them.
          const gridBoxes = new Map<string, { left: number; top: number; right: number; bottom: number; opacity: number }>()
          for (const item of animatedItems) {
            if (item.kind !== 'device') continue
            const box = gridBoxes.get(item.groupId)
            gridBoxes.set(item.groupId, {
              left: Math.min(box?.left ?? Infinity, item.x),
              top: Math.min(box?.top ?? Infinity, item.y),
              right: Math.max(box?.right ?? -Infinity, item.x + item.width),
              bottom: Math.max(box?.bottom ?? -Infinity, item.y + item.height),
              opacity: Math.max(box?.opacity ?? 0, item.opacity),
            })
          }
          const groupItemsById = new Map(
            animatedItems.filter((item) => item.kind === 'group').map((item) => [item.id, item]),
          )

          return (
            // `ref` lets animateNode find nodes.
            <div ref={canvasWrapperRef}>
              {/* Column headings from the last arrangement (like the sales order of each column). */}
              {arrangementLabels.map((label) => (
                <div key={label.id} className="pointer-events-none absolute" style={{ left: label.x, top: label.y, width: groupNodeWidth }}>
                  <p className="truncate text-xl font-semibold">{label.title}</p>
                  <p className="truncate text-sm text-muted-foreground">{label.subtitle}</p>
                </div>
              ))}

              {[...gridBoxes.entries()].map(([groupId, box]) => {
                const group = groupsById.get(groupId)
                const groupItem = groupItemsById.get(groupId)
                if (!group || !groupItem) return null
                return (
                  <GroupBackdrop
                    key={groupId}
                    title={`${group.name} · ${group.devices.length} devices`}
                    box={{
                      left: box.left - backdropPaddingSide,
                      top: box.top - backdropPaddingTop,
                      width: box.right - box.left + backdropPaddingSide * 2,
                      height: box.bottom - box.top + backdropPaddingTop + backdropPaddingBottom,
                    }}
                    groupNodeRight={groupItem.x + groupItem.width}
                    lineY={groupItem.y + groupItem.height / 2}
                    opacity={box.opacity}
                    zIndex={getLayer(groupId)}
                    onPointerDown={(event) => startGroupDrag(event, groupId)}
                  />
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
        />
      </div>

      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        operations={operations}
        seatsBefore={baseSeatUsage}
        seatsAfter={seatUsage}
        onApply={apply}
      />

      <InfoExplainer title="How this was built">
        <p>
          <strong>The idea:</strong> an infinite canvas of 50 device groups (about 900 devices).
          Click a group and its devices open in a grid to its right, joined to the group by a line.
          Any number of groups can be open, and you can drag them anywhere. On the left: the
          software seats still available per sales order, with its own search. On the right: the
          canvas search, and the changes you have staged.
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
          <strong>Positions and dragging:</strong> every group has its own x / y position, kept in
          the page's state. Pressing on a group node (or its container) and moving the pointer
          changes that position, and because the device grid is placed relative to its group, the
          whole thing moves together. Movement shorter than a few pixels counts as a click, which
          opens or closes the group (<code>dragThreshold</code>). The group you touched last is
          drawn on top.
        </p>
        <p>
          <strong>Arrange menu (bottom):</strong> <code>arrange.ts</code> works out new positions
          in columns. <em>By sales order</em> makes one column per sales order (the one most of a
          group's devices belong to), with the groups that have the most devices without any
          software first. <em>By devices without software</em> makes columns for 7+, 5–6, 3–4
          and 0–2. Open groups get extra room for their grid. Everything glides to its new
          spot, and the camera zooms out to show it all. Groups show how many of their devices
          have no software, in amber.
        </p>
        <p>
          <strong>The layout and animation:</strong> <code>layout.ts</code> turns positions into
          boxes (the device grid is 4 rows tall, filled column by column; change{' '}
          <code>gridRows</code>). <code>use-animated-layout.ts</code> keeps animation simple: boxes
          that stay glide, new cards fade in, removed cards fade out. While you drag, it steps
          aside so the group follows the pointer.
        </p>
        <p>
          <strong>Canvas search (top right):</strong> <code>search-groups.ts</code>. Every word you
          type must appear in a device's name, serial number, sales order or assigned software
          (remove the software part in that file if you only want the first three), or in a
          group's name. Groups that don't match are hidden; nothing opens by itself. In an open
          group, the devices that matched are outlined and the others fade back.
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
          confirming makes them real, as "Pending".
        </p>
        <p>
          <strong>Hover and drag software:</strong> hovering a software title highlights every
          group and device that has it. Software rows use the browser's built-in drag and drop,
          and every node listens for drops. Green means the drop works, red means an error. The
          rules are in <code>assignment-rules.ts</code>: (1) the pool needs a free seat per device,
          and (2) no device may already have that software, even from another sales order.
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
