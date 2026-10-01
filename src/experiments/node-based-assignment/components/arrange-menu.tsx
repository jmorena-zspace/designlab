import { ChevronsDownUpIcon, LayoutGridIcon } from 'lucide-react'
import type { ArrangeMode } from '../arrange'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// The "Arrange" button next to the zoom controls. It opens a menu to automatically lay
// the groups out (by sales order, or by how many devices have no software), and to
// close all open groups. The page does the actual arranging.

// TWEAK: the menu entries. `mode` matches the modes in arrange.ts.
const arrangeOptions: { mode: ArrangeMode; label: string; description: string }[] = [
  { mode: 'sales-order', label: 'By sales order', description: 'One column per sales order' },
  { mode: 'unassigned', label: 'By devices without software', description: 'Most unassigned first' },
  { mode: 'default', label: 'Default order', description: 'One long column' },
]

export function ArrangeMenu({
  onArrange,
  onCloseAll,
}: {
  onArrange: (mode: ArrangeMode) => void
  onCloseAll: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-canvas-control
        className="ml-1 flex h-7 items-center gap-1.5 rounded-lg border-l pr-2 pl-3 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      >
        <LayoutGridIcon className="size-4" />
        Arrange
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="center" className="w-64">
        {/* A menu label must sit inside a group (a rule of the menu library). */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Arrange groups</DropdownMenuLabel>
          {arrangeOptions.map((option) => (
            <DropdownMenuItem key={option.mode} onClick={() => onArrange(option.mode)} className="flex-col items-start gap-0">
              <span>{option.label}</span>
              <span className="text-xs text-muted-foreground">{option.description}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onCloseAll}>
          <ChevronsDownUpIcon />
          Close all groups
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
