import { useMemo } from 'react'
import type { CanvasChange, ThemeVariable, Workspace } from '../../types'
import { changesToMarkdown, describeChanges, tokenChangesToCss } from '../../export-changes'
import { CopyButton } from '../controls/copy-button'
import { PanelSection } from './panel-section'

// ─────────────────────────────────────────────────────────────────────────────
// CHANGES: everything you've edited, as a readable list, plus copy buttons for
// the hand-off (a Markdown summary, and the CSS for edited theme tokens).
// Shown in the right panel when nothing is selected.
// The text itself is built by export-changes.ts; this section just displays it.
// ─────────────────────────────────────────────────────────────────────────────

type ChangesSectionProps = {
  workspace: Workspace
  changes: CanvasChange[]
  themeVariables: ThemeVariable[]
}

export function ChangesSection({ workspace, changes, themeVariables }: ChangesSectionProps) {
  // useMemo: only rebuild the list when the changes actually change.
  const descriptions = useMemo(
    () => describeChanges(workspace, changes, themeVariables),
    [workspace, changes, themeVariables],
  )
  const tokenCss = useMemo(() => tokenChangesToCss(themeVariables, changes), [themeVariables, changes])
  const hasChanges = descriptions.length > 0

  return (
    <PanelSection title={hasChanges ? `Changes · ${descriptions.length}` : 'Changes'}>
      {!hasChanges && (
        <p className="py-1 text-xs text-muted-foreground">No changes yet. Edits you make show up here.</p>
      )}

      {/* One line per change: title, then scope and the before → after detail. */}
      {hasChanges && (
        <ul className="-mx-1 flex flex-col">
          {descriptions.map((description) => (
            <li key={description.id} className="rounded-md px-1 py-1.5 transition-colors hover:bg-muted/60">
              <div className="truncate text-xs text-foreground" title={description.title}>
                {description.title}
              </div>
              <div className="flex gap-1.5 text-[11px] text-muted-foreground">
                <span className="shrink-0">{description.scope}</span>
                <span className="text-muted-foreground/50">·</span>
                <span className="truncate font-mono" title={description.detail}>
                  {description.detail}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Hand-off buttons */}
      <div className="-mx-2 flex flex-wrap gap-0.5 pt-1">
        <CopyButton
          label="Copy summary"
          ariaLabel="Copy a Markdown summary of all changes"
          disabled={!hasChanges}
          getText={() => changesToMarkdown(workspace, themeVariables, changes)}
        />
        <CopyButton label="Copy token CSS" disabled={tokenCss === ''} getText={() => tokenCss} />
      </div>

      {tokenCss !== '' && (
        <pre className="max-h-48 overflow-auto rounded-md bg-muted/60 p-2 font-mono text-[11px] leading-relaxed text-foreground/90">
          {tokenCss}
        </pre>
      )}
    </PanelSection>
  )
}
