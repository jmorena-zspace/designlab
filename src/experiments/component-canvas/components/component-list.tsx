import { useState, type ReactNode } from 'react'
import { ChevronRight, Component } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ComponentEntry, LeftPanelProps } from '../types'
import { iconSize, iconStroke, panelPaddingClass, rowHeightClass } from './controls/panel-styles'
import { LayerTree } from './layer-tree'

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT LIST: the "Components" tab of the left panel.
//
// Components are grouped by their `group` (Actions, Inputs…). Clicking a row
// moves the camera to that component (onFocusComponent) and opens it to show its
// layers. The component that holds the current selection opens by itself.
// ─────────────────────────────────────────────────────────────────────────────

// TWEAK: ungroupedTitle — heading for components that have no `group`
const ungroupedTitle = 'Components'

// TWEAK: layerTreeIndent — left padding (px) of the first layer level under a component row
const layerTreeIndent = 14

// Groups entries by name, keeping the order in which groups first appear.
function groupComponents(components: ComponentEntry[]) {
  const groups = new Map<string, ComponentEntry[]>()
  for (const entry of components) {
    const groupName = entry.group ?? ungroupedTitle
    groups.set(groupName, [...(groups.get(groupName) ?? []), entry])
  }
  return [...groups.entries()]
}

type ComponentListProps = Pick<
  LeftPanelProps,
  'workspace' | 'changes' | 'selection' | 'hovered' | 'onSelect' | 'onHover' | 'onFocusComponent' | 'onToggleHidden'
>

export function ComponentList(props: ComponentListProps) {
  const { workspace, selection, onFocusComponent } = props
  // Names of the components that are open (showing their layers).
  const [expandedNames, setExpandedNames] = useState<Set<string>>(new Set())

  // Auto-open the component that holds the selection. We compare with the last
  // component we saw during render (React's "adjust state when a prop changes"
  // pattern), so it opens once per new selection and can still be closed after.
  const selectedComponent = selection?.component ?? null
  const [lastSelectedComponent, setLastSelectedComponent] = useState(selectedComponent)
  if (selectedComponent !== lastSelectedComponent) {
    setLastSelectedComponent(selectedComponent)
    if (selectedComponent && !expandedNames.has(selectedComponent)) {
      setExpandedNames(new Set(expandedNames).add(selectedComponent))
    }
  }

  function setExpanded(name: string, isExpanded: boolean) {
    const next = new Set(expandedNames)
    if (isExpanded) next.add(name)
    else next.delete(name)
    setExpandedNames(next)
  }

  return (
    <div className="flex flex-col gap-3 py-2">
      {groupComponents(workspace.components).map(([groupName, entries]) => (
        <div key={groupName} role="group" aria-label={groupName}>
          <h3 className={cn('flex h-6 items-center text-[11px] font-medium text-muted-foreground', panelPaddingClass)}>
            {groupName}
          </h3>
          <div className="flex flex-col px-1.5">
            {entries.map((entry) => {
              const isExpanded = expandedNames.has(entry.name)
              return (
                <ComponentRow
                  key={entry.name}
                  entry={entry}
                  isExpanded={isExpanded}
                  isActive={selectedComponent === entry.name}
                  onOpen={() => {
                    onFocusComponent(entry.name)
                    setExpanded(entry.name, true)
                  }}
                  onToggle={() => setExpanded(entry.name, !isExpanded)}
                >
                  {/* Layers: the selection's variant if it's in this component, else the first variant. */}
                  {isExpanded && (
                    <LayerTree
                      {...props}
                      entry={entry}
                      variantName={
                        selection?.component === entry.name ? selection.variant : (entry.variants[0]?.name ?? '')
                      }
                      baseIndent={layerTreeIndent}
                    />
                  )}
                </ComponentRow>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── One component row (and, when open, its layer tree below it) ─────────────
function ComponentRow({
  entry,
  isExpanded,
  isActive,
  onOpen,
  onToggle,
  children,
}: {
  entry: ComponentEntry
  isExpanded: boolean
  isActive: boolean
  onOpen: () => void
  onToggle: () => void
  children: ReactNode
}) {
  const variantCount = entry.variants.length
  return (
    <div>
      <div
        className={cn(
          rowHeightClass,
          'group/row flex items-center gap-1 rounded-md pr-2 pl-0.5 text-xs transition-colors hover:bg-muted/60',
          isActive && 'text-foreground',
        )}
      >
        {/* Chevron: opens/closes the layers without moving the camera. */}
        <button
          type="button"
          aria-label={isExpanded ? `Collapse ${entry.name}` : `Expand ${entry.name}`}
          aria-expanded={isExpanded}
          onClick={onToggle}
          className="flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <ChevronRight
            size={iconSize - 3}
            strokeWidth={iconStroke}
            className={cn('transition-transform duration-150', isExpanded && 'rotate-90')}
          />
        </button>

        {/* The row itself: focus the camera on this component and open it. */}
        <button
          type="button"
          onClick={onOpen}
          title={entry.description}
          className="flex h-full min-w-0 flex-1 items-center gap-2 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <Component size={iconSize} strokeWidth={iconStroke} className="shrink-0 text-muted-foreground" />
          <span className={cn('min-w-0 flex-1 truncate', isActive && 'font-medium')}>{entry.name}</span>
          <span className="text-[11px] text-muted-foreground/80 tabular-nums">{variantCount}</span>
        </button>
      </div>
      {children}
    </div>
  )
}
