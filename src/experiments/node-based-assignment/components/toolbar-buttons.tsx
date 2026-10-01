import { ChevronsDownUpIcon, LayoutGridIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Two buttons that sit next to the zoom controls at the bottom of the canvas.
//
// ARRANGE gathers every device that has no software into one container titled "Devices
// without assignments". Press it again to put them back. (The page does the work; this
// only draws the button and reports the click.)
//
// CLOSE ALL closes every open group.
export function ToolbarButtons({
  isArranged,
  onToggleArrange,
  onCloseAll,
}: {
  isArranged: boolean // true while the "devices without assignments" container is showing
  onToggleArrange: () => void
  onCloseAll: () => void
}) {
  return (
    // `data-canvas-control` tells the canvas not to start panning from here.
    <div data-canvas-control className="ml-1 flex items-center gap-1 border-l pl-2">
      <Button
        size="sm"
        // The button looks pressed (filled) while the container is showing.
        variant={isArranged ? 'secondary' : 'ghost'}
        aria-pressed={isArranged}
        title={
          isArranged
            ? 'Put the devices back in their groups'
            : 'Gather the devices without software into one container'
        }
        onClick={onToggleArrange}
      >
        <LayoutGridIcon />
        Arrange
      </Button>
      <Button size="icon-sm" variant="ghost" aria-label="Close all groups" title="Close all groups" onClick={onCloseAll}>
        <ChevronsDownUpIcon />
      </Button>
    </div>
  )
}
