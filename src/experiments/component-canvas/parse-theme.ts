import type { ThemeVariable } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// PARSE THEME: workspace CSS text → the list of theme variables (light + dark).
//
// The workspace CSS has already been compiled by Tailwind. Somewhere inside it are
// the project's theme blocks:
//
//   :root { --background: oklch(100% 0 0); --primary: oklch(20.5% 0 0); … }   ← light
//   .dark { --background: oklch(14.5% 0 0); --primary: oklch(92.2% 0 0); … }  ← dark
//
// We read those two kinds of blocks and nothing else. Tailwind also writes its own
// `:root, :host { --color-red-500: … }` blocks with hundreds of default values; we
// skip those because their selector isn't exactly ":root".
//
// The CSS can be minified (all on one line, no spaces) in production, or spread
// over many lines in development. Everything below ignores extra whitespace, so
// both work.
// ─────────────────────────────────────────────────────────────────────────────

// TWEAK: lightSelector / darkSelector — which CSS blocks hold the light and dark theme.
// If an imported project puts its dark theme on `[data-theme="dark"]`, change darkSelector.
const lightSelector = ':root'
const darkSelector = '.dark'

// TWEAK: ignoredVariablePrefix — variables starting with this are Tailwind internals
// (like --tw-shadow), not design tokens, so they're left out of the list.
const ignoredVariablePrefix = '--tw-'

// Finds "a selector followed by a { … } block with no other blocks inside it".
// Read it piece by piece:
//   ([^{}]+)   → the selector: one or more characters that are not { or }
//   \{         → the opening brace
//   ([^{}]*)   → the declarations: anything that is not { or }
//   \}         → the closing brace
// Because neither part may contain a brace, this only matches the INNERMOST blocks.
// So `@layer base { :root { … } }` still gives us ":root" and its declarations.
// The "g" flag means "find every match, not just the first one".
const innermostBlockPattern = /([^{}]+)\{([^{}]*)\}/g

// Removes /* comments */ so they can't confuse the block search above.
//   \/\*      → the opening "/*"
//   [\s\S]*?  → any characters, including newlines, as few as possible
//   \*\/      → the closing "*/"
const cssCommentPattern = /\/\*[\s\S]*?\*\//g

// Does a value look like a color? True for oklch(…), rgb(…), hsl(…), lab(…), color(…),
// and hex codes like #fff or #4f46e5. The "i" flag ignores upper/lower case.
const colorValuePattern = /^(oklch|oklab|rgba?|hsla?|lab|lch|hwb|color)\(|^#[0-9a-f]{3,8}$/i

// Reads "--name: value; --other: value" into [['--name', 'value'], ['--other', 'value']].
// Only custom properties (starting with --) are kept.
function readCustomProperties(declarations: string): [string, string][] {
  const result: [string, string][] = []
  for (const declaration of declarations.split(';')) {
    // Split at the FIRST colon only, because values can contain colons too.
    const colonIndex = declaration.indexOf(':')
    if (colonIndex === -1) continue
    const name = declaration.slice(0, colonIndex).trim()
    const value = declaration.slice(colonIndex + 1).trim()
    if (!name.startsWith('--') || name.startsWith(ignoredVariablePrefix) || value === '') continue
    result.push([name, value])
  }
  return result
}

// Which group a variable belongs to in the Styles tab.
function groupFor(name: string, value: string): ThemeVariable['group'] {
  if (name.includes('radius')) return 'radius'
  if (colorValuePattern.test(value)) return 'color'
  return 'other'
}

export function parseThemeVariables(css: string): ThemeVariable[] {
  // A Map remembers the order things were first added, so the list keeps the same
  // order as the CSS file (background, foreground, card, …) every time.
  const variablesByName = new Map<string, ThemeVariable>()

  const cssWithoutComments = css.replace(cssCommentPattern, '')

  for (const match of cssWithoutComments.matchAll(innermostBlockPattern)) {
    // The text before "{" can also hold the end of an earlier statement, like
    // `@charset "UTF-8";:root`. The selector is only the part after the last ";".
    const selector = (match[1].split(';').pop() ?? '').trim()
    const declarations = match[2]

    // Only the exact light/dark theme blocks. ":root,:host" and everything else is skipped.
    let mode: 'light' | 'dark'
    if (selector === lightSelector) mode = 'light'
    else if (selector === darkSelector) mode = 'dark'
    else continue

    for (const [name, value] of readCustomProperties(declarations)) {
      // First time we see this name: create its entry. The group is decided by the
      // first value we find (usually the light one).
      let variable = variablesByName.get(name)
      if (!variable) {
        variable = { name, group: groupFor(name, value) }
        variablesByName.set(name, variable)
      }
      // Light value goes in `light`, dark value in `dark`. If a block appears twice,
      // the later one wins, just like in CSS.
      variable[mode] = value
    }
  }

  return [...variablesByName.values()]
}
