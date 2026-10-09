import { StyleTokenRow } from '../controls/style-token-row'
import { PanelSection } from './panel-section'
import type { StyleSectionProps } from './style-section-props'

// TYPOGRAPHY: text size, weight, color, alignment, letter spacing and line height.
// Shown for text layers and for components that contain text (like a Button).
// Each row is a token dropdown; "Default" shows what the component looks like now.
export function TypographySection(props: StyleSectionProps) {
  return (
    <PanelSection title="Typography">
      <StyleTokenRow property="fontSize" {...props} />
      <StyleTokenRow property="fontWeight" {...props} />
      <StyleTokenRow property="textColor" {...props} />
      <StyleTokenRow property="textAlign" {...props} />
      <StyleTokenRow property="letterSpacing" {...props} />
      <StyleTokenRow property="lineHeight" {...props} />
    </PanelSection>
  )
}
