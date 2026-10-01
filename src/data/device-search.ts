import {
  makeConsolidatedRow,
  type ConsolidatedRow,
} from '@/components/tables/consolidated-table'
import type { NotionColumn } from '@/components/tables/notion-table'
import {
  customers,
  deviceGroups,
  devices,
  getDevicesInGroup,
  getSalesOrdersForCustomer,
  getSalesOrdersForGroup,
  salesOrders,
} from '@/data/device-database'
import {
  customerColumns,
  deviceColumns,
  deviceGroupColumns,
  recordIcons,
  salesOrderColumns,
} from '@/data/record-columns'

// Search over the whole database at once.
//
// HOW IT WORKS
// 1. INDEX (built once, when the app loads): every record (device, sales order,
//    customer, group) becomes a "search entry" with:
//      - the row we display for it (icon, name and labels)
//      - the list of texts we search in: its name and every label
//      - the keys of the records connected to it ("related")
// 2. SEARCH (runs on every keystroke): score each entry against what was typed,
//    keep the best matches, then add the records related to the top match.

// ---------- TWEAK: search settings ----------
// The most matches kept, including the best one (related records are extra).
const maxMatches = 500
// Nothing is searched until at least this many characters are typed.
export const minQueryLength = 3
// Points for how well a piece of text matches a word you typed.
const exactMatchScore = 3 // the text IS the word ("SO118742")
const startsWithScore = 2 // the text STARTS with the word ("SO11")
const containsScore = 1 // the word appears somewhere inside the text
// Extra points when the match is in the record's name (serial number, SO number...).
const nameMatchBonus = 1
// ---------------------------------------------

// The four kinds of record that can be searched.
export type RecordKind = 'device' | 'salesOrder' | 'customer' | 'deviceGroup'

export type SearchEntry = {
  key: string // unique id like "salesOrder:SO118742"
  kind: RecordKind
  row: ConsolidatedRow
  searchTexts: string[]
  relatedKeys: string[]
}

// Builds one search entry from a record.
function makeEntry<Row>(
  kind: RecordKind,
  key: string,
  icon: ConsolidatedRow['icon'],
  record: Row,
  columns: NotionColumn<Row>[],
  relatedKeys: string[],
): SearchEntry {
  const row = makeConsolidatedRow(icon, record, columns)
  // We search in the name and in every label, in lowercase so capitals don't matter.
  const searchTexts = [row.name, ...row.labels.map((label) => label.text)].map((text) =>
    text.toLowerCase(),
  )
  return { key, kind, row, searchTexts, relatedKeys }
}

// ---------- The index: one entry per record ----------
// The related keys say which other records each one is connected to.
const searchEntries: SearchEntry[] = [
  ...devices.map((device) =>
    makeEntry('device', `device:${device.serialNumber}`, recordIcons.device, device, deviceColumns, [
      `group:${device.deviceGroupId}`,
      ...salesOrders
        .filter((order) => order.deviceSerials.includes(device.serialNumber))
        .map((order) => `salesOrder:${order.id}`),
    ]),
  ),
  ...salesOrders.map((order) =>
    makeEntry('salesOrder', `salesOrder:${order.id}`, recordIcons.salesOrder, order, salesOrderColumns, [
      `customer:${order.customerId}`,
      ...order.deviceSerials.map((serial) => `device:${serial}`),
    ]),
  ),
  ...customers.map((customer) =>
    makeEntry('customer', `customer:${customer.id}`, recordIcons.customer, customer, customerColumns, [
      ...getSalesOrdersForCustomer(customer.id).map((order) => `salesOrder:${order.id}`),
    ]),
  ),
  ...deviceGroups.map((group) =>
    makeEntry('deviceGroup', `group:${group.id}`, recordIcons.deviceGroup, group, deviceGroupColumns, [
      ...getDevicesInGroup(group.id).map((device) => `device:${device.serialNumber}`),
      ...getSalesOrdersForGroup(group.id).map((order) => `salesOrder:${order.id}`),
    ]),
  ),
]

// ---------- Scoring ----------

// How well does one piece of text match one word? (0 = not at all)
function scoreText(text: string, word: string): number {
  if (text === word) return exactMatchScore
  if (text.startsWith(word)) return startsWithScore
  if (text.includes(word)) return containsScore
  return 0
}

// How well does a whole entry match what was typed? (0 = doesn't match)
// EVERY word must match somewhere in the entry, so "inspire lincoln" only finds
// records that have both. The entry's score is the sum of each word's best match.
function scoreEntry(entry: SearchEntry, words: string[]): number {
  const entryName = entry.row.name.toLowerCase()
  let totalScore = 0
  for (const word of words) {
    const bestScore = Math.max(...entry.searchTexts.map((text) => scoreText(text, word)))
    if (bestScore === 0) return 0
    totalScore += bestScore
    if (entryName.includes(word)) totalScore += nameMatchBonus
  }
  return totalScore
}

// ---------- The search ----------

// Splits what was typed into lowercase words: "Science  Wing" -> ["science", "wing"].
// Also used by the results list to know which text to highlight.
export function getSearchWords(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean)
}

export type SearchResults = {
  bestMatch: SearchEntry | undefined // the record that matches best (none if nothing matches)
  related: SearchEntry[] // records connected to the best match
  otherMatches: SearchEntry[] // the remaining matches, best first
}

// Searches everything. Call it with whatever is in the search box.
export function searchDatabase(query: string): SearchResults {
  const words = getSearchWords(query)
  if (query.trim().length < minQueryLength) return { bestMatch: undefined, related: [], otherMatches: [] }

  // Score everything, drop non-matches, best first, keep the top few.
  const matches = searchEntries
    .map((entry) => ({ entry, score: scoreEntry(entry, words) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxMatches)
    .map((item) => item.entry)

  // The best match, then the records connected to it. A record that is both a
  // match and related is shown once, under "related".
  const bestMatch = matches[0]
  const related = bestMatch
    ? searchEntries.filter((entry) => bestMatch.relatedKeys.includes(entry.key))
    : []
  const relatedKeys = related.map((entry) => entry.key)
  const otherMatches = matches.slice(1).filter((entry) => !relatedKeys.includes(entry.key))

  return { bestMatch, related, otherMatches }
}
