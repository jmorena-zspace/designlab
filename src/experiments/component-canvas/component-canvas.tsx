import { useMemo, useRef, useState } from 'react'
import { InfoExplainer } from '@/components/info/info-explainer'
import { TooltipProvider } from '@/components/ui/tooltip'
import { LeftPanel } from './components/left-panel'
import { RightPanel } from './components/right-panel'
import { Stage } from './components/stage-iframe'
import { Toolbar } from './components/toolbar'
import { parseThemeVariables } from './parse-theme'
import type { CameraHandle } from './types'
import { useCanvasState } from './use-canvas-state'
import { useKeyboardShortcuts } from './use-keyboard-shortcuts'
import { shadcnDemoWorkspace } from './workspaces/shadcn-demo/workspace'

// ─────────────────────────────────────────────────────────────────────────────
// EXPERIMENT: Component Canvas
// A Figma-like editor that shows REAL React components on an infinite canvas.
// Click a layer, change its props, text and Tailwind-token styles, then export
// the changes. This file only wires the pieces together:
//
//   ┌────────────┬──────────────────────────────┬──────────────┐
//   │ LeftPanel  │ Stage (the iframe canvas)    │ RightPanel   │
//   │ components │                              │ properties   │
//   │ + styles   │        [ floating toolbar ]  │ + export     │
//   └────────────┴──────────────────────────────┴──────────────┘
// ─────────────────────────────────────────────────────────────────────────────

// TWEAK: workspace — which design system the canvas shows. A future imported
// project will be another folder in workspaces/ with its own workspace object.
const workspace = shadcnDemoWorkspace

// TWEAK: leftPanelWidth / rightPanelWidth — panel widths in pixels (try 220 to 320).
const leftPanelWidth = 248
const rightPanelWidth = 272

// TWEAK: toolbarZoomStep — how much the toolbar's + / − buttons zoom.
// 1.25 = 25% closer per click; zooming out uses the opposite (1 / 1.25 = 0.8).
const toolbarZoomStep = 1.25

// TWEAK: toolbarBottomOffsetClass — distance of the floating toolbar from the bottom
// of the canvas, as a Tailwind class (bottom-4 = 16px; try bottom-2 to bottom-8).
const toolbarBottomOffsetClass = 'bottom-4'

export default function ComponentCanvasExperiment() {
  // All edits, selection, undo/redo and autosave live in this one hook.
  const canvas = useCanvasState(workspace)

  // The theme variables (--primary, --radius…) read from the workspace CSS.
  // useMemo means we only read the CSS once, not on every render.
  const themeVariables = useMemo(() => parseThemeVariables(workspace.css), [])

  // The camera (pan/zoom) lives inside the Stage. The Stage fills in this ref with
  // functions we can call: zoomBy, zoomToFit, focusComponent.
  const cameraRef = useRef<CameraHandle>(null)

  // The current zoom (1 = 100%), reported by the Stage, shown in the toolbar.
  const [zoom, setZoom] = useState(1)

  // The iframe's document, reported by the Stage once it's ready. Panels use it to
  // measure rendered elements, and the keyboard shortcuts listen to it.
  const [stageDocument, setStageDocument] = useState<Document | null>(null)

  useKeyboardShortcuts({
    workspace,
    changes: canvas.changes,
    selection: canvas.selection,
    mode: canvas.mode,
    stageDocument,
    cameraRef,
    select: canvas.select,
    setMode: canvas.setMode,
    toggleHidden: canvas.toggleHidden,
    undo: canvas.undo,
    redo: canvas.redo,
  })

  return (
    // TooltipProvider lets every tooltip inside share one timing setup.
    <TooltipProvider>
      {/* h-svh = exactly the screen height; overflow-hidden stops the page from scrolling. */}
      <main className="flex h-svh w-full overflow-hidden bg-background text-foreground">
        {/* ── Left: components, layers and theme tokens ── */}
        <aside className="shrink-0 border-r border-border" style={{ width: leftPanelWidth }}>
          <LeftPanel
            workspace={workspace}
            changes={canvas.changes}
            themeVariables={themeVariables}
            selection={canvas.selection}
            hovered={canvas.hovered}
            onSelect={canvas.select}
            onHover={canvas.hover}
            onFocusComponent={(componentName: string) => cameraRef.current?.focusComponent(componentName)}
            onToggleHidden={canvas.toggleHidden}
            onSetToken={canvas.setToken}
          />
        </aside>

        {/* ── Center: the canvas. `relative` lets the toolbar float on top of it. ── */}
        {/* min-w-0 lets this area shrink instead of pushing the right panel off screen. */}
        <section className="relative min-w-0 flex-1">
          <Stage
            workspace={workspace}
            changes={canvas.changes}
            selection={canvas.selection}
            hovered={canvas.hovered}
            mode={canvas.mode}
            frameThemes={canvas.frameThemes}
            cameraRef={cameraRef}
            onSelect={canvas.select}
            onHover={canvas.hover}
            onTextEdit={canvas.setText}
            onToggleFrameTheme={canvas.toggleFrameTheme}
            onZoomChange={setZoom}
            onStageDocument={setStageDocument}
          />

          {/* Floating toolbar, centered at the bottom (left-1/2 + -translate-x-1/2 centers it). */}
          <div className={`absolute left-1/2 -translate-x-1/2 ${toolbarBottomOffsetClass}`}>
            <Toolbar
              mode={canvas.mode}
              onModeChange={canvas.setMode}
              zoom={zoom}
              onZoomIn={() => cameraRef.current?.zoomBy(toolbarZoomStep)}
              onZoomOut={() => cameraRef.current?.zoomBy(1 / toolbarZoomStep)}
              onZoomToFit={() => cameraRef.current?.zoomToFit()}
              canUndo={canvas.canUndo}
              canRedo={canvas.canRedo}
              onUndo={canvas.undo}
              onRedo={canvas.redo}
              changeCount={canvas.changes.length}
              onResetAll={canvas.resetAll}
            />
          </div>
        </section>

        {/* ── Right: properties of the selected layer + changes/export ── */}
        <aside className="shrink-0 border-l border-border" style={{ width: rightPanelWidth }}>
          <RightPanel
            workspace={workspace}
            changes={canvas.changes}
            themeVariables={themeVariables}
            frameThemes={canvas.frameThemes}
            selection={canvas.selection}
            scope={canvas.scope}
            onScopeChange={canvas.setScope}
            stageDocument={stageDocument}
            onSetStyle={canvas.setStyle}
            onSetProp={canvas.setProp}
            onSetText={canvas.setText}
          />
        </aside>
      </main>

      <ComponentCanvasExplainer />
    </TooltipProvider>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// The "How this was built" panel behind the info button.
// Kept in its own small component so the page above stays easy to read.
// ─────────────────────────────────────────────────────────────────────────────
function ComponentCanvasExplainer() {
  return (
    <InfoExplainer title="How this was built">
      <p>
        <strong>The idea:</strong> Figma never uses your real components. This canvas does. It
        renders actual React components (shadcn Button, Card, Input…) and lets you click their
        layers and change props, text and styles. Every style is a Tailwind token (
        <code>gap-2</code>, <code>bg-primary</code>, <code>rounded-lg</code>), never a raw px or
        hex value, so whatever you design can go straight back into code.
      </p>

      <h3 className="font-semibold text-foreground">Workspaces (one design system each)</h3>
      <p>
        Everything project-specific sits behind one <code>Workspace</code> object (
        <code>workspaces/shadcn-demo/workspace.ts</code>): its compiled CSS, its color classes,
        its components with starting "variants" (<code>components.ts</code>), and optional
        providers. Icon layers use a tiny canvas-only wrapper (<code>icon.tsx</code>) that
        looks up a lucide icon by name; the export writes the real icon instead. Today it holds
        DesignLab's own shadcn components, loaded as if they came from another project.
      </p>
      <p>Planned for later, and already designed for:</p>
      <ul className="list-disc space-y-1 pl-4">
        <li>
          <strong>Import script:</strong> copy another project's <code>components/</code> and CSS
          into a new workspace folder, and generate its color classes and starting variants.
        </li>
        <li>
          <strong>Auto-mocking:</strong> real components import APIs, stores, routers and env
          vars. Those will be swapped for harmless stubs, and <code>fetch</code> will be answered
          with sample data inside the canvas.
        </li>
        <li>
          <strong>Placeholder generation:</strong> sample text, lists and no-op callbacks made
          from each component's TypeScript prop types.
        </li>
        <li>
          <strong>Black-box editing:</strong> select any rendered element of a component that
          doesn't expose its parts, and store the edit against that element.
        </li>
      </ul>

      <h3 className="font-semibold text-foreground">The stage is an iframe</h3>
      <p>
        An imported project brings its own Tailwind reset and theme, which would clash with the
        editor's panels. So the canvas renders inside an <code>&lt;iframe&gt;</code> that gets
        only the workspace CSS. React draws into it with a portal, so it's still one app with
        shared state. Each variant has an error boundary: a broken component shows a small card
        instead of crashing the page.
      </p>

      <h3 className="font-semibold text-foreground">Moving around the canvas</h3>
      <ul className="list-disc space-y-1 pl-4">
        <li>Scroll to pan; <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + scroll or pinch to zoom.</li>
        <li>
          Hold <kbd>Space</kbd> and drag, or drag with the middle mouse button, to pan.
        </li>
        <li>
          Click a component in the left list to glide to it. Only these smooth jumps (and zoom to
          fit) are animated with GSAP; everyday panning and zooming follow your hand directly.
        </li>
        <li>
          Selecting works like Figma: the first click selects the whole component, a second click
          drills into the part you clicked (like its text). Double-click text to edit it in place.
        </li>
      </ul>

      <h3 className="font-semibold text-foreground">Why classes are written out in full</h3>
      <p>
        Tailwind only creates CSS for class names it can literally read in your files. Writing{' '}
        <code>{'`gap-${n}`'}</code> would produce no CSS at all. So{' '}
        <code>data/tailwind-scale.ts</code> (spacing, sizes, text, radius…) and the workspace's{' '}
        <code>token-classes.ts</code> (theme colors) list every class in full, and the
        workspace CSS points Tailwind at both with <code>@source</code>.
      </p>
      <p>
        Theme variables (<code>--primary</code>, <code>--radius</code>…) are read straight from
        the workspace CSS by <code>parse-theme.ts</code>, so the Styles tab adapts to whatever
        project is loaded. Editing one only changes the canvas.
      </p>

      <h3 className="font-semibold text-foreground">The change list and export</h3>
      <p>
        Your edits never touch the starting components. They're kept as a list ("Button › Label,
        all variants, padding X → px-4"), and <code>apply-changes.ts</code> replays that list on
        top of the starting trees every render. That makes undo/redo simple (go back to an
        earlier list) and export simple: <code>export-changes.ts</code> turns the list into
        readable diffs, JSX, token CSS, and a Markdown hand-off a developer or Claude can apply
        to the real project. Edits autosave in your browser (localStorage).
      </p>
      <p>
        Every reset × just says "back to how it started", so resetting removes the edit from the
        list instead of adding a new one.
      </p>
      <p>
        <strong>All variants / This variant</strong> (right panel) decides whether an edit
        changes the layer in every variant of the component, or only in the one you clicked.
      </p>

      <h3 className="font-semibold text-foreground">Design vs Interact</h3>
      <p>
        In <strong>Design</strong> mode, clicks select layers and the components don't react. In{' '}
        <strong>Interact</strong> mode, clicks go to the real components, like a prototype (tick
        the checkbox, type in the input), and the selection is cleared. Press <kbd>P</kbd> to
        switch.
      </p>

      <h3 className="font-semibold text-foreground">Keyboard shortcuts</h3>
      <ul className="list-disc space-y-1 pl-4">
        <li>
          <kbd>Esc</kbd> select the parent layer (deselect at the top), Design mode only
        </li>
        <li>
          <kbd>Enter</kbd> select the first child layer
        </li>
        <li>
          <kbd>⌘Z</kbd> undo, <kbd>⇧⌘Z</kbd> or <kbd>⌘Y</kbd> redo
        </li>
        <li>
          <kbd>Delete</kbd> / <kbd>⌫</kbd> hide or show the selected layer
        </li>
        <li>
          <kbd>P</kbd> Design / Interact
        </li>
        <li>
          <kbd>⇧1</kbd> zoom to fit, <kbd>⌘=</kbd> / <kbd>⌘-</kbd> zoom in / out
        </li>
      </ul>

      <h3 className="font-semibold text-foreground">Add a component</h3>
      <ol className="list-decimal space-y-1 pl-4">
        <li>
          Open <code>workspaces/shadcn-demo/components.ts</code>.
        </li>
        <li>
          Add an entry: a <code>name</code>, a <code>render</code> map of the real components it
          uses (e.g. <code>{'{ Slider }'}</code>), optional <code>propControls</code>, and one or
          more <code>variants</code>.
        </li>
        <li>
          Each variant is a small tree of layers. Give each layer a <code>layerKey</code> that
          stays the same in every variant, so "All variants" edits line up.
        </li>
      </ol>

      <h3 className="font-semibold text-foreground">Values to tweak (look for TWEAK)</h3>
      <ul className="list-disc space-y-1 pl-4">
        <li>
          <code>component-canvas.tsx</code>: panel widths, toolbar zoom step, toolbar position.
        </li>
        <li>
          <code>use-canvas-state.ts</code>: autosave key and delay, how quickly repeated edits
          merge into one undo step, max undo steps.
        </li>
        <li>
          <code>use-keyboard-shortcuts.ts</code>: zoom in/out factors.
        </li>
        <li>
          <code>export-changes.ts</code>: JSX indentation, Markdown title, the arrow symbol.
        </li>
        <li>
          <code>parse-theme.ts</code>: which CSS selectors hold the light and dark theme.
        </li>
        <li>
          <code>data/tailwind-scale.ts</code>: which classes each dropdown offers.
        </li>
        <li>
          <code>components/infinite-canvas.tsx</code>: zoom limits (<code>minZoom</code> /{' '}
          <code>maxZoom</code>), zoom speed, camera animation length, background dots.
        </li>
        <li>
          <code>components/stage-iframe.tsx</code> and <code>component-frame.tsx</code>: frames per
          row, space between frames, variants per row.
        </li>
      </ul>
    </InfoExplainer>
  )
}
