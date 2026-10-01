import { ChevronRightIcon, FolderIcon } from 'lucide-react'
import type { DeviceGroup } from '../data/assignment-data'
import { getNodeFadeClasses, getNodeOutlineClasses, type DropState, type Emphasis } from './node-styles'

// A device group on the canvas. Click it to show or hide its devices; drop software
// on it to assign that software to every device in the group.
// The canvas decides where it goes and how big it is (see layout.ts);
// this file only decides what it looks like.
export function GroupNode({
  group,
  isExpanded,
  onToggle,
  emphasis,
  dropState,
  appliedCount,
  appliedSoftware,
  searchMatchCount,
  unassignedCount,
}: {
  group: DeviceGroup
  isExpanded: boolean
  onToggle: () => void
  emphasis: Emphasis
  dropState: DropState
  appliedCount: number // how many of its devices have the software being hovered / dragged
  appliedSoftware: string | null // the name of that software (null if none is active)
  searchMatchCount: number | null // while searching: how many of its devices match (null = not searching)
  unassignedCount: number // how many of its devices have no software at all
}) {
  return (
    <button
      type="button"
      data-canvas-node // tells the canvas not to start panning when this is pressed
      onClick={onToggle}
      aria-expanded={isExpanded}
      // The page lets you drag this node around (see node-based-assignment.tsx); a click without
      // moving opens or closes it. `hover:-translate-y-0.5` is the little lift on hover.
      className={`relative flex size-full cursor-grab items-center gap-3 rounded-2xl bg-card px-4 text-left shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${getNodeOutlineClasses(emphasis, dropState, isExpanded)} ${getNodeFadeClasses(emphasis)}`}
    >
      {/* The folder icon in a soft tinted square. */}
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <FolderIcon className="size-5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{group.name}</span>
        <span className="block truncate text-sm text-muted-foreground">
          {group.devices.length} {group.devices.length === 1 ? 'device' : 'devices'}
          {/* In amber, how many devices have no software yet (the Arrange menu can sort by this). */}
          {unassignedCount > 0 && <span className="text-amber-600"> · {unassignedCount} without software</span>}
        </span>
      </span>

      {/* The arrow turns to point down when the group is open. */}
      <ChevronRightIcon
        className={`size-5 shrink-0 text-muted-foreground transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}
      />

      {/* A little badge above the node when a software is active: how many devices have it. */}
      {appliedSoftware && appliedCount > 0 && (
        <span className="absolute -top-3 right-4 rounded-full bg-blue-500 px-2.5 py-0.5 text-xs font-medium text-white shadow-md">
          {appliedCount} with {appliedSoftware}
        </span>
      )}

      {/* While searching: how many of the group's devices match (only if some do). */}
      {searchMatchCount !== null && searchMatchCount > 0 && (
        <span className="absolute -top-3 left-4 rounded-full bg-foreground px-2.5 py-0.5 text-xs font-medium text-background shadow-md">
          {searchMatchCount} {searchMatchCount === 1 ? 'match' : 'matches'}
        </span>
      )}
    </button>
  )
}
