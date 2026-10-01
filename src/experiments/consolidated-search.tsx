import { useState } from 'react'
import { InfoExplainer } from '@/components/info/info-explainer'
import { SpotlightSearch } from '@/components/search/spotlight-search'
import { searchDatabase } from '@/data/device-search'

// TWEAK: the hint shown under the empty search box. Good things to try typing.
const searchHint = 'Try SO118742, Inspire, Lincoln, Science Wing, or a serial number'

// TWEAK: how far the search box sits from the top of the page.
// Tailwind spacing: pt-16 = 4rem = 64px. Try pt-8 (32px) or pt-24 (96px).
const pageTopSpacingClass = 'pt-16'

// Experiment: Consolidated search
// One search box, centered horizontally near the top of the page, that searches
// every field of every record.
export default function ConsolidatedSearchExperiment() {
  // What's typed in the box. Changing it re-runs the search automatically.
  const [query, setQuery] = useState('')

  // The search runs on every keystroke. It's fast because the database is small.
  const results = searchDatabase(query)

  return (
    // `justify-center` centers the box left-to-right, `items-start` keeps it at the top; the top spacing comes from
    // `pageTopSpacingClass`. (Other experiments use ExperimentPage to center
    // vertically as well; this one doesn't.)
    <main className={`flex min-h-svh items-start justify-center px-6 pb-6 ${pageTopSpacingClass}`}>
      <SpotlightSearch
        query={query}
        onQueryChange={setQuery}
        results={results}
        hint={searchHint}
      />

      <InfoExplainer title="How this was built">
        <p>
          <strong>The idea:</strong> a Spotlight / KRunner style search. One big box near the top
          of the screen (64px down, set by <code>pageTopSpacingClass</code>); results drop down
          below it. It searches every field of every record in
          the database.
        </p>
        <p>
          <strong>The search:</strong> <code>src/data/device-search.ts</code>. When the app loads,
          every record becomes a "search entry" (its name plus all its labels, in lowercase). Once
          you've typed 3 characters (<code>minQueryLength</code>), every entry gets a score: an
          exact match scores more than "starts with", which scores more than "contains", and
          matches in the record's name get a bonus. Every word you type must match somewhere, so
          "inspire lincoln" narrows the results.
        </p>
        <p>
          <strong>Related records:</strong> each entry also knows which records are connected to
          it. The results show the best match first, then the records related to it, then the
          other matches. Search a sales order (like <code>SO118742</code>) and you get that order,
          then all its devices and its customer.
        </p>
        <p>
          <strong>The rows:</strong> each result is one line: icon, name (cut off with "…" if too
          long) and labels (cut off with a fade). Only 5 show at first. Pick a result and its name
          goes into the box, so you can keep exploring. When a row's labels are cut off, the left
          and right arrow keys scroll just that row sideways while its name stays put (
          <code>labelScrollStep</code> sets the distance).
        </p>
        <p>
          <strong>The full page:</strong> press Enter, or pick "Show all results", and the
          experiment switches to a full results page (<code>full-results-list.tsx</code>). The
          dropdown fades out and collapses while the search box widens (<code>fullPageWidth</code>)
          into a page header. Below it: a title, a checkbox per category with counts, the results
          grouped by category (Best match, Sales orders, Organizations, Device groups, Devices;
          edit <code>sectionDefinitions</code> to change them), 25 rows per page (
          <code>resultsPerPage</code>) and page buttons. The best match can be expanded with
          "Related records" to show everything connected to it. Ticking a checkbox or changing
          page replays the staggered fade. Escape or the X goes back to the short list. If you've
          moved the highlight with the up / down arrows, Enter picks that row instead.
        </p>
        <p>
          <strong>The animation:</strong> the panel moves through three states. (1) Once you've
          typed 3 characters, a small panel grows open and shows a spinner, pretending to search
          a big database (the search itself is instant; the 1.2 second wait is fake, set by{' '}
          <code>searchingDuration</code>). (2) The spinner's dots then scatter outward and fade.
          (3) The panel grows to full size, and headings and rows fade in one after another,
          sliding up, in the order they appear: "Best match", its row, "Related to…", its rows.
          Opening the full page plays in order: the dropdown fades out and collapses as the box
          widens, then the title and filters, the rows and the page buttons fade in in that
          order.
          Typing again restarts the wait, and every new search cancels the previous animation first
          so the spinner always shows. All the timings are at the top of{' '}
          <code>spotlight-search.tsx</code>, and the spinner itself is{' '}
          <code>components/loaders/dot-spinner.tsx</code>.
        </p>
        <p>
          <strong>Highlighting:</strong> a label that contains what you typed gets a thin outline
          (set in <code>NotionTag</code>; change <code>ring-foreground/25</code> to make it
          fainter or stronger). If the match is in a label that's cut off, the row scrolls to
          show it.
        </p>
        <p>
          <strong>The look:</strong> <code>SpotlightSearch</code> in{' '}
          <code>components/search/</code>, built on shadcn's <code>Command</code> component (which
          gives us arrow-key navigation), reusing the icons and colored labels from the Data
          tables experiment.
        </p>
        <p>
          <strong>Things to try:</strong> change <code>searchingDuration</code>, <code>rowStagger</code> or the other
          timings in the spotlight file; change <code>minQueryLength</code> or the scores at the
          top of the search file; change the typing size (<code>text-2xl</code>); add a device to the database and search for it.
        </p>
      </InfoExplainer>
    </main>
  )
}
