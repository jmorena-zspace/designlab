import { memo, useMemo } from 'react'
import { MousePointer2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  makeNodeId,
  type ComponentEntry,
  type DesignNode,
  type EditScope,
  type LayerRef,
  type RightPanelProps,
  type StyleProperty,
  type TokenOption,
} from '../types'
import { findNode, findParent, getRenderedTree, getStartingNode } from '../apply-changes'
import { iconSize, iconStroke, panelHeaderHeight, panelPaddingClass } from './controls/panel-styles'
import { SegmentedControl } from './controls/segmented-control'
import { readStageVariable, useComputedStyle, type ComputedDefaults } from './controls/use-computed-style'
import { BorderSection } from './sections/border-section'
import { ChangesSection } from './sections/changes-section'
import { CodeSection } from './sections/code-section'
import { ContentSection } from './sections/content-section'
import { FillSection } from './sections/fill-section'
import { LayoutSection } from './sections/layout-section'
import { PropsSection } from './sections/props-section'
import { SizeSection } from './sections/size-section'
import type { StyleSectionProps } from './sections/style-section-props'
import { TypographySection } from './sections/typography-section'

// ─────────────────────────────────────────────────────────────────────────────
// RIGHT PANEL: the "inspector". Shows everything you can change about the
// selected layer, Figma-style, in collapsible sections. When nothing is selected
// it shows a hint and the list of changes (with export buttons).
//
// The panel itself holds no edit state: every control calls back up to the page
// (onSetStyle / onSetProp / onSetText), which adds a change to the change list.
// ─────────────────────────────────────────────────────────────────────────────

// TWEAK: infoButtonSpace — empty space (px) kept on the header's right for the
// fixed round "i" info button that floats over this corner (try 64 to 88)
const infoButtonSpace = 72

// Everything we look up about the selected layer, in one bundle.
type SelectedLayer = {
  entry: ComponentEntry // the component it belongs to
  node: DesignNode // the layer, with edits applied
  parent: DesignNode | null // the layer that contains it (null for the root)
  startingNode: DesignNode | null // the layer before any edits
}

// `memo` = skip re-rendering when none of the props changed. The page keeps its
// callbacks stable, so hovering on the canvas doesn't re-render this whole panel.
export const RightPanel = memo(function RightPanel(props: RightPanelProps) {
  const { workspace, changes, themeVariables, selection, scope, onScopeChange, stageDocument, frameThemes } = props

  // ── Find the selected layer (with edits applied) and its parent ────────────
  // useMemo: only search the trees again when the selection or changes change.
  const found = useMemo((): SelectedLayer | null => {
    if (!selection) return null
    const entry = workspace.components.find((candidate) => candidate.name === selection.component)
    const tree = entry ? getRenderedTree(entry, selection.variant, changes) : null
    if (!entry || !tree) return null
    const node = findNode(tree, selection.layerKey)
    if (!node) return null
    return {
      entry,
      node,
      parent: findParent(tree, selection.layerKey),
      startingNode: getStartingNode(workspace.components, selection),
    }
  }, [workspace, selection, changes])

  // ── Measure the real rendered element for the muted "default" values ───────
  // Text layers may have no element of their own, so the parent is the fallback.
  const nodeId = selection ? makeNodeId(selection) : null
  const parentNodeId = selection && found?.parent ? makeNodeId({ ...selection, layerKey: found.parent.layerKey }) : null
  const computed = useComputedStyle(stageDocument, nodeId, parentNodeId, changes, frameThemes)

  return (
    <div className="flex h-full w-full flex-col bg-background text-foreground">
      {/* ── Header: layer name + "Component › Variant" breadcrumb ── */}
      <header
        className={`flex shrink-0 flex-col justify-center gap-0.5 ${panelPaddingClass}`}
        style={{ height: panelHeaderHeight, paddingRight: infoButtonSpace }}
      >
        {selection && found ? (
          <>
            <h2 className="truncate text-[13px] font-medium">{found.node.name}</h2>
            <p className="truncate text-[11px] text-muted-foreground">
              {selection.component} <span className="text-muted-foreground/50">›</span> {selection.variant}
            </p>
          </>
        ) : (
          <>
            <h2 className="text-[13px] font-medium">Inspector</h2>
            <p className="text-[11px] text-muted-foreground">Nothing selected</p>
          </>
        )}
      </header>

      {selection && found ? (
        <>
          {/* ── Scope: do edits apply to every variant, or only this one? ── */}
          <div className={`shrink-0 pb-3 ${panelPaddingClass}`}>
            <SegmentedControl<EditScope>
              ariaLabel="Edit scope"
              value={scope}
              onChange={onScopeChange}
              options={[
                { value: 'all', label: 'All variants', title: 'Edits apply to every variant of this component' },
                { value: 'variant', label: 'This variant', title: `Edits apply only to ${selection.variant}` },
              ]}
            />
          </div>

          <ScrollArea className="min-h-0 flex-1">
            {/* key: a new layer gets fresh sections (open/closed state, padding mode…). */}
            <SelectedLayerSections key={nodeId} {...props} selection={selection} found={found} computed={computed} />
          </ScrollArea>
        </>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <EmptyState />
          <ChangesSection workspace={workspace} changes={changes} themeVariables={themeVariables} />
        </ScrollArea>
      )}
    </div>
  )
})

// ── The sections for the selected layer, shown only when they make sense ─────
function SelectedLayerSections({
  workspace,
  changes,
  selection,
  stageDocument,
  found,
  computed,
  onSetStyle,
  onSetProp,
  onSetText,
}: RightPanelProps & {
  selection: LayerRef // never null here
  found: SelectedLayer
  computed: ComputedDefaults | null
}) {
  const { entry, node, startingNode } = found
  const isText = node.type === 'text'
  const textNodes = getEditableTextNodes(node)
  const propControls = entry.propControls?.[node.type] ?? []
  const nodeId = makeNodeId(selection)

  // Color swatches: read each token's value on the selected element inside the stage,
  // so a layer in a dark frame shows dark swatches. Falls back to the CSS variable.
  function swatchColorFor(option: TokenOption): string | null {
    if (!option.swatchVar) return null
    return readStageVariable(stageDocument, nodeId, option.swatchVar) ?? `var(${option.swatchVar})`
  }

  // Everything the style sections need, with onSetStyle already aimed at this layer.
  const styleProps: StyleSectionProps = {
    node,
    startingNode,
    computed,
    colorClasses: workspace.colorClasses,
    swatchColorFor,
    onSetStyle: (property: StyleProperty, value: string | null) => onSetStyle(selection, property, value),
  }

  return (
    <div className="pb-6">
      {propControls.length > 0 && (
        <PropsSection
          node={node}
          startingNode={startingNode}
          controls={propControls}
          onSetProp={(prop, value) => onSetProp(selection, prop, value)}
        />
      )}

      {textNodes.length > 0 && (
        <ContentSection
          textNodes={textNodes}
          onSetText={(layerKey, text) => onSetText({ ...selection, layerKey }, text)}
        />
      )}

      {/* Plain text layers only get typography; boxes and components get the rest too. */}
      {!isText && <LayoutSection {...styleProps} />}
      {!isText && <SizeSection {...styleProps} />}
      {!isText && <FillSection {...styleProps} />}
      {(isText || textNodes.length > 0) && <TypographySection {...styleProps} />}
      {!isText && <BorderSection {...styleProps} />}

      <CodeSection workspace={workspace} changes={changes} selection={selection} />
    </div>
  )
}

// ── Shown when nothing is selected ───────────────────────────────────────────
function EmptyState() {
  return (
    <div className={`flex flex-col items-center gap-2 pt-6 pb-8 text-center ${panelPaddingClass}`}>
      <span className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <MousePointer2 size={iconSize} strokeWidth={iconStroke} />
      </span>
      <p className="text-xs font-medium">Select a layer on the canvas</p>
      <p className="max-w-[200px] text-[11px] leading-relaxed text-muted-foreground">
        Or pick one in the Layers list. Its props, content and styles show up here.
      </p>
    </div>
  )
}

// Which text layers the Content section shows: the layer itself if it's text,
// otherwise its direct text children (a Button → its label).
function getEditableTextNodes(node: DesignNode): DesignNode[] {
  if (node.type === 'text') return [node]
  return (node.children ?? []).filter((child) => child.type === 'text')
}
