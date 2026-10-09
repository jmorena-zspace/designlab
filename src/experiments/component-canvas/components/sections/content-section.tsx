import type { DesignNode } from '../../types'
import { PropertyRow } from '../controls/property-row'
import { TextField } from '../controls/text-field'
import { PanelSection } from './panel-section'

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT: the words shown by the layer.
// - Selecting a text layer edits that text.
// - Selecting a layer whose children include text (a Button and its label) shows
//   one field per text child, so you don't have to dig into the layer tree.
// Edits are saved on Enter or when the field loses focus.
// ─────────────────────────────────────────────────────────────────────────────

type ContentSectionProps = {
  textNodes: DesignNode[] // the text layers to edit (the node itself, or its text children)
  onSetText: (layerKey: string, text: string) => void
}

export function ContentSection({ textNodes, onSetText }: ContentSectionProps) {
  return (
    <PanelSection title="Content">
      {textNodes.map((textNode) => (
        <PropertyRow key={textNode.layerKey} label={textNodes.length > 1 ? textNode.name : 'Text'}>
          <TextField
            ariaLabel={`${textNode.name} text`}
            value={textNode.text ?? ''}
            placeholder="Empty"
            onCommit={(text) => onSetText(textNode.layerKey, text)}
          />
        </PropertyRow>
      ))}
    </PanelSection>
  )
}

