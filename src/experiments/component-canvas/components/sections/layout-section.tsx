import { useState } from 'react'
import { ArrowDown, ArrowRight, Minus, Plus } from 'lucide-react'
import type { StyleProperty } from '../../types'
import { AlignmentGrid } from '../controls/alignment-grid'
import { iconButtonClass, iconSize, iconStroke, smallButtonClass } from '../controls/panel-styles'
import { PropertyRow } from '../controls/property-row'
import { SegmentedControl } from '../controls/segmented-control'
import { StyleTokenRow } from '../controls/style-token-row'
import { PanelSection } from './panel-section'
import { isStyleOverridden, resetStyle, type StyleSectionProps } from './style-section-props'

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT: Figma's "auto layout", which in CSS is flexbox.
//
// - If the layer is a flex container (its own class says flex, or the component
//   already renders it as flex), we show direction, wrap, the 3×3 alignment grid,
//   gap and padding.
// - Otherwise we show one "Add auto layout" button that adds the `flex` class.
// Every control writes a real Tailwind class (flex-col, items-center, gap-2…).
// ─────────────────────────────────────────────────────────────────────────────

const paddingSideProperties: StyleProperty[] = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']
const paddingSideLabels = ['Top', 'Right', 'Bottom', 'Left']

export function LayoutSection(props: StyleSectionProps) {
  const { node, computed, onSetStyle } = props

  // Is this a flex container? The layer's own class wins; otherwise trust the browser.
  const displayValue = node.style?.display ?? computed?.display ?? ''
  const isFlex = displayValue === 'flex' || displayValue === 'inline-flex'

  // Padding: edit X/Y together (default) or each side, if any side was already edited.
  const hasSideOverrides = paddingSideProperties.some((property) => node.style?.[property])
  const [paddingMode, setPaddingMode] = useState<'axes' | 'sides'>(hasSideOverrides ? 'sides' : 'axes')

  // ── Not flex: offer to turn it on. Inline elements get inline-flex so they stay inline.
  if (!isFlex) {
    const flexClass = computed?.display.startsWith('inline') ? 'inline-flex' : 'flex'
    return (
      <PanelSection title="Layout">
        <button type="button" className={`${smallButtonClass} w-full justify-center bg-muted/60`} onClick={() => onSetStyle('display', flexClass)}>
          <Plus size={iconSize - 1} strokeWidth={iconStroke} className="text-muted-foreground" />
          Add auto layout
        </button>
      </PanelSection>
    )
  }

  // Direction: the class if set, otherwise what the browser says ('row' / 'column').
  const directionClass =
    node.style?.flexDirection ?? (computed?.flexDirection.startsWith('column') ? 'flex-col' : 'flex-row')
  const isColumn = directionClass.startsWith('flex-col')
  const wrapClass = node.style?.flexWrap ?? (computed?.flexWrap === 'wrap' ? 'flex-wrap' : 'flex-nowrap')

  // Removing auto layout: undo our own "add", or switch the component's flex off with `block`.
  function removeAutoLayout() {
    if (isStyleOverridden(props, 'display')) resetStyle(props, 'display')
    else onSetStyle('display', 'block')
  }

  const alignmentOverridden = isStyleOverridden(props, 'justifyContent') || isStyleOverridden(props, 'alignItems')

  return (
    <PanelSection
      title="Layout"
      action={
        <button type="button" className={iconButtonClass} onClick={removeAutoLayout} aria-label="Remove auto layout" title="Remove auto layout">
          <Minus size={iconSize} strokeWidth={iconStroke} />
        </button>
      }
    >
      {/* Direction: → row or ↓ column */}
      <PropertyRow label="Direction" isOverridden={isStyleOverridden(props, 'flexDirection')} onReset={() => resetStyle(props, 'flexDirection')}>
        <SegmentedControl
          ariaLabel="Direction"
          value={isColumn ? 'flex-col' : 'flex-row'}
          onChange={(value) => onSetStyle('flexDirection', value)}
          options={[
            { value: 'flex-row', label: 'Row', icon: <ArrowRight size={iconSize - 1} strokeWidth={iconStroke} /> },
            { value: 'flex-col', label: 'Column', icon: <ArrowDown size={iconSize - 1} strokeWidth={iconStroke} /> },
          ]}
        />
      </PropertyRow>

      <PropertyRow label="Wrap" isOverridden={isStyleOverridden(props, 'flexWrap')} onReset={() => resetStyle(props, 'flexWrap')}>
        <SegmentedControl
          ariaLabel="Wrap"
          value={wrapClass === 'flex-wrap' ? 'flex-wrap' : 'flex-nowrap'}
          onChange={(value) => onSetStyle('flexWrap', value)}
          options={[
            { value: 'flex-nowrap', label: 'No wrap' },
            { value: 'flex-wrap', label: 'Wrap' },
          ]}
        />
      </PropertyRow>

      {/* The 3×3 grid sets justify + align together (see alignment-grid.tsx). */}
      <PropertyRow
        label="Align"
        alignTop
        isOverridden={alignmentOverridden}
        onReset={() => {
          resetStyle(props, 'justifyContent')
          resetStyle(props, 'alignItems')
        }}
      >
        <AlignmentGrid
          direction={isColumn ? 'column' : 'row'}
          justify={node.style?.justifyContent ?? computed?.justifyContent ?? null}
          align={node.style?.alignItems ?? computed?.alignItems ?? null}
          onChange={(justifyClass, alignClass) => {
            onSetStyle('justifyContent', justifyClass)
            onSetStyle('alignItems', alignClass)
          }}
        />
      </PropertyRow>

      <StyleTokenRow property="gap" {...props} />

      {/* Padding: X/Y pairs, or one control per side. */}
      <PropertyRow label="Padding">
        <SegmentedControl
          ariaLabel="Padding mode"
          value={paddingMode}
          onChange={setPaddingMode}
          options={[
            { value: 'axes', label: 'X / Y', title: 'Edit horizontal and vertical padding' },
            { value: 'sides', label: '4 sides', title: 'Edit each side separately' },
          ]}
        />
      </PropertyRow>
      {paddingMode === 'axes' ? (
        <>
          <StyleTokenRow property="paddingX" label="Horizontal" {...props} />
          <StyleTokenRow property="paddingY" label="Vertical" {...props} />
        </>
      ) : (
        paddingSideProperties.map((property, index) => (
          <StyleTokenRow key={property} property={property} label={paddingSideLabels[index]} {...props} />
        ))
      )}
    </PanelSection>
  )
}
