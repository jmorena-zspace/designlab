import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ArrowLeftIcon, ChevronRightIcon } from 'lucide-react'
import { toast } from 'sonner'
import { DeviceTable } from '@/components/tables/device-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// The information a device card can show. To add a new row to the card,
// add a field here, then add a matching line in `detailRows` below.
export type DeviceInfo = {
  deviceName: string
  serialNumber: string
  salesOrder: string
  endUser: string // an email address
  deviceGroup: string
  softwareAssignments: string[] // a device can have several
}

// Which view the card is showing: the device details (null), or the list of
// other devices in the same group / sales order.
type SectionName = 'deviceGroup' | 'salesOrder' | null

// ---------- TWEAK: values you can change ----------
// Card size in pixels. The height never changes: when there's more content than
// fits, the content scrolls inside the card instead. The card also shrinks to
// fit small screens.
const cardWidth = 720
const cardHeight = 640
// How long the fade takes (in seconds). Bigger = slower.
const fadeDuration = 0.3
// How far the content slides while it fades (in pixels). Use 0 for a plain fade.
const slideDistance = 24
// --------------------------------------------------

// Shows one device's details. Two rows (Sales order, Device group) have a link
// underneath. Clicking it swaps the card's content for a table of the other
// matching devices, and a back button brings the details back.
//
// `allDevices` is the full list; the card picks the matching ones itself.
export function DeviceInfoCard({
  device,
  allDevices,
}: {
  device: DeviceInfo
  allDevices: DeviceInfo[]
}) {
  // Which view is showing right now.
  const [openSection, setOpenSection] = useState<SectionName>(null)

  // The serial numbers of the devices whose checkbox is ticked in the table.
  const [selectedSerialNumbers, setSelectedSerialNumbers] = useState<string[]>([])

  // Ticks a device if it's unticked, unticks it if it's ticked.
  const toggleDevice = (serialNumber: string) => {
    setSelectedSerialNumbers((current) =>
      current.includes(serialNumber)
        ? current.filter((serial) => serial !== serialNumber)
        : [...current, serialNumber],
    )
  }

  // A "handle" to the element we animate (everything inside the card).
  const contentRef = useRef<HTMLDivElement>(null)
  // Which way the new content slides in from: 1 = from the right, -1 = from the left.
  const slideDirection = useRef(1)

  // Switching views happens in two steps so it feels smooth:
  // 1. fade the current content out, 2. swap the view (the effect below fades it in).
  const changeView = (nextSection: SectionName) => {
    slideDirection.current = nextSection === null ? -1 : 1 // going back slides the other way
    gsap.to(contentRef.current, {
      opacity: 0,
      x: -slideDirection.current * slideDistance,
      duration: fadeDuration,
      ease: 'power2.in',
      onComplete: () => {
        setOpenSection(nextSection)
        setSelectedSerialNumbers([]) // start each table with nothing ticked
      },
    })
  }

  // Runs after the view changes (and once when the card first appears):
  // fades the new content in, sliding from the side it came from.
  useEffect(() => {
    const animation = gsap.fromTo(
      contentRef.current,
      { opacity: 0, x: slideDirection.current * slideDistance },
      { opacity: 1, x: 0, duration: fadeDuration, ease: 'power2.out' },
    )
    // Cleanup: stop the animation if the view changes again mid-way.
    return () => {
      animation.kill()
    }
  }, [openSection])

  // The devices shown in the table: everyone sharing this device's group or
  // sales order, except this device itself.
  const otherDevices = allDevices.filter(
    (other) =>
      other.serialNumber !== device.serialNumber &&
      (openSection === 'deviceGroup'
        ? other.deviceGroup === device.deviceGroup
        : other.salesOrder === device.salesOrder),
  )

  // Each row is a label and a value. A row with a `section` also gets a link
  // underneath it that opens that section's table.
  // TWEAK: reorder, rename or remove rows here to change what the card shows.
  const detailRows: {
    label: string
    value: string | string[]
    section?: Exclude<SectionName, null>
    linkLabel?: string
  }[] = [
    { label: 'Serial number', value: device.serialNumber },
    {
      label: 'Sales order',
      value: device.salesOrder,
      section: 'salesOrder',
      linkLabel: 'Other devices in this sales order',
    },
    { label: 'End user', value: device.endUser },
    {
      label: 'Device group',
      value: device.deviceGroup,
      section: 'deviceGroup',
      linkLabel: 'Other devices in this group',
    },
    { label: 'Software assignments', value: device.softwareAssignments },
  ]

  return (
    // `max-w-full` stops the card from ever being wider than the screen.
    // `max-h-…` keeps it inside the screen too. `style` sets the fixed size.
    <Card
      className="max-h-[calc(100svh-3rem)] max-w-full"
      style={{ width: cardWidth, height: cardHeight }}
    >
      {/* Everything inside this div fades and slides when the view changes.
          `flex-1 min-h-0` lets it fill the card and lets its children scroll. */}
      <div ref={contentRef} className="flex min-h-0 flex-1 flex-col">
        {openSection === null ? (
          // ---------- VIEW 1: the device details ----------
          <>
            <CardHeader className="shrink-0">
              {/* TWEAK: text-2xl controls the title size. Try text-xl or text-4xl.
                  `truncate` cuts a very long name with "…". */}
              <CardTitle className="truncate text-2xl font-bold" title={device.deviceName}>
                {device.deviceName}
              </CardTitle>
            </CardHeader>

            {/* `overflow-y-auto` makes this area scroll if the details don't fit. */}
            <CardContent className="mt-4 min-h-0 flex-1 overflow-y-auto">
              {/* <dl> is the HTML element for a list of labels and values. */}
              <dl className="flex flex-col gap-4">
                {detailRows.map((row) => (
                  <div key={row.label} className="flex flex-col gap-1">
                    <dt className="text-sm text-muted-foreground">{row.label}</dt>
                    {/* A list of values (software) shows as badges; a single value as text. */}
                    {Array.isArray(row.value) ? (
                      <dd className="flex flex-wrap gap-1.5">
                        {row.value.map((item) => (
                          <Badge key={item} variant="secondary">
                            {item}
                          </Badge>
                        ))}
                      </dd>
                    ) : (
                      <dd className="text-base font-medium break-words">{row.value}</dd>
                    )}

                    {/* The link that opens the table, only for rows with a section. */}
                    {row.section && (
                      <button
                        type="button"
                        onClick={() => changeView(row.section!)}
                        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                      >
                        <ChevronRightIcon className="size-4" />
                        {row.linkLabel}
                      </button>
                    )}
                  </div>
                ))}
              </dl>
            </CardContent>
          </>
        ) : (
          // ---------- VIEW 2: the table of other devices ----------
          <>
            <CardHeader className="shrink-0">
              {/* Back button on the left, export buttons on the right. */}
              <div className="flex items-center justify-between gap-2">
                <Button variant="ghost" size="sm" onClick={() => changeView(null)}>
                  <ArrowLeftIcon />
                  Back
                </Button>
                {/* No real export yet. The buttons just show a success message (a "toast"). */}
                <div className="flex gap-2">
                  {/* Only appears once at least one checkbox is ticked. */}
                  {selectedSerialNumbers.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() =>
                        toast.success(`Exported ${selectedSerialNumbers.length} selected devices`)
                      }
                    >
                      Export selected ({selectedSerialNumbers.length})
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.success(`Exported all ${otherDevices.length} devices`)}
                  >
                    Export all
                  </Button>
                </div>
              </div>
              <CardTitle className="mt-2 truncate text-2xl font-bold">
                {openSection === 'salesOrder'
                  ? `Devices in sales order ${device.salesOrder}`
                  : `Devices in ${device.deviceGroup}`}
              </CardTitle>
            </CardHeader>

            {/* `min-h-0 flex-1` gives the table the remaining height; it scrolls inside. */}
            <CardContent className="mt-4 min-h-0 flex-1">
              <DeviceTable
                devices={otherDevices}
                selectedSerialNumbers={selectedSerialNumbers}
                onToggleDevice={toggleDevice}
              />
            </CardContent>
          </>
        )}
      </div>
    </Card>
  )
}
