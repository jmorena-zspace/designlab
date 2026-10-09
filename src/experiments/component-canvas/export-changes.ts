import { getRenderedTree, getStartingNode } from './apply-changes'
import { stylePropertyLabels } from './data/tailwind-scale'
import { styleToClassName } from './style-classes'
import type {
  CanvasChange,
  ChangeDescription,
  ComponentEntry,
  DesignNode,
  PropValue,
  ThemeMode,
  ThemeVariable,
  TokenChange,
  Workspace,
} from './types'

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT CHANGES: the change list → things a person (or Claude) can read and use.
//
//   describeChanges   → one readable line per change, for the Changes list
//   variantToJsx      → the edited component written out as JSX
//   tokenChangesToCss → edited theme variables as CSS, ready to paste
//   changesToMarkdown → a full hand-off document with all of the above
//
// It also owns compactChanges(), which tidies the change list. The canvas state
// uses it after every edit, so the list never fills up with edits that were
// later replaced.
// ─────────────────────────────────────────────────────────────────────────────

// TWEAK: indentText — the indentation used in the exported JSX (two spaces by default).
const indentText = '  '

// TWEAK: markdownTitle — the heading at the top of the hand-off document.
const markdownTitle = 'Component Canvas changes'

// TWEAK: arrow — the symbol between the old and the new value in every description.
const arrow = '→'

// The canvas-only icon wrapper (see "Icon layers" below): its layer type, the prop
// holding the icon's name, and the icon to print if the name is missing.
const iconWrapperType = 'Icon'
const iconNameProp = 'icon'
const fallbackIconName = 'Sparkles'

// ─────────────────────────────────────────────────────────────────────────────
// 1. Tidying the change list
// ─────────────────────────────────────────────────────────────────────────────

// A short text that says WHAT a change edits (not the new value). Two changes with
// the same target key edit the same thing, so only the later one matters.
// Example: "style|Button|all|label|paddingX"
export function getChangeTargetKey(change: CanvasChange): string {
  if (change.kind === 'token') return ['token', change.mode, change.variable].join('|')
  const base = [change.kind, change.component, change.variant, change.layerKey]
  if (change.kind === 'style') return [...base, change.property].join('|')
  if (change.kind === 'prop') return [...base, change.prop].join('|')
  return base.join('|') // 'text' and 'hidden' have one value per layer
}

// Same as the target key, but without the variant. Used to find changes that edit
// the same thing in OTHER variants (so an "All variants" edit can replace them).
function getTargetKeyIgnoringVariant(change: CanvasChange): string {
  if (change.kind === 'token') return getChangeTargetKey(change)
  return getChangeTargetKey({ ...change, variant: '*' })
}

// Returns a tidier copy of the change list that renders EXACTLY the same result.
// We replay the list in order (just like apply-changes.ts does) and keep only what
// still has an effect at the end:
//   - A later change replaces an earlier change with the same target.
//   - An "All variants" change also replaces earlier single-variant changes of the
//     same thing, because it overwrites them all.
//   - A reset (a style, prop or token with value null = "back to how it started")
//     removes the earlier edits it undoes, and then usually isn't needed itself.
//     It's only kept when it has to cancel an "All variants" edit for ONE variant.
export function compactChanges(changes: CanvasChange[]): CanvasChange[] {
  let kept: CanvasChange[] = []

  for (const change of changes) {
    const appliesToAllVariants = change.kind !== 'token' && change.variant === 'all'
    const sameThing = getTargetKeyIgnoringVariant(change)
    const sameTarget = getChangeTargetKey(change)

    // Drop the earlier edits this change overwrites.
    kept = kept.filter((earlier) => {
      if (appliesToAllVariants) return getTargetKeyIgnoringVariant(earlier) !== sameThing
      return getChangeTargetKey(earlier) !== sameTarget
    })

    const isReset =
      (change.kind === 'style' || change.kind === 'prop' || change.kind === 'token') && change.value === null
    if (!isReset) {
      kept.push(change)
      continue
    }

    // A reset for ONE variant still matters if an "All variants" edit of the same
    // property remains: without the reset, that variant would keep the edit.
    // (An "All variants" reset already removed everything above, so it's dropped.)
    const allVariantsEditRemains = kept.some(
      (earlier) =>
        earlier.kind !== 'token' && earlier.variant === 'all' && getTargetKeyIgnoringVariant(earlier) === sameThing,
    )
    if (allVariantsEditRemains) kept.push(change)
  }

  return kept
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Small formatting helpers
// ─────────────────────────────────────────────────────────────────────────────

function findEntry(workspace: Workspace, componentName: string): ComponentEntry | undefined {
  return workspace.components.find((entry) => entry.name === componentName)
}

// Which variants a change touches: all of them, or just one.
function affectedVariantNames(entry: ComponentEntry | undefined, variant: string): string[] {
  if (!entry) return []
  if (variant === 'all') return entry.variants.map((candidate) => candidate.name)
  return [variant]
}

// The starting (unedited) layer in each affected variant. Variants that don't have
// this layer are skipped.
function startingLayers(workspace: Workspace, change: Exclude<CanvasChange, TokenChange>): DesignNode[] {
  const entry = findEntry(workspace, change.component)
  const layers: DesignNode[] = []
  for (const variantName of affectedVariantNames(entry, change.variant)) {
    const node = getStartingNode(workspace.components, {
      component: change.component,
      variant: variantName,
      layerKey: change.layerKey,
    })
    if (node) layers.push(node)
  }
  return layers
}

// Lists the different starting values, e.g. ['default'] or ['default', 'outline'].
// With "All variants", each variant can start differently, so we show them all,
// joined with " / ".
function joinUniqueValues(values: string[]): string {
  const unique = [...new Set(values)]
  return unique.length > 0 ? unique.join(' / ') : 'unset'
}

// How a prop value reads in a description: text in plain form, everything else as-is.
function formatPropValue(value: PropValue | undefined): string {
  if (value === undefined) return 'unset'
  return String(value)
}

// The layer's name as shown in the Layers panel, e.g. "Label".
function layerName(workspace: Workspace, change: Exclude<CanvasChange, TokenChange>): string {
  return startingLayers(workspace, change)[0]?.name ?? change.layerKey
}

// The "from → to" part of a layer change, e.g. "px-2.5 → px-4".
function describeLayerDetail(workspace: Workspace, change: Exclude<CanvasChange, TokenChange>): string {
  const layers = startingLayers(workspace, change)

  // A reset (null) that survives compactChanges only exists to undo an "All variants"
  // edit in this one variant, so we say exactly that.
  const skipsAllVariantsNote = '(skips the All variants edit)'

  if (change.kind === 'style') {
    const before = joinUniqueValues(layers.map((layer) => layer.style?.[change.property] ?? 'default'))
    if (change.value === null) return `back to ${before} ${skipsAllVariantsNote}`
    return `${before} ${arrow} ${change.value}`
  }
  if (change.kind === 'prop') {
    const before = joinUniqueValues(layers.map((layer) => formatPropValue(layer.props?.[change.prop])))
    if (change.value === null) return `${change.prop}: back to ${before} ${skipsAllVariantsNote}`
    return `${change.prop}: ${before} ${arrow} ${formatPropValue(change.value)}`
  }
  if (change.kind === 'text') {
    const before = joinUniqueValues(layers.map((layer) => `"${layer.text ?? ''}"`))
    return `text: ${before} ${arrow} "${change.value}"`
  }
  // 'hidden'
  return change.value ? 'hidden' : 'shown'
}

// The original value of a theme variable in one mode (from the parsed workspace CSS).
function originalTokenValue(themeVariables: ThemeVariable[], mode: ThemeMode, variableName: string): string {
  const variable = themeVariables.find((candidate) => candidate.name === variableName)
  return variable?.[mode] ?? 'unset'
}

function modeLabel(mode: ThemeMode): string {
  return mode === 'light' ? 'Light' : 'Dark'
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. describeChanges: one readable line per change (for the Changes list)
// ─────────────────────────────────────────────────────────────────────────────
// Examples:
//   { title: 'Button › Label', scope: 'All variants', detail: 'px-2.5 → px-4' }
//   { title: 'Token › --primary', scope: 'Light', detail: 'oklch(…) → #4f46e5' }
export function describeChanges(
  workspace: Workspace,
  changes: CanvasChange[],
  themeVariables: ThemeVariable[],
): ChangeDescription[] {
  return compactChanges(changes).map((change) => {
    const id = getChangeTargetKey(change)

    if (change.kind === 'token') {
      const before = originalTokenValue(themeVariables, change.mode, change.variable)
      return {
        id,
        title: `Token › ${change.variable}`,
        scope: modeLabel(change.mode),
        detail: `${before} ${arrow} ${change.value}`,
      }
    }

    return {
      id,
      title: `${change.component} › ${layerName(workspace, change)}`,
      scope: change.variant === 'all' ? 'All variants' : change.variant,
      detail: describeLayerDetail(workspace, change),
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. variantToJsx: the edited component written out as JSX
// ─────────────────────────────────────────────────────────────────────────────

// JSX text can't contain { } < > as-is, so those are wrapped as {'{'} etc.
function escapeJsxText(text: string): string {
  return text.replace(/[{}<>]/g, (character) => `{'${character}'}`)
}

// One prop as a JSX attribute:
//   'outline' → variant="outline"     40 → value={40}
//   true      → disabled              false → disabled={false}
function propToAttribute(name: string, value: PropValue): string {
  if (value === true) return name
  if (typeof value === 'string') {
    // JSON.stringify adds quotes and escapes any quotes inside. If the text has a
    // double quote, we wrap it in braces so it stays valid JSX.
    return value.includes('"') ? `${name}={${JSON.stringify(value)}}` : `${name}="${value}"`
  }
  return `${name}={${String(value)}}` // numbers and false
}

// ICON LAYERS: on the canvas, an icon layer is `<Icon icon="Plus" />`, a small
// canvas-only wrapper (workspaces/shadcn-demo/icon.tsx) that looks the icon up by
// name. Real projects write the lucide icon directly (`<Plus />`), so the export
// swaps the wrapper for the real icon and leaves out the `icon` prop.
function isIconLayer(node: DesignNode): boolean {
  return node.type === iconWrapperType
}

// The tag to print: the real lucide icon name for icon layers, else the node's type.
function jsxTagName(node: DesignNode): string {
  if (!isIconLayer(node)) return node.type
  const iconName = node.props?.[iconNameProp]
  return typeof iconName === 'string' ? iconName : fallbackIconName
}

// All attributes of one node: its props, then className built from its style map.
// styleToClassName is the SAME function the canvas renders with, so the exported
// classes always match what you see (in the same order, with the same merging).
function nodeAttributes(node: DesignNode): string[] {
  const attributes = Object.entries(node.props ?? {})
    .filter(([name]) => !(isIconLayer(node) && name === iconNameProp))
    .map(([name, value]) => propToAttribute(name, value))
  const className = styleToClassName(node.style)
  if (className !== '') attributes.push(`className="${className}"`)
  return attributes
}

// Every lucide icon name used by the visible layers of a tree (for the import line).
function collectIconNames(node: DesignNode, found: Set<string>): Set<string> {
  if (node.hidden) return found
  if (isIconLayer(node)) found.add(jsxTagName(node))
  for (const child of node.children ?? []) collectIconNames(child, found)
  return found
}

// Writes one node (and its children) as lines of JSX. `depth` = how far to indent.
// Recursion: a node prints its own tag, then asks each child to print itself one
// level deeper.
function nodeToJsxLines(node: DesignNode, depth: number): string[] {
  const indent = indentText.repeat(depth)

  // 'text' nodes are plain words, not elements.
  if (node.type === 'text') return [indent + escapeJsxText(node.text ?? '')]

  const tagName = jsxTagName(node)
  const openTag = [tagName, ...nodeAttributes(node)].join(' ')
  const visibleChildren = (node.children ?? []).filter((child) => !child.hidden)

  // No children → a self-closing tag: <Input placeholder="Email" />
  if (visibleChildren.length === 0) return [`${indent}<${openTag} />`]

  // Only words inside → keep it on one line: <Button>Continue</Button>
  const onlyText = visibleChildren.every((child) => child.type === 'text')
  if (onlyText) {
    const words = visibleChildren.map((child) => escapeJsxText(child.text ?? '')).join(' ')
    return [`${indent}<${openTag}>${words}</${tagName}>`]
  }

  // Otherwise: opening tag, each child on its own lines, closing tag.
  return [
    `${indent}<${openTag}>`,
    ...visibleChildren.flatMap((child) => nodeToJsxLines(child, depth + 1)),
    `${indent}</${tagName}>`,
  ]
}

export function variantToJsx(
  workspace: Workspace,
  componentName: string,
  variantName: string,
  changes: CanvasChange[],
): string {
  const entry = findEntry(workspace, componentName)
  const tree = entry ? getRenderedTree(entry, variantName, changes) : null
  if (!tree) return `{/* ${componentName} › ${variantName} not found */}`
  if (tree.hidden) return `{/* ${componentName} › ${variantName} is hidden */}`
  return nodeToJsxLines(tree, 0).join('\n')
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. tokenChangesToCss: edited theme variables as a CSS snippet
// ─────────────────────────────────────────────────────────────────────────────
// Example output:
//   :root {
//     --primary: #4f46e5; /* was oklch(20.5% 0 0) */
//   }
export function tokenChangesToCss(themeVariables: ThemeVariable[], changes: CanvasChange[]): string {
  const tokenChanges = compactChanges(changes).filter((change) => change.kind === 'token')
  const blocks: string[] = []

  // One block per mode, light first. Modes with no edits are left out.
  const modes: { mode: ThemeMode; selector: string }[] = [
    { mode: 'light', selector: ':root' },
    { mode: 'dark', selector: '.dark' },
  ]
  for (const { mode, selector } of modes) {
    const lines = tokenChanges
      .filter((change) => change.mode === mode)
      .map((change) => {
        const before = originalTokenValue(themeVariables, mode, change.variable)
        return `${indentText}${change.variable}: ${change.value}; /* was ${before} */`
      })
    if (lines.length > 0) blocks.push([`${selector} {`, ...lines, '}'].join('\n'))
  }

  return blocks.join('\n\n') // '' when nothing was edited
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. changesToMarkdown: a hand-off document
// ─────────────────────────────────────────────────────────────────────────────
// Written so a developer, or Claude, can apply the edits to the original project:
// what changed per component (with the Tailwind class before and after), the
// edited JSX of every touched variant, and the token CSS.
export function changesToMarkdown(
  workspace: Workspace,
  themeVariables: ThemeVariable[],
  changes: CanvasChange[],
): string {
  const tidyChanges = compactChanges(changes)
  const lines: string[] = [`# ${markdownTitle}`, '', `Workspace: **${workspace.name}** (\`${workspace.id}\`)`, '']

  if (tidyChanges.length === 0) {
    lines.push('No changes yet.')
    return lines.join('\n')
  }

  lines.push(
    'How to read this:',
    '- Every value is a Tailwind class or a CSS variable from the project theme.',
    '- **All variants** means the change belongs in the component itself (its base classes).',
    '- A variant name (like **Outline**) means only that variant or usage changes.',
    '- "default" means the layer had no extra class; the component\'s own styles applied.',
    '',
  )

  // Layer changes, grouped by component (in the order the workspace lists them).
  for (const entry of workspace.components) {
    const componentChanges = tidyChanges.filter((change) => change.kind !== 'token' && change.component === entry.name)
    if (componentChanges.length === 0) continue

    lines.push(`## ${entry.name}`, '')
    for (const change of componentChanges) {
      if (change.kind === 'token') continue // never true here; narrows the type for TypeScript
      const scope = change.variant === 'all' ? 'All variants' : change.variant
      const label = change.kind === 'style' ? `${stylePropertyLabels[change.property]}: ` : ''
      const detail = describeLayerDetail(workspace, change)
      lines.push(`- **${layerName(workspace, change)}** (layer \`${change.layerKey}\`, ${scope}): ${label}${detail}`)
    }
    lines.push('')

    // The edited JSX of every variant these changes touch.
    const touchedVariants = new Set(
      componentChanges.flatMap((change) =>
        change.kind === 'token' ? [] : affectedVariantNames(entry, change.variant),
      ),
    )
    const iconNames = new Set<string>()
    for (const variantName of touchedVariants) {
      lines.push(`### ${entry.name} › ${variantName} (after)`, '', '```tsx', variantToJsx(workspace, entry.name, variantName, tidyChanges), '```', '')
      const tree = getRenderedTree(entry, variantName, tidyChanges)
      if (tree) collectIconNames(tree, iconNames)
    }

    // Icons in the JSX above are real lucide-react components, so say where they come from.
    if (iconNames.size > 0) {
      lines.push(`Icons used above come from lucide-react: \`import { ${[...iconNames].join(', ')} } from 'lucide-react'\``, '')
    }
  }

  // Theme token changes as ready-to-paste CSS.
  const tokenCss = tokenChangesToCss(themeVariables, tidyChanges)
  if (tokenCss !== '') {
    lines.push('## Theme tokens', '', 'Replace these values in the project\'s theme CSS:', '', '```css', tokenCss, '```', '')
  }

  return lines.join('\n')
}
