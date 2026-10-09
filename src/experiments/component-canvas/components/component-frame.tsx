import { memo, useMemo } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Moon, Sun } from 'lucide-react'
import { getRenderedTree, getTokenOverrides } from '../apply-changes'
import type { CanvasChange, ComponentEntry, Decorator, LayerRef, ThemeMode } from '../types'
import { getNodeKey } from './node-key'
import { NodeRenderer } from './node-renderer'
import type { NodeRenderContext } from './node-renderer'
import { VariantErrorBoundary } from './variant-error-boundary'

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT FRAME: one "artboard" per component, like a frame in Figma.
//
//   Button                         ☀   ← title + light/dark toggle (above the frame)
//  ┌──────────────────────────────────┐
//  │ Default    Outline    Ghost  …   │ ← tiny variant names
//  │ [Save]     [View]     [Cancel]   │ ← the REAL components, one per variant
//  └──────────────────────────────────┘
//
// All of its look comes from stage-chrome.css (classes starting with "cc-"), which
// does not depend on the workspace's CSS.
// ─────────────────────────────────────────────────────────────────────────────

// TWEAK: variantColumns — how many variants sit side by side before wrapping (try 2 to 6)
const variantColumns = 4

type ComponentFrameProps = {
  entry: ComponentEntry
  changes: CanvasChange[]
  theme: ThemeMode
  decorators: Decorator[]
  isActive: boolean // true when the selected layer is inside this component
  editingLayer: LayerRef | null // the text layer being edited (only passed to its own frame)
  onToggleTheme: (componentName: string) => void
  onTextCommit: (layer: LayerRef, newText: string) => void
  onTextEditEnd: () => void
}

// `memo` = skip re-rendering this frame when none of its props changed (for example
// when only the hovered layer changed). The stage keeps its callbacks stable for this.
export const ComponentFrame = memo(function ComponentFrame({
  entry,
  changes,
  theme,
  decorators,
  isActive,
  editingLayer,
  onToggleTheme,
  onTextCommit,
  onTextEditEnd,
}: ComponentFrameProps) {
  const isDark = theme === 'dark'

  // Dark-mode token edits are set as CSS variables right on the dark frame, so they
  // beat the `.dark { … }` values from the workspace CSS for this frame only.
  // (Light-mode edits go on the iframe's <html> instead; see stage-iframe.tsx.)
  const frameBodyStyle = useMemo(() => {
    const style: Record<string, string> = isDark ? getTokenOverrides(changes, 'dark') : {}
    return style as CSSProperties
  }, [changes, isDark])

  const columnCount = Math.min(entry.variants.length, variantColumns)

  return (
    <section className="cc-frame" data-frame={entry.name}>
      {/* Frame title + theme toggle. data-stage-chrome tells the stage's click handler
          "this is editor UI, not a layer", so clicking it never changes the selection. */}
      <header className="cc-frame-header" data-stage-chrome="">
        <span className="cc-frame-title" data-active={isActive || undefined}>
          {entry.name}
        </span>
        <button
          type="button"
          className="cc-theme-toggle"
          title={isDark ? 'Show in light mode' : 'Show in dark mode'}
          aria-label={isDark ? 'Show in light mode' : 'Show in dark mode'}
          onClick={() => onToggleTheme(entry.name)}
        >
          {isDark ? <Moon aria-hidden /> : <Sun aria-hidden />}
        </button>
      </header>

      {/* The frame body. With the `dark` class, the workspace's `.dark { … }` variables
          and its `dark:` classes apply inside it (the workspace CSS uses
          `@custom-variant dark (&:is(.dark *))`). Its surface uses var(--background) and
          var(--foreground), which assumes shadcn's variable names; an imported design
          system with other names would need these two adjusted in stage-chrome.css. */}
      <div className={isDark ? 'cc-frame-body dark' : 'cc-frame-body'} style={frameBodyStyle}>
        <div className="cc-variant-grid" style={{ gridTemplateColumns: `repeat(${columnCount}, max-content)` }}>
          {entry.variants.map((variant) => (
            <VariantCell
              key={variant.name}
              entry={entry}
              variantName={variant.name}
              changes={changes}
              decorators={decorators}
              editingLayerKey={editingLayer?.variant === variant.name ? editingLayer.layerKey : null}
              onTextCommit={onTextCommit}
              onTextEditEnd={onTextEditEnd}
            />
          ))}
        </div>
      </div>
    </section>
  )
})

// ── One variant: its name + the real component ───────────────────────────────
type VariantCellProps = {
  entry: ComponentEntry
  variantName: string
  changes: CanvasChange[]
  decorators: Decorator[]
  editingLayerKey: string | null
  onTextCommit: (layer: LayerRef, newText: string) => void
  onTextEditEnd: () => void
}

function VariantCell({
  entry,
  variantName,
  changes,
  decorators,
  editingLayerKey,
  onTextCommit,
  onTextEditEnd,
}: VariantCellProps) {
  // Starting tree + the user's changes = the tree to draw.
  const tree = useMemo(() => getRenderedTree(entry, variantName, changes), [entry, variantName, changes])

  // Everything the recursive renderer needs, bundled so it's passed down as one prop.
  const context: NodeRenderContext = {
    entry,
    variantName,
    editingLayerKey,
    onTextCommit: (layerKey, newText) => onTextCommit({ component: entry.name, variant: variantName, layerKey }, newText),
    onTextEditEnd,
  }

  // The tree as text. If it changes after a crash, the error boundary tries again.
  const treeSignature = useMemo(() => JSON.stringify(tree), [tree])

  // Wrap the component in the workspace's providers (router, theme…), innermost last:
  // [A, B] becomes <A><B>component</B></A>.
  let content: ReactNode = tree ? <NodeRenderer key={getNodeKey(tree)} node={tree} context={context} /> : null
  for (const WrapWith of [...decorators].reverse()) {
    content = <WrapWith>{content}</WrapWith>
  }

  return (
    <div className="cc-variant-cell">
      <div className="cc-variant-name" data-stage-chrome="">
        {variantName}
      </div>
      <div className="cc-variant-content">
        <VariantErrorBoundary resetKey={treeSignature}>{content}</VariantErrorBoundary>
      </div>
    </div>
  )
}
