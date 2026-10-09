import { useState, type KeyboardEvent } from 'react'
import { ChevronRight, Component, Eye, EyeOff, Frame, Type } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isSameLayer, type CanvasChange, type ComponentEntry, type DesignNode, type LayerRef } from '../types'
import { getRenderedTree } from '../apply-changes'
import { iconButtonClass, iconSize, iconStroke, layerIndentPx, rowHeightClass } from './controls/panel-styles'

// ─────────────────────────────────────────────────────────────────────────────
// LAYER TREE: the layers of ONE variant of a component, as an indented list
// (like Figma's Layers panel).
//
// - Each level is pushed right by layerIndentPx (see panel-styles.ts).
// - The chevron collapses a layer's children.
// - The icon tells the layer type: frame (a plain box), component, or text.
// - Hovering a row outlines that layer on the canvas (onHover), clicking selects it.
// - Hidden layers are dimmed; the eye button (shown on hover) hides/shows a layer.
// - Keyboard: ↑/↓ move between rows, → opens a layer, ← closes it, Enter selects.
// ─────────────────────────────────────────────────────────────────────────────

type LayerTreeProps = {
  entry: ComponentEntry
  variantName: string
  changes: CanvasChange[]
  selection: LayerRef | null
  hovered: LayerRef | null
  baseIndent: number // px of left padding for the top level (so it lines up under its parent row)
  onSelect: (layer: LayerRef | null) => void
  onHover: (layer: LayerRef | null) => void
  onToggleHidden: (layer: LayerRef) => void
}

export function LayerTree(props: LayerTreeProps) {
  const { entry, variantName, changes } = props
  // layerKeys whose children are folded away. Everything starts open.
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set())

  // The tree with edits applied, so renamed text and hidden layers show correctly.
  const tree = getRenderedTree(entry, variantName, changes)
  if (!tree) return null

  function toggleCollapsed(layerKey: string) {
    // Sets in React state must be copied, not changed in place, so React notices.
    const next = new Set(collapsedKeys)
    if (next.has(layerKey)) next.delete(layerKey)
    else next.add(layerKey)
    setCollapsedKeys(next)
  }

  // Draws one row, then (if open) its children one level deeper. This function
  // calls itself for the children; that's called recursion, and it's the natural
  // way to walk a tree of any depth.
  function renderLayer(node: DesignNode, depth: number, parentHidden: boolean) {
    const isCollapsed = collapsedKeys.has(node.layerKey)
    const isHidden = parentHidden || node.hidden === true
    return (
      <div key={node.layerKey} role="none">
        <LayerRow
          {...props}
          node={node}
          depth={depth}
          isHidden={isHidden}
          isCollapsed={isCollapsed}
          onToggleCollapsed={() => toggleCollapsed(node.layerKey)}
        />
        {!isCollapsed && node.children?.map((child) => renderLayer(child, depth + 1, isHidden))}
      </div>
    )
  }

  return (
    <div role="tree" aria-label={`${entry.name} layers`}>
      {renderLayer(tree, 0, false)}
    </div>
  )
}

// ── One row ──────────────────────────────────────────────────────────────────
type LayerRowProps = LayerTreeProps & {
  node: DesignNode
  depth: number
  isHidden: boolean
  isCollapsed: boolean
  onToggleCollapsed: () => void
}

function LayerRow({
  entry,
  variantName,
  selection,
  hovered,
  baseIndent,
  onSelect,
  onHover,
  onToggleHidden,
  node,
  depth,
  isHidden,
  isCollapsed,
  onToggleCollapsed,
}: LayerRowProps) {
  const layer: LayerRef = { component: entry.name, variant: variantName, layerKey: node.layerKey }
  const isSelected = isSameLayer(selection, layer)
  const isHoveredOnCanvas = isSameLayer(hovered, layer)
  const hasChildren = (node.children?.length ?? 0) > 0

  // Pick the icon: text, a real component from the workspace, or a plain box.
  const TypeIcon = node.type === 'text' ? Type : node.type in entry.render ? Component : Frame

  // Keyboard support, the way tree lists usually work.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      onSelect(layer)
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      // Find every visible row in this tree, then focus the one after/before us.
      const tree = event.currentTarget.closest('[role="tree"]')
      const rows = Array.from(tree?.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? [])
      const nextIndex = rows.indexOf(event.currentTarget) + (event.key === 'ArrowDown' ? 1 : -1)
      rows[nextIndex]?.focus()
    } else if (event.key === 'ArrowRight' && hasChildren && isCollapsed) {
      onToggleCollapsed()
    } else if (event.key === 'ArrowLeft' && hasChildren && !isCollapsed) {
      onToggleCollapsed()
    } else {
      return // not our key: let it through
    }
    // We handled it: no page scrolling, and keep it from the page's shortcuts.
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <div
      role="treeitem"
      aria-selected={isSelected}
      aria-expanded={hasChildren ? !isCollapsed : undefined}
      tabIndex={0}
      onClick={() => onSelect(layer)}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => onHover(layer)}
      onMouseLeave={() => onHover(null)}
      className={cn(
        rowHeightClass,
        'group/layer flex cursor-default items-center gap-1 rounded-md pr-1 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40',
        isSelected ? 'bg-muted font-medium text-foreground' : 'text-foreground/85 hover:bg-muted/60',
        !isSelected && isHoveredOnCanvas && 'bg-muted/60',
      )}
      style={{ paddingLeft: baseIndent + depth * layerIndentPx }}
    >
      {/* Chevron (only for layers with children). The empty slot keeps names aligned. */}
      <span className="flex size-4 shrink-0 items-center justify-center">
        {hasChildren && (
          <button
            type="button"
            aria-label={isCollapsed ? 'Expand layer' : 'Collapse layer'}
            onClick={(event) => {
              event.stopPropagation() // don't also select the row
              onToggleCollapsed()
            }}
            className="flex size-4 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronRight
              size={iconSize - 3}
              strokeWidth={iconStroke}
              className={cn('transition-transform duration-150', !isCollapsed && 'rotate-90')}
            />
          </button>
        )}
      </span>

      <TypeIcon
        size={iconSize - 1}
        strokeWidth={iconStroke}
        className={cn('shrink-0 text-muted-foreground', isHidden && 'opacity-50')}
      />
      <span className={cn('min-w-0 flex-1 truncate', isHidden && 'text-muted-foreground/60')}>{node.name}</span>

      {/* Eye: always visible on hidden layers, otherwise only while hovering the row. */}
      <button
        type="button"
        aria-label={node.hidden ? `Show ${node.name}` : `Hide ${node.name}`}
        onClick={(event) => {
          event.stopPropagation()
          onToggleHidden(layer)
        }}
        className={cn(
          iconButtonClass,
          'size-5',
          node.hidden ? 'opacity-100' : 'opacity-0 group-hover/layer:opacity-100 focus-visible:opacity-100',
        )}
      >
        {node.hidden ? (
          <EyeOff size={iconSize - 2} strokeWidth={iconStroke} />
        ) : (
          <Eye size={iconSize - 2} strokeWidth={iconStroke} />
        )}
      </button>
    </div>
  )
}
