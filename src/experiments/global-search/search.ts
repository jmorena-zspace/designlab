import { allContent } from './data'
import type { ContentType, SearchItem } from './data/types'

// How the search decides what matches and in what order.
//
// 1. EXACT matches: the query is exactly an item's name or its quick launch code
//    (ignoring upper/lower case). Only these become the "Best match" on top.
// 2. Everything else is a normal match: EVERY word you type must be found somewhere
//    (name, code, keywords, subject or application). Each place a word is found
//    adds points, and results are sorted by points, highest first.

// TWEAK: the points for each kind of hit. Bigger = that kind of hit ranks higher.
const pointsNameStartsWithQuery = 300 // "chem" → "Chemistry of Caves"
const pointsNameContainsQuery = 120 // "chem" → "Solid State Chemistry"
const pointsCodeStartsWithWord = 80 // "A7" → "A701"
const pointsNameWordStartsWithWord = 60 // "cav" → "Chemistry of Caves"
const pointsNameContainsWord = 30
const pointsKeywordStartsWithWord = 25 // "batter" → keyword "batteries"
const pointsSubjectOrAppContainsWord = 10 // "physical" → subject "Physical Science"

// "All results" or one content type, like the category buttons in Spotlight.
export type Scope = 'all' | ContentType

// One result: the item, its points, and (when the name itself didn't match) a short
// note explaining WHY it showed up, like "keyword: batteries".
export type Match = {
  item: SearchItem
  score: number
  reason?: string
}

export type SearchResults = {
  exactMatches: Match[] // the "Best match" items
  matchesByType: Record<ContentType, Match[]> // everything else, grouped and sorted
}

// Lowercase, trimmed, and curly apostrophes made straight, so "newton’s" finds "Newton's".
export function normalize(text: string): string {
  return text.toLowerCase().replace(/[’‘]/g, "'").trim()
}

// Split the query into words ("solid  state" → ["solid", "state"]).
export function splitIntoWords(query: string): string[] {
  return normalize(query).split(/\s+/).filter(Boolean)
}

// Only some types have these attributes, so these helpers return '' / [] when missing.
function getCode(item: SearchItem): string {
  return 'code' in item ? item.code : ''
}
function getKeywords(item: SearchItem): string[] {
  return 'keywords' in item ? item.keywords : []
}
function getSubjectAndApp(item: SearchItem): string[] {
  const extras: string[] = []
  if ('subject' in item) extras.push(item.subject)
  if ('application' in item) extras.push(item.application)
  return extras
}

// Is the query exactly this item's name or quick launch code?
function isExactMatch(item: SearchItem, query: string): boolean {
  const code = getCode(item)
  return normalize(item.name) === query || (code !== '' && normalize(code) === query)
}

// Score one item against the query. Returns null when it doesn't match at all.
function scoreItem(item: SearchItem, query: string, words: string[]): Match | null {
  const name = normalize(item.name)
  const nameWords = name.split(/[\s:,.!?()-]+/)
  const code = normalize(getCode(item))
  const keywords = getKeywords(item).map(normalize)
  const subjectAndApp = getSubjectAndApp(item).map(normalize)

  let score = 0
  if (name.startsWith(query)) score += pointsNameStartsWithQuery
  else if (name.includes(query)) score += pointsNameContainsQuery

  let reason: string | undefined
  let nameMatchedSomething = name.includes(query)

  // Every word must be found somewhere; each word adds the points of its best hit.
  for (const word of words) {
    let bestPointsForWord = 0

    if (nameWords.some((nameWord) => nameWord.startsWith(word))) {
      bestPointsForWord = pointsNameWordStartsWithWord
      nameMatchedSomething = true
    } else if (name.includes(word)) {
      bestPointsForWord = pointsNameContainsWord
      nameMatchedSomething = true
    }
    if (code.startsWith(word)) {
      bestPointsForWord = Math.max(bestPointsForWord, pointsCodeStartsWithWord)
      nameMatchedSomething = true // the code is shown next to the name, so no note needed
    }
    if (bestPointsForWord === 0) {
      const keyword = keywords.find((candidate) => candidate.startsWith(word) || candidate.includes(` ${word}`))
      if (keyword) {
        bestPointsForWord = pointsKeywordStartsWithWord
        reason = reason ?? `keyword: ${keyword}`
      } else if (subjectAndApp.some((text) => text.includes(word))) {
        bestPointsForWord = pointsSubjectOrAppContainsWord
      }
    }

    if (bestPointsForWord === 0) return null // this word wasn't found anywhere
    score += bestPointsForWord
  }

  return { item, score, reason: nameMatchedSomething ? undefined : reason }
}

// Highest score first; ties are sorted A→Z so the order never jumps around.
function byScoreThenName(a: Match, b: Match): number {
  return b.score - a.score || a.item.name.localeCompare(b.item.name)
}

function emptyGroups(): Record<ContentType, Match[]> {
  return { lesson: [], collection: [], app: [], resource: [], model: [] }
}

// Search everything. Called each time the query changes (it takes well under a
// millisecond for a few hundred items, so no need for anything fancier).
export function searchContent(rawQuery: string): SearchResults {
  const query = normalize(rawQuery)
  const words = splitIntoWords(rawQuery)
  const results: SearchResults = { exactMatches: [], matchesByType: emptyGroups() }
  if (!query) return results

  for (const item of allContent) {
    if (isExactMatch(item, query)) {
      results.exactMatches.push({ item, score: Infinity })
      continue // exact matches only appear in "Best match", not again below
    }
    const match = scoreItem(item, query, words)
    if (match) results.matchesByType[item.type].push(match)
  }

  for (const group of Object.values(results.matchesByType)) group.sort(byScoreThenName)
  return results
}

// With an empty query and one type selected, list every item of that type A→Z,
// so you can browse.
export function listAllOfType(type: ContentType): Match[] {
  return allContent
    .filter((item) => item.type === type)
    .map((item) => ({ item, score: 0 }))
    .sort(byScoreThenName)
}
