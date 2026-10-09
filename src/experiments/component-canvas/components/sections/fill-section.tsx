import { StyleTokenRow } from '../controls/style-token-row'
import { PanelSection } from './panel-section'
import type { StyleSectionProps } from './style-section-props'

// FILL: the background color (a theme token like bg-primary) and the opacity.
// Each row is a token dropdown; "Default" shows what the component looks like now.
export function FillSection(props: StyleSectionProps) {
  return (
    <PanelSection title="Fill">
      <StyleTokenRow property="background" {...props} />
      <StyleTokenRow property="opacity" {...props} />
    </PanelSection>
  )
}
