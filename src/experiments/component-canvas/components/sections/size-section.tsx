import { StyleTokenRow } from '../controls/style-token-row'
import { PanelSection } from './panel-section'
import type { StyleSectionProps } from './style-section-props'

// SIZE: how wide and tall the layer is (w-*, h-*, max-w-*).
// Each row is a token dropdown; "Default" shows what the component looks like now.
export function SizeSection(props: StyleSectionProps) {
  return (
    <PanelSection title="Size">
      <StyleTokenRow property="width" {...props} />
      <StyleTokenRow property="height" {...props} />
      <StyleTokenRow property="maxWidth" {...props} />
    </PanelSection>
  )
}
