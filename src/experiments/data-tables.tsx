import { InfoExplainer } from '@/components/info/info-explainer'
import {
  ConsolidatedTable,
  makeConsolidatedRow,
} from '@/components/tables/consolidated-table'
import { NotionTable } from '@/components/tables/notion-table'
import { customers, deviceGroups, devices, salesOrders } from '@/data/device-database'
import {
  customerColumns,
  deviceColumns,
  deviceGroupColumns,
  recordIcons,
  salesOrderColumns,
} from '@/data/record-columns'

// The consolidated table: one row per record, all four kinds in a single table.
// Each row is built from the same column lists as the tables above, and gets
// an icon for its kind of record (icons are set in src/data/record-columns.ts).
// TWEAK: reorder these lines to reorder the rows, or use devices.slice(0, 3) for more records.
const consolidatedRows = [
  makeConsolidatedRow(recordIcons.device, devices[0], deviceColumns),
  makeConsolidatedRow(recordIcons.salesOrder, salesOrders[0], salesOrderColumns),
  makeConsolidatedRow(recordIcons.customer, customers[0], customerColumns),
  makeConsolidatedRow(recordIcons.deviceGroup, deviceGroups[0], deviceGroupColumns),
]

// Experiment: Data tables
// Shows the first record of each table, Notion style, then all four in one table.
export default function DataTablesExperiment() {
  return (
    <main className="mx-auto flex min-h-svh max-w-6xl flex-col gap-10 p-8 pt-16 md:p-12 md:pt-20">
      <header>
        <h1 className="text-4xl font-bold tracking-tight">Data tables</h1>
        <p className="mt-2 text-muted-foreground">
          A local database of devices, sales orders, customers and device groups. One record of
          each, for now.
        </p>
      </header>

      {/* `.slice(0, 1)` keeps only the first record of each list.
          TWEAK: change 1 to 3 to show three records per table. */}
      <NotionTable title="Devices" columns={deviceColumns} rows={devices.slice(0, 1)} />
      <NotionTable title="Sales orders" columns={salesOrderColumns} rows={salesOrders.slice(0, 1)} />
      <NotionTable title="Customers" columns={customerColumns} rows={customers.slice(0, 1)} />
      <NotionTable title="Device groups" columns={deviceGroupColumns} rows={deviceGroups.slice(0, 1)} />

      {/* The new version: all four record kinds in one table, no headers. */}
      <section>
        <h2 className="mb-2 text-lg font-semibold">Consolidated</h2>
        <ConsolidatedTable rows={consolidatedRows} />
      </section>

      <InfoExplainer title="How this was built">
        <p>
          <strong>The idea:</strong> a small local database with four linked tables, shown the
          way Notion shows a database: header icons, grid lines and colored tags.
        </p>
        <p>
          <strong>The data:</strong> everything lives in <code>src/data/device-database.ts</code>.
          Each fact is stored once and other tables point to it by id. For example, a device
          stores its group, and a group's devices are found by asking "which devices point at
          me?" (<code>getDevicesInGroup</code>). That way the data can't contradict itself.
        </p>
        <p>
          <strong>The columns:</strong> how each kind of record is displayed (its icon, its tag
          colors and its list of columns) is in <code>src/data/record-columns.ts</code>. Colors
          for Type and Status are set there.
        </p>
        <p>
          <strong>The table:</strong> <code>NotionTable</code> (in{' '}
          <code>components/tables/</code>) is generic. You give it a list of columns and a list of
          rows. Each column says its type (title, select, relation...) and how to read its value
          from a row. One component draws all four tables.
        </p>
        <p>
          <strong>The tags:</strong> <code>NotionTag</code> (in <code>components/tags/</code>) is
          the colored label, using Notion's color palette.
        </p>
        <p>
          <strong>The consolidated table:</strong> one table for all four kinds of record, with
          no header row. Every value becomes a label, and each label has a small icon for its type
          (mail for email, arrow for a link to another record). Each row starts with an icon for
          its kind (laptop, inbox, users, folder) and its name in bold: the serial number, SO
          number, customer name or group name. It reuses the column lists through{' '}
          <code>makeConsolidatedRow</code> in <code>components/tables/consolidated-table.tsx</code>,
          so a column only has to be defined once. Change <code>defaultLabelColor</code> in that
          file to recolor the plain labels.
        </p>
        <p>
          <strong>Things to try:</strong> change <code>slice(0, 1)</code> to show more rows; edit
          the colors in the columns file; add a device in the database file and watch the related
          tables update; add a column by adding a line to a columns list.
        </p>
      </InfoExplainer>
    </main>
  )
}
