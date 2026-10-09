import { useLayoutEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// EDITABLE TEXT: the span used for every 'text' layer on the canvas.
//
// Normally it's a plain <span>. When the user double-clicks it (in Design mode), the
// stage marks it as "being edited" and it turns into a contentEditable span with all
// its words selected, like double-clicking text in Figma.
//   Enter  or clicking away → keep the new words (calls onCommit)
//   Escape                  → throw the edit away (calls onCancel)
//
// HOW: while editing, React does NOT render the words as children. We put the text in
// once (in the layout effect) and then let the browser own it. If React and the browser
// both managed the same text node, React could lose track of it after the user deletes
// everything and types again. The `key` below also swaps in a fresh span when editing
// ends, so React starts clean.
// ─────────────────────────────────────────────────────────────────────────────

type EditableTextProps = {
  nodeId: string // goes on data-node-id so the canvas can select this text
  text: string
  className?: string
  isEditing: boolean
  onCommit: (newText: string) => void
  onCancel: () => void
}

export function EditableText({ nodeId, text, className, isEditing, onCommit, onCancel }: EditableTextProps) {
  if (!isEditing) {
    return (
      <span key="view" data-node-id={nodeId} data-node-kind="text" className={className}>
        {text}
      </span>
    )
  }
  return (
    <EditingSpan
      key="editing"
      nodeId={nodeId}
      text={text}
      className={className}
      onCommit={onCommit}
      onCancel={onCancel}
    />
  )
}

type EditingSpanProps = Omit<EditableTextProps, 'isEditing'>

function EditingSpan({ nodeId, text, className, onCommit, onCancel }: EditingSpanProps) {
  const spanRef = useRef<HTMLSpanElement>(null)
  // Enter commits and then the span disappears, which can also fire `blur`.
  // This flag makes sure we only finish once.
  const finishedRef = useRef(false)

  // When editing starts: fill in the words, focus the span and select all of its text.
  // The span lives inside the stage iframe, so we use ITS document/window for selection.
  useLayoutEffect(() => {
    const span = spanRef.current
    if (!span) return
    span.textContent = text
    span.focus()
    const stageWindow = span.ownerDocument.defaultView
    const selection = stageWindow?.getSelection()
    if (!selection) return
    const range = span.ownerDocument.createRange()
    range.selectNodeContents(span)
    selection.removeAllRanges()
    selection.addRange(range)
    // Only on mount: `text` can't change while the user is typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function finish(keepChanges: boolean) {
    if (finishedRef.current) return
    finishedRef.current = true
    const newText = spanRef.current?.textContent ?? text
    // Unchanged words count as a cancel, so no empty "change" is recorded.
    if (keepChanges && newText !== text) onCommit(newText)
    else onCancel()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    // Keep keys away from the real component around us (e.g. space/enter on a Button).
    event.stopPropagation()
    if (event.key === 'Enter') {
      event.preventDefault() // no new line
      finish(true)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      finish(false)
    }
  }

  return (
    <span
      ref={spanRef}
      data-node-id={nodeId}
      data-node-kind="text"
      className={className ? `${className} cc-text-editing` : 'cc-text-editing'}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      spellCheck={false}
      onKeyDown={handleKeyDown}
      // Clicking anywhere else keeps the edit, like Figma.
      onBlur={() => finish(true)}
    />
  )
}
