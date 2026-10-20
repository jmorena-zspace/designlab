import { apps } from './apps'
import { collections } from './collections'
import { lessons } from './lessons'
import { models } from './models'
import { resources } from './resources'
import type { App, SearchItem } from './types'

// The whole "database" in one list, so the search can look through everything at once.
export const allContent: SearchItem[] = [...lessons, ...collections, ...apps, ...resources, ...models]

// Look up an app by its name (lessons and resources only store the app's name).
// A Map is like a dictionary: give it a name, get the app back instantly.
const appsByName = new Map(apps.map((app) => [app.name, app]))
export function findAppByName(name: string): App | undefined {
  return appsByName.get(name)
}
