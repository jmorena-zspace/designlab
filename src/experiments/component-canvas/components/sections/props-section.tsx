import { Switch } from '@/components/ui/switch'
import type { DesignNode, PropControl, PropValue } from '../../types'
import { PropertyRow } from '../controls/property-row'
import { TextField } from '../controls/text-field'
import { TokenSelect } from '../controls/token-select'
import { PanelSection } from './panel-section'

// ─────────────────────────────────────────────────────────────────────────────
// PROPS: the component's own settings (variant, size, disabled, placeholder…).
// Which props appear comes from the workspace (entry.propControls), so each
// component decides what is editable. One control type per prop kind:
//   select → dropdown,  boolean → switch,  text → text field,  number → number field
// ─────────────────────────────────────────────────────────────────────────────

type PropsSectionProps = {
  node: DesignNode
  startingNode: DesignNode | null
  controls: PropControl[]
  onSetProp: (prop: string, value: PropValue | null) => void // null = back to the starting value
}

export function PropsSection({ node, startingNode, controls, onSetProp }: PropsSectionProps) {
  return (
    <PanelSection title="Properties">
      {controls.map((control) => {
        const value = node.props?.[control.name]
        const startingValue = startingNode?.props?.[control.name]
        const label = control.label ?? control.name
        // Changed from how this variant started? Then show the reset ×, which sends null
        // ("back to the starting value", see the RESET RULE in types.ts).
        const isOverridden = value !== startingValue

        return (
          <PropertyRow
            key={control.name}
            label={label}
            isOverridden={isOverridden}
            onReset={() => onSetProp(control.name, null)}
          >
            <PropControlInput control={control} value={value} label={label} onChange={(next) => onSetProp(control.name, next)} />
          </PropertyRow>
        )
      })}
    </PanelSection>
  )
}

// Picks the right input for one prop.
function PropControlInput({
  control,
  value,
  label,
  onChange,
}: {
  control: PropControl
  value: PropValue | undefined
  label: string
  onChange: (value: PropValue) => void
}) {
  if (control.control === 'select') {
    // Reuse the token dropdown: each option is just a plain word here.
    const options = (control.options ?? []).map((option) => ({ className: option, label: option }))
    return (
      <TokenSelect
        ariaLabel={label}
        value={value === undefined ? null : String(value)}
        options={options}
        includeDefaultOption={false}
        defaultHint="Not set"
        onChange={(next) => next !== null && onChange(next)}
      />
    )
  }

  if (control.control === 'boolean') {
    return (
      <div className="flex h-7 items-center">
        <Switch size="sm" aria-label={label} checked={value === true} onCheckedChange={(checked) => onChange(checked)} />
      </div>
    )
  }

  if (control.control === 'number') {
    return (
      <TextField
        type="number"
        ariaLabel={label}
        min={control.min}
        max={control.max}
        value={value === undefined ? '' : String(value)}
        onCommit={(text) => {
          const number = Number(text)
          if (text !== '' && !Number.isNaN(number)) onChange(number)
        }}
      />
    )
  }

  // 'text'
  return <TextField ariaLabel={label} value={value === undefined ? '' : String(value)} onCommit={onChange} />
}
