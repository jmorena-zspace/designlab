// The look of the outlines on group and device nodes, shared by both node files.
//
// Three things can change how a node looks:
//   emphasis  - 'highlighted' (matches the software being hovered / dragged),
//               'dimmed' (doesn't match, so it fades back), or 'normal'
//   dropState - while dragging software over the node: 'valid' (the drop would work,
//               green) or 'invalid' (it would be an error, red)
//   isExpanded - a group that is open gets a stronger outline

export type Emphasis = 'normal' | 'highlighted' | 'dimmed'
export type DropState = 'none' | 'valid' | 'invalid'

// TWEAK: the outline classes for each state. The drop colors win over the highlight.
export function getNodeOutlineClasses(emphasis: Emphasis, dropState: DropState, isExpanded = false): string {
  if (dropState === 'valid') return 'ring-2 ring-green-500 bg-green-50 shadow-lg'
  if (dropState === 'invalid') return 'ring-2 ring-red-500 bg-red-50 shadow-lg'
  if (emphasis === 'highlighted') return 'ring-2 ring-blue-500 shadow-[0_0_0_5px_rgb(59_130_246/0.18)]'
  if (isExpanded) return 'ring-2 ring-primary/50'
  return 'ring-1 ring-foreground/10'
}

// Dimmed nodes fade back. `transition-opacity` makes the fade smooth.
export function getNodeFadeClasses(emphasis: Emphasis): string {
  return `transition-opacity duration-200 ${emphasis === 'dimmed' ? 'opacity-35' : ''}`
}
