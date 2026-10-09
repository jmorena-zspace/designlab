import type { ComponentType, ReactNode, Ref } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// SHARED TYPES for the Component Canvas.
// Every other file in this experiment builds on the shapes defined here, so this
// is the best file to read first. No logic lives here — only "what things look like".
// ─────────────────────────────────────────────────────────────────────────────

// ── Style properties ─────────────────────────────────────────────────────────
// Every property the right panel can edit. Each one maps to ONE family of Tailwind
// classes (e.g. 'gap' → gap-0, gap-1, gap-2…). The VALUE we store is always the full
// class name (like 'gap-2'), never a raw number, so everything stays tied to tokens.
export type StyleProperty =
  // Layout (flex "auto layout")
  | 'display'
  | 'flexDirection'
  | 'flexWrap'
  | 'alignItems'
  | 'justifyContent'
  | 'gap'
  | 'paddingX'
  | 'paddingY'
  | 'paddingTop'
  | 'paddingRight'
  | 'paddingBottom'
  | 'paddingLeft'
  // Size
  | 'width'
  | 'height'
  | 'maxWidth'
  // Fill
  | 'background'
  | 'opacity'
  // Typography
  | 'fontSize'
  | 'fontWeight'
  | 'textColor'
  | 'textAlign'
  | 'letterSpacing'
  | 'lineHeight'
  // Border
  | 'borderRadius'
  | 'borderWidth'
  | 'borderColor'
  | 'shadow'

// A layer's style overrides: property → Tailwind class name. Example: { gap: 'gap-2' }
export type StyleMap = Partial<Record<StyleProperty, string>>

// One choice in a token dropdown.
export type TokenOption = {
  className: string // the real Tailwind class, e.g. 'gap-2' or 'bg-primary'
  label: string // what the dropdown shows, e.g. '2' or 'primary'
  hint?: string // extra muted info, e.g. '8px'
  swatchVar?: string // for colors: the CSS variable to paint the swatch with, e.g. '--primary'
}

// ── Design nodes (the layers of a component) ─────────────────────────────────
// Values a component prop can hold (variant="outline", disabled={true}, value={40}).
export type PropValue = string | number | boolean

// One layer on the canvas. A whole component variant is a small tree of these.
// Example: a Button node with one 'text' child whose text is "Continue".
export type DesignNode = {
  // Identifies this layer INSIDE its component. The same layer has the same layerKey
  // in every variant (the Button's label is 'label' in Default, Outline, Ghost…).
  // That is what lets an edit apply to "All variants" at once.
  layerKey: string
  // What to render. Either a key of the entry's `render` map (e.g. 'Button', 'CardTitle'),
  // or one of the built-ins: 'div' | 'span' | 'text'.
  type: string
  // Name shown in the Layers list.
  name: string
  // Props passed to the real component (variant, size, disabled, placeholder…).
  props?: Record<string, PropValue>
  // Only for type 'text': the words shown.
  text?: string
  // Classes this layer starts with (most start empty and rely on the component's own styles).
  style?: StyleMap
  // Hidden layers are skipped when rendering (set by a 'hidden' change).
  hidden?: boolean
  children?: DesignNode[]
}

// ── Workspaces (one imported design system) ──────────────────────────────────
// A provider that wraps every component (router, data client, theme…). Imported
// projects will need these so their components find the context they expect.
export type Decorator = ComponentType<{ children: ReactNode }>

// Describes one editable prop in the right panel's "Properties" section.
export type PropControl = {
  name: string // the prop name, e.g. 'variant'
  label?: string // shown label (defaults to name)
  control: 'select' | 'boolean' | 'text' | 'number'
  options?: string[] // for 'select'
  min?: number // for 'number'
  max?: number // for 'number'
}

export type VariantDefinition = {
  name: string // e.g. 'Default', 'Outline', 'Disabled'
  tree: DesignNode // the full starting tree for this variant, with placeholder content
}

export type ComponentEntry = {
  name: string // e.g. 'Button' — unique within the workspace
  description?: string
  group?: string // left panel grouping, e.g. 'Actions', 'Inputs', 'Display'
  // The real React components this entry renders, keyed by DesignNode.type.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- each component has its own props
  render: Record<string, ComponentType<any>>
  // Which props the right panel can edit, per node type. Example: { Button: [{ name: 'variant', … }] }
  propControls?: Record<string, PropControl[]>
  variants: VariantDefinition[]
}

// Color class lists for one theme. Written out literally (see token-classes.ts) so
// Tailwind generates every class.
export type ColorClassLists = {
  background: TokenOption[]
  textColor: TokenOption[]
  borderColor: TokenOption[]
}

export type Workspace = {
  id: string // used in the autosave key
  name: string // shown in the top bar
  css: string // the workspace's compiled CSS text (imported with ?inline), injected ONLY into the stage
  colorClasses: ColorClassLists
  components: ComponentEntry[]
  decorators?: Decorator[]
}

// ── Theme variables (read from the workspace CSS) ────────────────────────────
export type ThemeMode = 'light' | 'dark'

export type ThemeVariable = {
  name: string // e.g. '--primary'
  group: 'color' | 'radius' | 'other'
  light?: string // value inside :root { }
  dark?: string // value inside .dark { }
}

// ── Pointing at a layer ──────────────────────────────────────────────────────
// "Which layer, in which variant, of which component?"
export type LayerRef = {
  component: string
  variant: string
  layerKey: string
}

// ── Changes (everything the user edits) ──────────────────────────────────────
// Edits are NOT written into the trees. They're kept as a list and applied on top of the
// starting trees every render (see apply-changes.ts). That keeps export and undo simple.
//
// `variant` is either a variant name (only that variant) or 'all' (every variant).
// Later changes in the list win over earlier ones.
type LayerTarget = { component: string; layerKey: string; variant: string | 'all' }

// RESET RULE: a value of null means "back to how this layer STARTED" (its starting class
// or prop value from the workspace, or nothing if it started without one). It's how the
// reset × buttons undo an override without guessing what the original value was.
export type StyleChange = LayerTarget & {
  kind: 'style'
  property: StyleProperty
  value: string | null // a class name, or null = back to the starting value
}
export type PropChange = LayerTarget & {
  kind: 'prop'
  prop: string
  value: PropValue | null // null = back to the starting value
}
export type TextChange = LayerTarget & { kind: 'text'; value: string }
export type HiddenChange = LayerTarget & { kind: 'hidden'; value: boolean }
export type TokenChange = {
  kind: 'token'
  mode: ThemeMode
  variable: string // e.g. '--primary'
  value: string | null // new CSS value, or null = back to the original
}

export type CanvasChange = StyleChange | PropChange | TextChange | HiddenChange | TokenChange

// ── Editor modes ─────────────────────────────────────────────────────────────
// design   = clicks select layers (components don't react)
// interact = clicks go to the real components (like a prototype preview)
export type CanvasMode = 'design' | 'interact'
// Whether edits apply to every variant or only the selected one.
export type EditScope = 'all' | 'variant'

// ── Camera (implemented by the infinite canvas, used by the page) ────────────
export type CameraHandle = {
  focusComponent: (componentName: string) => void // smooth pan/zoom to a component's frame
  zoomToFit: () => void
  zoomBy: (factor: number) => void // e.g. 1.25 = zoom in, 0.8 = zoom out
}

// ── Props each big piece receives (the "contracts" between files) ────────────
export type StageProps = {
  workspace: Workspace
  changes: CanvasChange[]
  selection: LayerRef | null
  hovered: LayerRef | null
  mode: CanvasMode
  frameThemes: Record<string, ThemeMode> // component name → light/dark (missing = light)
  cameraRef: Ref<CameraHandle>
  onSelect: (layer: LayerRef | null) => void
  onHover: (layer: LayerRef | null) => void
  onTextEdit: (layer: LayerRef, text: string) => void
  onToggleFrameTheme: (componentName: string) => void
  onZoomChange: (scale: number) => void
  // Gives the page the iframe's document once it's ready, so panels can measure
  // rendered elements (for "computed default" values).
  onStageDocument: (stageDocument: Document | null) => void
}

// The floating toolbar at the bottom-center of the canvas (Figma UI3 style).
export type ToolbarProps = {
  mode: CanvasMode
  onModeChange: (mode: CanvasMode) => void
  zoom: number // 1 = 100%
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomToFit: () => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  changeCount: number
  onResetAll: () => void
}

export type LeftPanelProps = {
  workspace: Workspace
  changes: CanvasChange[]
  themeVariables: ThemeVariable[]
  selection: LayerRef | null
  hovered: LayerRef | null
  onSelect: (layer: LayerRef | null) => void
  onHover: (layer: LayerRef | null) => void
  onFocusComponent: (componentName: string) => void
  onToggleHidden: (layer: LayerRef) => void
  onSetToken: (mode: ThemeMode, variable: string, value: string | null) => void
}

export type RightPanelProps = {
  workspace: Workspace
  changes: CanvasChange[]
  themeVariables: ThemeVariable[]
  frameThemes: Record<string, ThemeMode> // so measured defaults refresh when a frame flips light/dark
  selection: LayerRef | null
  scope: EditScope
  onScopeChange: (scope: EditScope) => void
  stageDocument: Document | null
  onSetStyle: (layer: LayerRef, property: StyleProperty, value: string | null) => void
  onSetProp: (layer: LayerRef, prop: string, value: PropValue | null) => void
  onSetText: (layer: LayerRef, text: string) => void
}

// ── Export ───────────────────────────────────────────────────────────────────
// One readable line in the Changes list, e.g.
// { title: 'Button › Label', scope: 'All variants', detail: 'px-2.5 → px-4' }
export type ChangeDescription = {
  id: string // stable key for React lists
  title: string
  scope: string
  detail: string
}

// ── Small helpers everyone needs ─────────────────────────────────────────────
// The id put on each rendered element as data-node-id, so a click on the canvas
// can be turned back into a LayerRef. Example: "Button::Outline::label"
const nodeIdSeparator = '::'

export function makeNodeId(layer: LayerRef): string {
  return [layer.component, layer.variant, layer.layerKey].join(nodeIdSeparator)
}

export function parseNodeId(nodeId: string): LayerRef | null {
  const parts = nodeId.split(nodeIdSeparator)
  if (parts.length !== 3) return null
  return { component: parts[0], variant: parts[1], layerKey: parts[2] }
}

export function isSameLayer(a: LayerRef | null, b: LayerRef | null): boolean {
  if (!a || !b) return false
  return a.component === b.component && a.variant === b.variant && a.layerKey === b.layerKey
}
