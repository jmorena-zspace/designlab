import { useMemo } from 'react'
import type { CanvasChange, LayerRef, Workspace } from '../../types'
import { variantToJsx } from '../../export-changes'
import { CopyButton } from '../controls/copy-button'
import { PanelSection } from './panel-section'

// ─────────────────────────────────────────────────────────────────────────────
// CODE: the selected variant written as JSX (with your edits), ready to copy.
// The JSX itself is built by export-changes.ts; this section only shows it.
// Collapsed by default because it's long and only needed at hand-off time.
// ─────────────────────────────────────────────────────────────────────────────

// TWEAK: codeMaxHeight — the code block scrolls after this many pixels (try 160 to 400)
const codeMaxHeight = 240

type CodeSectionProps = {
  workspace: Workspace
  changes: CanvasChange[]
  selection: LayerRef // which component + variant to write out
}

export function CodeSection({ workspace, changes, selection }: CodeSectionProps) {
  const { component, variant } = selection
  // useMemo: only rebuild the JSX text when the variant or the changes change
  // (not when you just hover something or open a dropdown).
  const jsx = useMemo(
    () => variantToJsx(workspace, component, variant, changes),
    [workspace, component, variant, changes],
  )

  return (
    <PanelSection title="Code" defaultOpen={false} action={<CopyButton getText={() => jsx} ariaLabel="Copy JSX" />}>
      <pre
        className="overflow-auto rounded-md bg-muted/60 p-2 font-mono text-[11px] leading-relaxed text-foreground/90"
        style={{ maxHeight: codeMaxHeight }}
      >
        {jsx}
      </pre>
    </PanelSection>
  )
}
