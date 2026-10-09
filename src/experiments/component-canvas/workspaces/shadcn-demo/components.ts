import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Icon } from './icon'
import type { ComponentEntry, DesignNode, PropControl, PropValue, StyleMap } from '../../types'

// ─────────────────────────────────────────────────────────────────────────────
// THE COMPONENTS of the "shadcn-demo" workspace: what shows up on the canvas.
//
// Each entry says:
//   - which real React components it uses (`render`)
//   - which props the right panel may edit (`propControls`)
//   - its variants, each one a small tree of layers filled with placeholder content
//
// IMPORTANT: all variants of one component use the SAME layerKeys for the same layers
// ('root', 'label', 'icon'…). That's how an edit with scope "All variants" finds the
// matching layer in every variant.
//
// Every class name written here must exist in data/tailwind-scale.ts (or token-classes.ts),
// because those are the files Tailwind reads for the stage. This file is NOT scanned.
//
// TO ADD A COMPONENT: import it, write a small tree helper like `buttonTree` below, and
// add an entry to `shadcnDemoComponents` at the bottom.
// ─────────────────────────────────────────────────────────────────────────────

// ── Icon ─────────────────────────────────────────────────────────────────────
// Icon layers store an icon NAME; icon.tsx turns it into the real lucide icon.
// These are the names the right panel offers (keep in sync with icon.tsx).
const iconNames = ['Plus', 'ArrowRight', 'Check', 'Mail', 'Download', 'Trash2', 'Star', 'Sparkles']

const iconControls: PropControl[] = [{ name: 'icon', control: 'select', options: iconNames }]

// ── Small helpers to build layers ────────────────────────────────────────────
// A text layer: what you double-click to edit words on the canvas.
function textLayer(layerKey: string, name: string, text: string, style?: StyleMap): DesignNode {
  return { layerKey, type: 'text', name, text, style }
}

// An icon layer. `hidden` lets every variant carry the icon layer (so layerKeys match)
// while only the "With icon" variants actually show it.
function iconLayer(iconName: string, hidden: boolean): DesignNode {
  return {
    layerKey: 'icon',
    type: 'Icon',
    name: 'Icon',
    // data-icon tells shadcn's button/badge styles "there's an icon at the start",
    // so they tighten the left padding (see `has-data-[icon=inline-start]` in button.tsx).
    props: { icon: iconName, 'data-icon': 'inline-start' },
    hidden,
  }
}

// ── Button ───────────────────────────────────────────────────────────────────
// Options copied from the `buttonVariants` in src/components/ui/button.tsx.
const buttonVariantOptions = ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link']
const buttonSizeOptions = ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg']

// Button > (Icon, Label). `showIcon` decides whether the icon layer is visible.
function buttonTree(props: Record<string, PropValue>, label: string, showIcon = false): DesignNode {
  return {
    layerKey: 'root',
    type: 'Button',
    name: 'Button',
    props,
    children: [iconLayer('Plus', !showIcon), textLayer('label', 'Label', label)],
  }
}

const buttonEntry: ComponentEntry = {
  name: 'Button',
  group: 'Actions',
  description: 'Triggers an action, like saving or sending.',
  render: { Button, Icon },
  propControls: {
    Button: [
      { name: 'variant', control: 'select', options: buttonVariantOptions },
      { name: 'size', control: 'select', options: buttonSizeOptions },
      { name: 'disabled', control: 'boolean' },
    ],
    Icon: iconControls,
  },
  variants: [
    { name: 'Default', tree: buttonTree({ variant: 'default' }, 'Save changes') },
    { name: 'Secondary', tree: buttonTree({ variant: 'secondary' }, 'Invite teammates') },
    { name: 'Outline', tree: buttonTree({ variant: 'outline' }, 'View details') },
    { name: 'Ghost', tree: buttonTree({ variant: 'ghost' }, 'Cancel') },
    { name: 'Destructive', tree: buttonTree({ variant: 'destructive' }, 'Delete project') },
    { name: 'Link', tree: buttonTree({ variant: 'link' }, 'Learn more') },
    { name: 'Small', tree: buttonTree({ variant: 'default', size: 'sm' }, 'Apply') },
    { name: 'Large', tree: buttonTree({ variant: 'default', size: 'lg' }, 'Get started') },
    { name: 'With icon', tree: buttonTree({ variant: 'default' }, 'New project', true) },
    { name: 'Disabled', tree: buttonTree({ variant: 'default', disabled: true }, 'Publishing…') },
  ],
}

// ── Badge ────────────────────────────────────────────────────────────────────
// Options copied from `badgeVariants` in src/components/ui/badge.tsx.
const badgeVariantOptions = ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link']

function badgeTree(variant: string, label: string, showIcon = false): DesignNode {
  return {
    layerKey: 'root',
    type: 'Badge',
    name: 'Badge',
    props: { variant },
    children: [iconLayer('Check', !showIcon), textLayer('label', 'Label', label)],
  }
}

const badgeEntry: ComponentEntry = {
  name: 'Badge',
  group: 'Display',
  description: 'A small status or category tag.',
  render: { Badge, Icon },
  propControls: {
    Badge: [{ name: 'variant', control: 'select', options: badgeVariantOptions }],
    Icon: iconControls,
  },
  variants: [
    { name: 'Default', tree: badgeTree('default', 'New') },
    { name: 'Secondary', tree: badgeTree('secondary', 'Draft') },
    { name: 'Destructive', tree: badgeTree('destructive', 'Overdue') },
    { name: 'Outline', tree: badgeTree('outline', 'Archived') },
    { name: 'With icon', tree: badgeTree('secondary', 'Verified', true) },
  ],
}

// ── Card (a composite: many layers inside) ───────────────────────────────────
// Card
// ├── Header
// │   ├── Title > text
// │   ├── Description > text
// │   └── Action > Button > text   (hidden unless `showAction`)
// ├── Content > text
// └── Footer > Button > text
function cardTree(cardProps: Record<string, PropValue>, showAction = false): DesignNode {
  return {
    layerKey: 'root',
    type: 'Card',
    name: 'Card',
    props: cardProps,
    // TWEAK: the card's starting width. Any width class from tailwind-scale.ts works.
    style: { width: 'w-80' },
    children: [
      {
        layerKey: 'header',
        type: 'CardHeader',
        name: 'Header',
        children: [
          {
            layerKey: 'title',
            type: 'CardTitle',
            name: 'Title',
            children: [textLayer('title-text', 'Title text', 'Team workspace')],
          },
          {
            layerKey: 'description',
            type: 'CardDescription',
            name: 'Description',
            children: [textLayer('description-text', 'Description text', 'Invite your team and start sharing designs.')],
          },
          {
            layerKey: 'action',
            type: 'CardAction',
            name: 'Action',
            hidden: !showAction,
            children: [
              {
                layerKey: 'action-button',
                type: 'Button',
                name: 'Action button',
                props: { variant: 'ghost', size: 'sm' },
                children: [textLayer('action-label', 'Action label', 'Edit')],
              },
            ],
          },
        ],
      },
      {
        layerKey: 'content',
        type: 'CardContent',
        name: 'Content',
        children: [
          textLayer(
            'content-text',
            'Body text',
            'Everyone on the Pro plan gets unlimited projects, version history and shared libraries.',
          ),
        ],
      },
      {
        layerKey: 'footer',
        type: 'CardFooter',
        name: 'Footer',
        children: [
          {
            layerKey: 'footer-button',
            type: 'Button',
            name: 'Footer button',
            props: { variant: 'default' },
            style: { width: 'w-full' },
            children: [textLayer('footer-label', 'Button label', 'Create workspace')],
          },
        ],
      },
    ],
  }
}

const cardEntry: ComponentEntry = {
  name: 'Card',
  group: 'Display',
  description: 'A container that groups related content and actions.',
  render: { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter, Button },
  propControls: {
    // Card has a `size` prop in src/components/ui/card.tsx ('default' | 'sm').
    Card: [{ name: 'size', control: 'select', options: ['default', 'sm'] }],
    Button: [
      { name: 'variant', control: 'select', options: buttonVariantOptions },
      { name: 'size', control: 'select', options: buttonSizeOptions },
      { name: 'disabled', control: 'boolean' },
    ],
  },
  variants: [
    { name: 'Default', tree: cardTree({ size: 'default' }) },
    { name: 'With action', tree: cardTree({ size: 'default' }, true) },
    { name: 'Small', tree: cardTree({ size: 'sm' }) },
  ],
}

// ── Input ────────────────────────────────────────────────────────────────────
// A single layer. Its words live in props (placeholder / defaultValue), not in a text layer.
function inputTree(props: Record<string, PropValue>): DesignNode {
  // TWEAK: the input's starting width.
  return { layerKey: 'root', type: 'Input', name: 'Input', props, style: { width: 'w-64' } }
}

const inputEntry: ComponentEntry = {
  name: 'Input',
  group: 'Inputs',
  description: 'A one-line text field.',
  render: { Input },
  propControls: {
    Input: [
      { name: 'placeholder', control: 'text' },
      { name: 'defaultValue', label: 'value', control: 'text' },
      { name: 'type', control: 'select', options: ['text', 'email', 'password', 'number', 'search'] },
      { name: 'disabled', control: 'boolean' },
      { name: 'aria-invalid', label: 'invalid', control: 'boolean' },
    ],
  },
  variants: [
    { name: 'Default', tree: inputTree({ type: 'email', placeholder: 'name@company.com' }) },
    { name: 'Filled', tree: inputTree({ type: 'email', placeholder: 'name@company.com', defaultValue: 'maria.lopez@acme.io' }) },
    { name: 'Disabled', tree: inputTree({ type: 'email', placeholder: 'name@company.com', disabled: true }) },
    { name: 'Invalid', tree: inputTree({ type: 'email', defaultValue: 'maria.lopez@', 'aria-invalid': true }) },
  ],
}

// ── Textarea ─────────────────────────────────────────────────────────────────
function textareaTree(props: Record<string, PropValue>): DesignNode {
  return { layerKey: 'root', type: 'Textarea', name: 'Textarea', props, style: { width: 'w-64' } }
}

const textareaEntry: ComponentEntry = {
  name: 'Textarea',
  group: 'Inputs',
  description: 'A multi-line text field.',
  render: { Textarea },
  propControls: {
    Textarea: [
      { name: 'placeholder', control: 'text' },
      { name: 'defaultValue', label: 'value', control: 'text' },
      { name: 'disabled', control: 'boolean' },
    ],
  },
  variants: [
    { name: 'Default', tree: textareaTree({ placeholder: 'Tell us what you think of the new editor…' }) },
    { name: 'Disabled', tree: textareaTree({ placeholder: 'Comments are turned off for this file', disabled: true }) },
  ],
}

// ── Checkbox + Switch (a control next to a label) ────────────────────────────
// Row (a plain div laid out with flex) > Control + Label > text
// The row's layout comes from its style map, so you can edit gap/alignment in the panel.
const rowStyle: StyleMap = { display: 'flex', alignItems: 'items-center', gap: 'gap-2' }

function controlRowTree(controlType: 'Checkbox' | 'Switch', controlProps: Record<string, PropValue>, label: string): DesignNode {
  return {
    layerKey: 'root',
    type: 'div',
    name: 'Row',
    style: rowStyle,
    children: [
      { layerKey: 'control', type: controlType, name: controlType, props: controlProps },
      { layerKey: 'label', type: 'Label', name: 'Label', children: [textLayer('label-text', 'Label text', label)] },
    ],
  }
}

const checkboxEntry: ComponentEntry = {
  name: 'Checkbox',
  group: 'Inputs',
  description: 'An on/off choice, usually in a list or form.',
  render: { Checkbox, Label },
  propControls: {
    Checkbox: [
      // defaultChecked only applies when the checkbox first appears. The node renderer
      // re-creates the component whenever its props change, so editing it still works.
      { name: 'defaultChecked', label: 'checked', control: 'boolean' },
      { name: 'disabled', control: 'boolean' },
    ],
  },
  variants: [
    { name: 'Unchecked', tree: controlRowTree('Checkbox', { defaultChecked: false }, 'Email me about product updates') },
    { name: 'Checked', tree: controlRowTree('Checkbox', { defaultChecked: true }, 'Accept terms and conditions') },
    { name: 'Disabled', tree: controlRowTree('Checkbox', { defaultChecked: true, disabled: true }, 'Required for your plan') },
  ],
}

// Options copied from src/components/ui/switch.tsx ('sm' | 'default').
const switchEntry: ComponentEntry = {
  name: 'Switch',
  group: 'Inputs',
  description: 'Turns a setting on or off right away.',
  render: { Switch, Label },
  propControls: {
    Switch: [
      { name: 'defaultChecked', label: 'checked', control: 'boolean' },
      { name: 'size', control: 'select', options: ['default', 'sm'] },
      { name: 'disabled', control: 'boolean' },
    ],
  },
  variants: [
    { name: 'Off', tree: controlRowTree('Switch', { defaultChecked: false, size: 'default' }, 'Airplane mode') },
    { name: 'On', tree: controlRowTree('Switch', { defaultChecked: true, size: 'default' }, 'Sync across devices') },
    { name: 'Small', tree: controlRowTree('Switch', { defaultChecked: true, size: 'sm' }, 'Compact view') },
    { name: 'Disabled', tree: controlRowTree('Switch', { defaultChecked: false, size: 'default', disabled: true }, 'Managed by your admin') },
  ],
}

// ── Progress ─────────────────────────────────────────────────────────────────
function progressTree(value: number): DesignNode {
  // TWEAK: the bar's starting width.
  return { layerKey: 'root', type: 'Progress', name: 'Progress', props: { value }, style: { width: 'w-64' } }
}

const progressEntry: ComponentEntry = {
  name: 'Progress',
  group: 'Display',
  description: 'Shows how far along a task is.',
  render: { Progress },
  propControls: {
    Progress: [{ name: 'value', control: 'number', min: 0, max: 100 }],
  },
  variants: [
    { name: 'Started', tree: progressTree(25) },
    { name: 'Halfway', tree: progressTree(60) },
    { name: 'Complete', tree: progressTree(100) },
  ],
}

// ── The list the canvas shows (in this order) ────────────────────────────────
export const shadcnDemoComponents: ComponentEntry[] = [
  buttonEntry,
  badgeEntry,
  cardEntry,
  inputEntry,
  textareaEntry,
  checkboxEntry,
  switchEntry,
  progressEntry,
]
