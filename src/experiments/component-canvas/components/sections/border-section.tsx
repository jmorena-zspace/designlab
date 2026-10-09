import { StyleTokenRow } from '../controls/style-token-row'
import { PanelSection } from './panel-section'
import type { StyleSectionProps } from './style-section-props'

// BORDER: corner radius, border width and color, and the drop shadow.
// Each row is a token dropdown; "Default" shows what the component looks like now.
export function BorderSection(props: StyleSectionProps) {
  return (
    <PanelSection title="Border">
      <StyleTokenRow property="borderRadius" {...props} />
      <StyleTokenRow property="borderWidth" {...props} />
      <StyleTokenRow property="borderColor" {...props} />
      <StyleTokenRow property="shadow" {...props} />
    </PanelSection>
  )
}
