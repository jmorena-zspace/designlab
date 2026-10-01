import type { Device, SoftwareStatus } from '../data/assignment-data'
import { deviceSoftwareRowHeight } from '../layout'
import { getNodeFadeClasses, getNodeOutlineClasses, type DropState, type Emphasis } from './node-styles'
import { Badge } from '@/components/ui/badge'

// The colors for each software status. Each is a soft background, a darker text
// color, and a dot color.
// TWEAK: change the classes to recolor a status.
const statusStyles: Record<SoftwareStatus, { badge: string; dot: string }> = {
  // Staged = dragged on by you but not applied yet (shown in violet).
  Staged: { badge: 'bg-violet-100 text-violet-800', dot: 'bg-violet-500' },
  Installed: { badge: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
  Pending: { badge: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
  Failed: { badge: 'bg-red-100 text-red-800', dot: 'bg-red-500' },
}

// A device card: its name and sales order, its serial number, and the software
// assigned to it, each with a status. Drop software on it to assign just this device.
// The spacing here (padding, row heights) matches the numbers in layout.ts, which
// is how the layout knows how tall the card is. Change one, change the other.
export function DeviceNode({
  device,
  emphasis,
  dropState,
  activeSoftware,
}: {
  device: Device
  emphasis: Emphasis
  dropState: DropState
  activeSoftware: string | null // the software being hovered / dragged; its row is marked
}) {
  return (
    <div
      data-canvas-node // tells the canvas not to start panning when this is pressed
      className={`size-full overflow-hidden rounded-2xl bg-card p-4 shadow-md transition-shadow ${getNodeOutlineClasses(emphasis, dropState)} ${getNodeFadeClasses(emphasis)}`}
    >
      {/* Name on the left, sales order on the right. */}
      <div className="flex h-6 items-center justify-between gap-2">
        <span className="truncate font-semibold">{device.name}</span>
        <Badge variant="secondary" className="shrink-0 font-mono text-[11px]">
          {device.salesOrderId}
        </Badge>
      </div>
      <p className="mt-0.5 h-5 truncate font-mono text-xs leading-5 text-muted-foreground">
        {device.serialNumber}
      </p>

      <div className="my-3 h-px bg-border" />

      {/* One row per software: its name, and its status on the right. */}
      {device.software.length === 0 ? (
        <p className="text-sm text-muted-foreground" style={{ height: deviceSoftwareRowHeight }}>
          No software assigned
        </p>
      ) : (
        device.software.map((software) => (
          <div
            key={software.name}
            // The row for the software being hovered / dragged gets a blue tint.
            className={`-mx-2 flex items-center justify-between gap-2 rounded-md px-2 transition-colors ${
              software.name === activeSoftware ? 'bg-blue-100' : ''
            }`}
            style={{ height: deviceSoftwareRowHeight }}
          >
            <span className="truncate text-sm">
              {software.name}
              {/* If the seat comes from a different sales order than the device's own, say so. */}
              {software.salesOrderId !== device.salesOrderId && (
                <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
                  {software.salesOrderId}
                </span>
              )}
            </span>
            <span
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[software.status].badge}`}
            >
              <span className={`size-1.5 rounded-full ${statusStyles[software.status].dot}`} />
              {software.status}
            </span>
          </div>
        ))
      )}
    </div>
  )
}
