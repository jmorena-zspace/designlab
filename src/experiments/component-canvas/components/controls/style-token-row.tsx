import type { StyleProperty } from '../../types'
import { stylePropertyLabels } from '../../data/tailwind-scale'
import {
  colorProperties,
  isStyleOverridden,
  optionsFor,
  resetStyle,
  type StyleSectionProps,
} from '../sections/style-section-props'
import { PropertyRow } from './property-row'
import { TokenSelect } from './token-select'

// ─────────────────────────────────────────────────────────────────────────────
// STYLE TOKEN ROW: "label + token dropdown + reset" for ONE style property.
// Most rows in the right panel are exactly this, so each section can just write
//   <StyleTokenRow property="gap" {...props} />
// ─────────────────────────────────────────────────────────────────────────────

type StyleTokenRowProps = StyleSectionProps & {
  property: StyleProperty
  label?: string // defaults to the shared label ('Gap', 'Radius'…)
}

export function StyleTokenRow({ property, label, ...props }: StyleTokenRowProps) {
  const rowLabel = label ?? stylePropertyLabels[property]
  return (
    <PropertyRow label={rowLabel} isOverridden={isStyleOverridden(props, property)} onReset={() => resetStyle(props, property)}>
      <StyleTokenSelect property={property} label={rowLabel} {...props} />
    </PropertyRow>
  )
}

// Just the dropdown (no row).
export function StyleTokenSelect({ property, label, ...props }: StyleTokenRowProps) {
  const isColor = colorProperties.includes(property)
  const options = optionsFor(property, props.colorClasses)
  const measuredValue = props.computed?.[property]

  // What "Default" means for this layer: the class it started with (like 'w-80'),
  // or, when it started with none, what the browser measures right now.
  const startingClass = props.startingNode?.style?.[property]
  const startingOption = options.find((option) => option.className === startingClass)
  const defaultSwatch = startingOption ? props.swatchColorFor(startingOption) : (measuredValue ?? null)
  const defaultHint = startingClass ?? (isColor ? undefined : measuredValue)

  return (
    <TokenSelect
      ariaLabel={label ?? stylePropertyLabels[property]}
      value={props.node.style?.[property] ?? null}
      options={options}
      onChange={(value) => props.onSetStyle(property, value)}
      defaultHint={defaultHint}
      defaultSwatch={isColor ? defaultSwatch : null}
      isColor={isColor}
      swatchColorFor={props.swatchColorFor}
    />
  )
}
