import type {
  CanvasChange,
  ComponentEntry,
  DesignNode,
  LayerRef,
  ThemeMode,
} from './types'

// ─────────────────────────────────────────────────────────────────────────────
// APPLY CHANGES: starting tree + list of edits → the tree we actually render.
//
// The starting trees in the workspace are never modified. Every render we copy the
// tree and replay the user's changes on top, in order (later changes win). This is
// cheap for trees this small, and it makes undo/redo and export very simple.
// ─────────────────────────────────────────────────────────────────────────────

// Does this change point at this layer of this variant?
// A change made with variant 'all' matches every variant.
function changeTargets(change: CanvasChange, componentName: string, variantName: string, layerKey: string) {
  if (change.kind === 'token') return false
  return (
    change.component === componentName &&
    change.layerKey === layerKey &&
    (change.variant === 'all' || change.variant === variantName)
  )
}

// Returns a COPY of one node (and its children) with every matching change applied.
function applyToNode(
  node: DesignNode,
  componentName: string,
  variantName: string,
  changes: CanvasChange[],
): DesignNode {
  const result: DesignNode = {
    ...node,
    props: { ...node.props },
    style: { ...node.style },
  }

  for (const change of changes) {
    if (!changeTargets(change, componentName, variantName, node.layerKey)) continue

    if (change.kind === 'style') {
      // null = reset: put back the class this layer started with (or none, if it had none).
      const startingClass = node.style?.[change.property]
      const newClass = change.value ?? startingClass
      if (newClass === undefined) delete result.style![change.property]
      else result.style![change.property] = newClass
    } else if (change.kind === 'prop') {
      // null = reset: put back the prop value this layer started with (or none).
      const startingValue = node.props?.[change.prop]
      const newValue = change.value ?? startingValue
      if (newValue === undefined) delete result.props![change.prop]
      else result.props![change.prop] = newValue
    } else if (change.kind === 'text') {
      result.text = change.value
    } else if (change.kind === 'hidden') {
      result.hidden = change.value
    }
  }

  if (node.children) {
    result.children = node.children.map((child) => applyToNode(child, componentName, variantName, changes))
  }
  return result
}

// The tree to render for one variant of one component.
export function getRenderedTree(entry: ComponentEntry, variantName: string, changes: CanvasChange[]): DesignNode | null {
  const variant = entry.variants.find((candidate) => candidate.name === variantName)
  if (!variant) return null
  return applyToNode(variant.tree, entry.name, variantName, changes)
}

// Finds one node inside a tree by its layerKey (searches children too).
export function findNode(tree: DesignNode, layerKey: string): DesignNode | null {
  if (tree.layerKey === layerKey) return tree
  for (const child of tree.children ?? []) {
    const found = findNode(child, layerKey)
    if (found) return found
  }
  return null
}

// The node that directly contains the layer with this layerKey (null for the root).
export function findParent(tree: DesignNode, layerKey: string): DesignNode | null {
  for (const child of tree.children ?? []) {
    if (child.layerKey === layerKey) return tree
    const found = findParent(child, layerKey)
    if (found) return found
  }
  return null
}

// The current (edited) node a LayerRef points at — what the right panel shows.
export function getRenderedNode(entries: ComponentEntry[], layer: LayerRef, changes: CanvasChange[]): DesignNode | null {
  const entry = entries.find((candidate) => candidate.name === layer.component)
  if (!entry) return null
  const tree = getRenderedTree(entry, layer.variant, changes)
  return tree ? findNode(tree, layer.layerKey) : null
}

// The original (unedited) node — used to show "from → to" in export.
export function getStartingNode(entries: ComponentEntry[], layer: LayerRef): DesignNode | null {
  const entry = entries.find((candidate) => candidate.name === layer.component)
  const variant = entry?.variants.find((candidate) => candidate.name === layer.variant)
  return variant ? findNode(variant.tree, layer.layerKey) : null
}

// Token edits for one mode, as { '--primary': '#4f46e5' }, ready to put in a style attribute.
// A null value (reset) removes an earlier edit of the same variable.
export function getTokenOverrides(changes: CanvasChange[], mode: ThemeMode): Record<string, string> {
  const overrides: Record<string, string> = {}
  for (const change of changes) {
    if (change.kind !== 'token' || change.mode !== mode) continue
    if (change.value === null) delete overrides[change.variable]
    else overrides[change.variable] = change.value
  }
  return overrides
}
