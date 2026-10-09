import { memo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { LeftPanelProps } from '../types'
import { ComponentList } from './component-list'
import { panelHeaderHeight, panelPaddingClass } from './controls/panel-styles'
import { StylesPanel } from './styles-panel'

// ─────────────────────────────────────────────────────────────────────────────
// LEFT PANEL: workspace name on top, then two tabs:
//   Components → the component list with each component's layers
//   Styles     → the theme variables (colors, radius) you can edit
// The page decides the panel's width; this fills whatever space it's given.
// ─────────────────────────────────────────────────────────────────────────────

// `memo` = skip re-rendering when none of the props changed (the page keeps its
// callbacks stable, so unrelated updates like the zoom % don't redraw this panel).
export const LeftPanel = memo(function LeftPanel(props: LeftPanelProps) {
  const { workspace, changes, themeVariables, onSetToken } = props
  const componentCount = workspace.components.length

  return (
    <div className="flex h-full w-full flex-col bg-background text-foreground">
      {/* ── Header: which design system is loaded ── */}
      <header className={`flex shrink-0 flex-col justify-center gap-0.5 ${panelPaddingClass}`} style={{ height: panelHeaderHeight }}>
        <h2 className="truncate text-[13px] font-medium">{workspace.name}</h2>
        <p className="text-[11px] text-muted-foreground">
          {componentCount} {componentCount === 1 ? 'component' : 'components'}
        </p>
      </header>

      {/* ── Tabs: dense underline style. min-h-0 lets the content scroll inside the panel. ── */}
      <Tabs defaultValue="components" className="min-h-0 flex-1 gap-0">
        <TabsList variant="line" className={`h-8 w-full shrink-0 justify-start gap-3 border-b border-border/70 py-0 ${panelPaddingClass}`}>
          <TabsTrigger value="components" className="h-full flex-none px-0 text-xs group-data-horizontal/tabs:after:bottom-[-1px]">
            Components
          </TabsTrigger>
          <TabsTrigger value="styles" className="h-full flex-none px-0 text-xs group-data-horizontal/tabs:after:bottom-[-1px]">
            Styles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="components" className="min-h-0">
          <ScrollArea className="h-full">
            <ComponentList {...props} />
          </ScrollArea>
        </TabsContent>
        <TabsContent value="styles" className="min-h-0">
          <ScrollArea className="h-full">
            <StylesPanel themeVariables={themeVariables} changes={changes} onSetToken={onSetToken} />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
})
