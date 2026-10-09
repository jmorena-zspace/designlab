import { createElement } from 'react'
import type { ReactNode } from 'react'
import { styleToClassName } from '../style-classes'
import { makeNodeId } from '../types'
import type { ComponentEntry, DesignNode } from '../types'
import { EditableText } from './inline-text-editor'
import { getNodeKey } from './node-key'

// ─────────────────────────────────────────────────────────────────────────────
// NODE RENDERER: turns a tree of DesignNodes into REAL React components.
//
// For each node it:
//   1. skips it if it's hidden,
//   2. picks what to render: a built-in ('div', 'span', 'text') or the real component
//      from the entry's `render` map (e.g. 'Button' → shadcn's <Button>),
//   3. passes the node's props, its style classes and a `data-node-id`,
//   4. renders the children the same way (this function calls itself).
//
// `data-node-id` ("Button::Outline::label") is how a click on the canvas is turned
// back into "which layer was that?". Every shadcn component we use spreads extra props
// onto its main DOM element, so the id lands on a real element. (Checked in
// src/components/ui: button, badge, card parts, input, textarea, checkbox, switch,
// label and progress all pass `...props` through, and lucide icons do too.)
//
// Style classes go through `cn` (a tailwind-merge drop-in). The component also runs its
// own classes through `cn`, so our `px-4` correctly REPLACES its `px-2.5` instead of
// fighting with it.
// ─────────────────────────────────────────────────────────────────────────────

// Built-in node types that are plain HTML elements.
const htmlElementTypes = new Set(['div', 'span'])

// Everything a node needs to know besides the node itself. Passed down unchanged.
export type NodeRenderContext = {
  entry: ComponentEntry
  variantName: string
  editingLayerKey: string | null // the text layer being edited in this variant, if any
  onTextCommit: (layerKey: string, newText: string) => void
  onTextEditEnd: () => void
}

type NodeRendererProps = {
  node: DesignNode
  context: NodeRenderContext
}

export function NodeRenderer({ node, context }: NodeRendererProps) {
  // Hidden layers aren't drawn at all (they still show in the Layers list).
  if (node.hidden) return null

  const nodeId = makeNodeId({ component: context.entry.name, variant: context.variantName, layerKey: node.layerKey })
  // The style map ({ gap: 'gap-2', paddingX: 'px-4' }) becomes one class string,
  // in a fixed general → specific order (see style-classes.ts for why).
  const className = styleToClassName(node.style) || undefined

  // ── Text layers: a span you can double-click to edit ──
  if (node.type === 'text') {
    return (
      <EditableText
        nodeId={nodeId}
        text={node.text ?? ''}
        className={className}
        isEditing={context.editingLayerKey === node.layerKey}
        onCommit={(newText) => context.onTextCommit(node.layerKey, newText)}
        onCancel={context.onTextEditEnd}
      />
    )
  }

  // ── Children ──
  // Only pass children when there are some: void elements like <input> crash if they
  // receive any `children` prop, even an empty list.
  const visibleChildren = (node.children ?? []).filter((child) => !child.hidden)
  const children: ReactNode =
    visibleChildren.length > 0
      ? visibleChildren.map((child) => <NodeRenderer key={getNodeKey(child)} node={child} context={context} />)
      : undefined

  const elementProps = { ...node.props, className, 'data-node-id': nodeId }

  // ── Plain HTML built-ins ('div', 'span') ──
  if (htmlElementTypes.has(node.type)) {
    return createElement(node.type, elementProps, children)
  }

  // ── Real components from the workspace ──
  const RealComponent = context.entry.render[node.type]
  if (!RealComponent) {
    // Unknown type: show a small visible placeholder instead of crashing.
    return (
      <span className="cc-missing-component" data-node-id={nodeId} data-stage-chrome="">
        Unknown component “{node.type}”
      </span>
    )
  }
  return <RealComponent {...elementProps}>{children}</RealComponent>
}
