import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { DeviceInfo } from '@/components/cards/device-info-card'

// A table listing devices, one checkbox per row. It scrolls up and down inside
// whatever height its parent gives it, and its header row stays visible.
//
// The table doesn't remember which rows are ticked. The parent does, and passes
// it in (`selectedSerialNumbers`) along with a function to call on each click.
//
// TWEAK: to change the columns, edit the <TableHead> cells AND the matching
// <TableCell> cells below (they need to stay in the same order).
export function DeviceTable({
  devices,
  selectedSerialNumbers,
  onToggleDevice,
}: {
  devices: DeviceInfo[]
  selectedSerialNumbers: string[]
  onToggleDevice: (serialNumber: string) => void
}) {
  // Nothing to list? Show a friendly message instead of an empty table.
  if (devices.length === 0) {
    return <p className="text-sm text-muted-foreground">No other devices found.</p>
  }

  return (
    // `table-fixed` makes the columns keep the widths set on the header cells,
    // which is what lets long text be cut off with "…" (`truncate`) instead of
    // stretching the table. `h-full overflow-y-auto` makes it scroll vertically.
    <Table className="table-fixed" containerClassName="h-full overflow-y-auto">
      {/* `sticky top-0` pins the header to the top while the rows scroll. */}
      <TableHeader className="sticky top-0 z-10 bg-card">
        <TableRow>
          {/* TWEAK: the w-… classes set each column's width. */}
          <TableHead className="w-10" />
          <TableHead className="w-[32%]">Device name</TableHead>
          <TableHead className="w-[20%]">Serial number</TableHead>
          <TableHead className="w-[16%]">Sales order</TableHead>
          <TableHead>Software assignments</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {/* One row per device. `key` helps React track each row. */}
        {devices.map((device) => {
          const isSelected = selectedSerialNumbers.includes(device.serialNumber)
          return (
            <TableRow key={device.serialNumber} className={isSelected ? 'bg-muted/50' : ''}>
              <TableCell>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggleDevice(device.serialNumber)}
                  aria-label={`Select ${device.deviceName}`}
                />
              </TableCell>
              {/* `truncate` cuts long text with "…". `title` shows the full text on hover. */}
              <TableCell className="truncate font-medium" title={device.deviceName}>
                {device.deviceName}
              </TableCell>
              <TableCell className="truncate">{device.serialNumber}</TableCell>
              <TableCell className="truncate">{device.salesOrder}</TableCell>
              {/* Several software assignments are joined into one line: "A, B, C". */}
              <TableCell
                className="truncate"
                title={device.softwareAssignments.join(', ')}
              >
                {device.softwareAssignments.join(', ')}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
