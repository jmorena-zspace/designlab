import type { SVGProps } from 'react'
import { ArrowRight, Check, Download, Mail, Plus, Sparkles, Star, Trash2 } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// ICON: lets a design tree use lucide icons.
//
// The design tree can only store simple values (strings, numbers, booleans), not React
// components. So an icon layer stores the icon's NAME ('Plus') and this tiny wrapper
// looks the real lucide icon up.
// ─────────────────────────────────────────────────────────────────────────────

// TWEAK: add more lucide icons here (import them above) to offer them in the right panel.
const iconsByName = { Plus, ArrowRight, Check, Mail, Download, Trash2, Star, Sparkles }

type IconProps = SVGProps<SVGSVGElement> & { icon?: string }

// Forwards className and every other prop (data-node-id, data-icon…) to the <svg>,
// so the canvas can select it and shadcn's styles can find it.
// An unknown name falls back to Sparkles instead of crashing.
export function Icon({ icon, ...svgProps }: IconProps) {
  const ChosenIcon = iconsByName[icon as keyof typeof iconsByName] ?? Sparkles
  return <ChosenIcon {...svgProps} />
}
