import {
  BookAIcon,
  BookOpenTextIcon,
  BoxIcon,
  BrushIcon,
  CalculatorIcon,
  CodeIcon,
  CogIcon,
  FileTextIcon,
  FlaskConicalIcon,
  GlobeIcon,
  HeartPulseIcon,
  LandmarkIcon,
  LeafIcon,
  ListVideoIcon,
  RocketIcon,
  WrenchIcon,
  type LucideIcon,
} from 'lucide-react'
import type { ContentType } from './data/types'

// The colors and icons of this experiment, in one place, copied from the zCentral style
// (dark navy background, violet search bar, colored outlined type tags).
// Tailwind only sees class names written out in full, so each color is a whole class.

// TWEAK: the main surfaces.
export const zcentral = {
  page: 'bg-[#0a0918]', // the page behind everything
  panel: 'bg-[#0c0b1c]/95 ring-1 ring-[#2b2848]', // the results panel
  searchBar: 'bg-[#1b1932] ring-2 ring-[#8b7cf6]', // the search box with its violet outline
  textStrong: 'text-[#f2f1ff]',
  textMuted: 'text-[#a3a1c2]',
  codeChip: 'bg-[#23213d] ring-1 ring-[#363359] text-[#bdb9ea]', // "A638", "AP64"
  activeRow: 'bg-[#1c1a35]', // the highlighted result (arrow keys / hover)
  button: 'bg-[#25233f] text-[#f2f1ff] hover:bg-[#302d52]', // "Details"
  primaryButton: 'bg-[#7c6cf0] text-white hover:bg-[#8d7ff5]', // "Launch"
}

// What each content type looks like: its label, icon, and tag colors.
// TWEAK: change a type's colors or icon here and every tag updates.
export const contentTypeStyles: Record<
  ContentType,
  { label: string; pluralLabel: string; icon: LucideIcon; tagClasses: string; iconTileClasses: string }
> = {
  lesson: {
    label: 'Lesson',
    pluralLabel: 'Lessons',
    icon: BookOpenTextIcon,
    tagClasses: 'bg-[#3a3011] ring-[#e7c64a] text-[#f6dc79]',
    iconTileClasses: 'bg-[#3a3011] text-[#f6dc79]',
  },
  collection: {
    label: 'Collection',
    pluralLabel: 'Collections',
    icon: ListVideoIcon,
    tagClasses: 'bg-[#0f2c20] ring-[#4fd18b] text-[#8ef0bb]',
    iconTileClasses: 'bg-[#0f2c20] text-[#8ef0bb]',
  },
  app: {
    label: 'App',
    pluralLabel: 'Apps',
    icon: RocketIcon,
    tagClasses: 'bg-[#0f1f3b] ring-[#5c9df0] text-[#95c4ff]',
    iconTileClasses: 'bg-[#0f1f3b] text-[#95c4ff]',
  },
  resource: {
    label: 'Resource',
    pluralLabel: 'Resources',
    icon: FileTextIcon,
    tagClasses: 'bg-[#382312] ring-[#ee9f58] text-[#ffc795]',
    iconTileClasses: 'bg-[#382312] text-[#ffc795]',
  },
  model: {
    label: 'Studio model',
    pluralLabel: 'Studio models',
    icon: BoxIcon,
    tagClasses: 'bg-[#371331] ring-[#e679c8] text-[#f6aae2]',
    iconTileClasses: 'bg-[#371331] text-[#f6aae2]',
  },
}

// The order the types appear in (in the category buttons and the "All" results).
// TWEAK: reorder to change which group shows first.
export const contentTypeOrder: ContentType[] = ['lesson', 'collection', 'app', 'model', 'resource']

// Each subject gets a small colored icon, like the little squares in zCentral.
// TWEAK: add a subject here if you add one to the data (unknown ones get a gray cog).
const subjectStyles: Record<string, { icon: LucideIcon; tileClasses: string }> = {
  'Physical Science': { icon: FlaskConicalIcon, tileClasses: 'bg-[#e8e8f0] text-[#1b1932]' },
  'Life Science': { icon: LeafIcon, tileClasses: 'bg-[#2fae5a] text-white' },
  'Earth and Space Science': { icon: GlobeIcon, tileClasses: 'bg-[#2b8fd6] text-white' },
  Mathematics: { icon: CalculatorIcon, tileClasses: 'bg-[#f2a93b] text-[#1b1932]' },
  'English Language Arts': { icon: BookAIcon, tileClasses: 'bg-[#d9534f] text-white' },
  'Social Science': { icon: LandmarkIcon, tileClasses: 'bg-[#b07a4a] text-white' },
  Arts: { icon: BrushIcon, tileClasses: 'bg-[#c45ad6] text-white' },
  'Health Science': { icon: HeartPulseIcon, tileClasses: 'bg-[#e0577a] text-white' },
  Engineering: { icon: WrenchIcon, tileClasses: 'bg-[#6c7bd9] text-white' },
  'Computer Science': { icon: CodeIcon, tileClasses: 'bg-[#2dbfb2] text-[#1b1932]' },
  'Career and Technical Education': { icon: CogIcon, tileClasses: 'bg-[#8a8aa3] text-white' },
}
const fallbackSubjectStyle = { icon: CogIcon, tileClasses: 'bg-[#8a8aa3] text-white' }

export function getSubjectStyle(subject: string) {
  return subjectStyles[subject] ?? fallbackSubjectStyle
}
