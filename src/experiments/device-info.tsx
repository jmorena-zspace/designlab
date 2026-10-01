import { DeviceInfoCard, type DeviceInfo } from '@/components/cards/device-info-card'
import { InfoExplainer } from '@/components/info/info-explainer'
import { ExperimentPage } from '@/components/layout/experiment-page'

// ---------- TWEAK: the sample data (made-up, not real devices) ----------
// Every device below shares ONE group and ONE sales order, so the "other devices"
// tables list all of them. Change these to try different values.
const sharedDeviceGroup = 'Classroom A – Science Wing, Second Floor'
const sharedSalesOrder = 'SO-118742'
// How many extra devices to generate. Try 3 (short list) or 200 (very long list).
const numberOfExtraDevices = 40
// The software that can be assigned. Each device gets a few of these.
const softwareOptions = [
  'zSpace Studio 5.2',
  'zSpace Experience 4.0',
  'zSpace Apps Suite',
  'Anatomy Explorer',
  'Physics Lab Simulator',
  'Chemistry Builder',
]
// -----------------------------------------------------------------------

// The main device: the one the card shows. It has a very long name and every
// software option, to test how the card handles long text.
const mainDevice: DeviceInfo = {
  deviceName: 'zSpace Laptop 01 – Science Wing Room 214 Front Demonstration Station',
  serialNumber: 'ZS-2026-004821',
  salesOrder: sharedSalesOrder,
  endUser: 'jane.doe@example.com',
  deviceGroup: sharedDeviceGroup,
  softwareAssignments: softwareOptions,
}

// The other devices are generated with a loop instead of typed out one by one.
// `Array.from({ length: n }, (_, index) => ...)` builds a list of n items,
// where `index` counts 0, 1, 2, ...
const otherDevices: DeviceInfo[] = Array.from({ length: numberOfExtraDevices }, (_, index) => {
  const deviceNumber = index + 2 // the main device is number 1
  // Give each device between 1 and 4 software options, starting at a different
  // place in the list so they vary from device to device.
  const firstSoftware = index % softwareOptions.length
  const softwareCount = (index % 4) + 1
  return {
    deviceName: `zSpace Laptop ${String(deviceNumber).padStart(2, '0')} – Science Wing Room ${200 + index} Student Station`,
    serialNumber: `ZS-2026-${4821 + deviceNumber}`,
    salesOrder: sharedSalesOrder,
    endUser: `student${deviceNumber}@example.com`,
    deviceGroup: sharedDeviceGroup,
    // Wraps around to the start of the list when it runs off the end.
    softwareAssignments: Array.from(
      { length: softwareCount },
      (_, offset) => softwareOptions[(firstSoftware + offset) % softwareOptions.length],
    ),
  }
})

// The full list: the main device first, then all the others.
const allDevices: DeviceInfo[] = [mainDevice, ...otherDevices]

// The device whose card we show. TWEAK: change the number to show a different
// device (0 is the first in the list above).
const shownDevice = allDevices[0]

// Experiment: Device info
// A single detail card, centered on the screen.
export default function DeviceInfoExperiment() {
  return (
    <ExperimentPage>
      <DeviceInfoCard device={shownDevice} allDevices={allDevices} />

      <InfoExplainer title="How this was built">
        <p>
          <strong>The idea:</strong> a detail card that shows one device's information: a name
          as the title, then a list of labeled values.
        </p>
        <p>
          <strong>Pieces:</strong> the card itself is <code>DeviceInfoCard</code> in{' '}
          <code>components/cards/</code>. It's built from shadcn's <code>Card</code> (in{' '}
          <code>components/ui/</code>) and styled with Tailwind classes.
        </p>
        <p>
          <strong>Centering:</strong> <code>ExperimentPage</code> uses <code>flex</code>,{' '}
          <code>items-center</code> and <code>justify-center</code> on a full-height container,
          which puts the card in the middle of the screen.
        </p>
        <p>
          <strong>The data:</strong> the values live in <code>allDevices</code> at the top of
          this file. One device is passed to the card, plus the full list. The card loops over a
          list of rows to draw each label and value.
        </p>
        <p>
          <strong>Swapping views:</strong> the card shows one of two views, controlled by a
          piece of state (<code>openSection</code>). Clicking "Other devices in this…" fades the
          details out with GSAP, switches the view, then fades the table in. The Back button does
          the same in the other direction. The card itself never resizes, only its content
          changes.
        </p>
        <p>
          <strong>The table:</strong> the card filters <code>allDevices</code> for devices with
          the same group (or sales order) and passes them to <code>DeviceTable</code> in{' '}
          <code>components/tables/</code>.
        </p>
        <p>
          <strong>Stress test:</strong> the list is generated with a loop (see{' '}
          <code>numberOfExtraDevices</code>), names are long, and devices have several software
          assignments. The card keeps a fixed height (<code>cardHeight</code>), the table scrolls
          inside it with a sticky header, and long text is cut off with "…" using{' '}
          <code>truncate</code>. Hover a cell to see the full text.
        </p>
        <p>
          <strong>Selecting and exporting:</strong> the card remembers ticked devices in{' '}
          <code>selectedSerialNumbers</code>. "Export selected" only appears when at least one is
          ticked, and "Export all" is always there. Both just show a "toast" message using the{' '}
          <code>sonner</code> library. They don't create a file yet.
        </p>
        <p>
          <strong>Things to try:</strong> edit <code>allDevices</code>; change{' '}
          <code>cardWidth</code>, <code>fadeDuration</code> or <code>slideDistance</code> in the card file; add a new row by adding a
          field to <code>DeviceInfo</code> and a line to <code>detailRows</code>.
        </p>
      </InfoExplainer>
    </ExperimentPage>
  )
}
