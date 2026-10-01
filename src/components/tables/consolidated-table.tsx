import type { LucideIcon } from 'lucide-react'
import { LabelList, type Label } from '@/components/tags/label-list'
import type { TagColor } from '@/components/tags/notion-tag'
import type { NotionColumn } from '@/components/tables/notion-table'

// A table with NO header row. Every record is one row. The row starts with an
// icon for the kind of record (laptop = device, inbox = sales order...) and the
// record's name in bold. After that, every other piece of data is a colored
// label. Because there are no headers to say what each value is, each label
// carries a small icon for its type (mail = email, arrow = link to another
// record, and so on).
//
// It reuses the column lists made for NotionTable, so both tables stay in sync:
// change a column once and both views update.

// One row: an icon for the kind of record, its name, and its labels.
export type ConsolidatedRow = { icon: LucideIcon; name: string; labels: Label[] }

// TWEAK: the color used for values whose column doesn't set its own tag colors
// (names, serial numbers, emails...). Try 'blue' or 'brown'.
const defaultLabelColor: TagColor = 'gray'

// Turns one record into a row, using a list of columns.
// The column of type 'title' (serial number, SO number, customer name, group
// name) becomes the row's name. Every other column becomes labels: a column can
// hold one value or a list of values (like several devices), and each value
// becomes its own label.
export function makeConsolidatedRow<Row>(
  icon: LucideIcon,
  record: Row,
  columns: NotionColumn<Row>[],
): ConsolidatedRow {
  const titleColumn = columns.find((column) => column.type === 'title')
  const name = titleColumn ? String(titleColumn.getValue(record)) : ''

  const otherColumns = columns.filter((column) => column.type !== 'title')
  const labels = otherColumns.flatMap((column) => {
    const value = column.getValue(record)
    const values = Array.isArray(value) ? value : [String(value)]
    return values.map((text) => ({
      text,
      color: column.tagColor?.(text) ?? defaultLabelColor,
      icon: column.type,
    }))
  })
  return { icon, name, labels }
}

// The table itself. `rows` is a list made with `makeConsolidatedRow`.
export function ConsolidatedTable({ rows }: { rows: ConsolidatedRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-muted/50">
              {/* The kind icon and the record's name. `w-72` sets this column's width. */}
              <td className="w-72 border-y border-border px-2 py-2 align-top">
                <span className="flex items-center gap-2 font-medium">
                  <row.icon className="size-4 shrink-0 text-muted-foreground" />
                  {row.name}
                </span>
              </td>
              {/* The rest of the data as labels, wrapping onto new lines if needed. */}
              <td className="border-y border-border px-2 py-2">
                <LabelList labels={row.labels} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
