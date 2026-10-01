import {
  ArrowUpRightIcon,
  CircleChevronDownIcon,
  FileTextIcon,
  HashIcon,
  ListIcon,
  MailIcon,
  TypeIcon,
} from 'lucide-react'
import { NotionTag, type TagColor } from '@/components/tags/notion-tag'

// A table styled like a Notion database: a header row with an icon per column,
// grid lines, and colored tags for select-style values.
//
// You describe the table with a list of COLUMNS. Each column says:
//   label     - the header text
//   type     - how to show the values (see `ColumnType`)
//   getValue - how to read this column's value from one row of data
//   tagColor - (select / multiSelect / relation only) which color each tag gets
//   width    - (optional) column width in pixels

// The kinds of column, named after Notion's property types.
type ColumnType = 'title' | 'text' | 'email' | 'number' | 'select' | 'multiSelect' | 'relation'

export type NotionColumn<Row> = {
  label: string
  type: ColumnType
  getValue: (row: Row) => string | number | string[]
  tagColor?: (value: string) => TagColor
  width?: number
}

// The little icon shown before each header label, chosen by column type.
// (Exported so other tables can reuse the same icons.)
export const headerIcons = {
  title: TypeIcon,
  text: TypeIcon,
  email: MailIcon,
  number: HashIcon,
  select: CircleChevronDownIcon,
  multiSelect: ListIcon,
  relation: ArrowUpRightIcon,
}

// Default column width in pixels when a column doesn't set its own.
const defaultColumnWidth = 200

// Draws the value inside one cell, depending on the column's type.
function NotionCell<Row>({ column, row }: { column: NotionColumn<Row>; row: Row }) {
  const value = column.getValue(row)
  // Tags without a color rule are gray.
  const colorFor = column.tagColor ?? (() => 'gray' as TagColor)

  // Lists of tags: multiSelect, relation, and select (a select has just one).
  if (column.type === 'select' || column.type === 'multiSelect' || column.type === 'relation') {
    const values = Array.isArray(value) ? value : [String(value)]
    return (
      <div className="flex flex-wrap gap-1.5">
        {values.map((tagText) => (
          <NotionTag key={tagText} color={colorFor(tagText)}>
            {/* Relations get a small arrow, like Notion's links to other pages. */}
            {column.type === 'relation' && <ArrowUpRightIcon className="size-3 opacity-60" />}
            {tagText}
          </NotionTag>
        ))}
      </div>
    )
  }

  // The title column: bold text with a page icon.
  if (column.type === 'title') {
    return (
      <span className="flex items-center gap-1.5 font-medium">
        <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
        {value}
      </span>
    )
  }

  // Emails are plain text with a soft underline.
  if (column.type === 'email') {
    return <span className="underline decoration-foreground/25 underline-offset-2">{value}</span>
  }

  // Plain text and numbers.
  return <span>{value}</span>
}

// The table itself. `title` is the name shown above it, `rows` is the data.
export function NotionTable<Row>({
  title,
  columns,
  rows,
}: {
  title: string
  columns: NotionColumn<Row>[]
  rows: Row[]
}) {
  return (
    <section>
      {/* Table name and how many rows it has. */}
      <h2 className="mb-2 flex items-baseline gap-2 text-lg font-semibold">
        {title}
        <span className="text-sm font-normal text-muted-foreground">{rows.length}</span>
      </h2>

      {/* `overflow-x-auto` lets wide tables scroll sideways instead of squishing. */}
      <div className="overflow-x-auto">
        {/* `table-fixed` + `border-collapse` = fixed column widths and thin grid lines. */}
        <table className="w-max min-w-full table-fixed border-collapse text-sm">
          <thead>
            <tr>
              {columns.map((column) => {
                const HeaderIcon = headerIcons[column.type]
                return (
                  <th
                    key={column.label}
                    style={{ width: column.width ?? defaultColumnWidth }}
                    className="border-y border-r border-border px-2 py-1.5 text-left font-normal text-muted-foreground first:border-l"
                  >
                    <span className="flex items-center gap-1.5">
                      <HeaderIcon className="size-4 shrink-0" />
                      {column.label}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              // `hover:bg-muted/50` gives the row a soft highlight under the mouse.
              <tr key={rowIndex} className="hover:bg-muted/50">
                {columns.map((column) => (
                  <td
                    key={column.label}
                    className="border-b border-r border-border px-2 py-2 align-top first:border-l"
                  >
                    <NotionCell column={column} row={row} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
