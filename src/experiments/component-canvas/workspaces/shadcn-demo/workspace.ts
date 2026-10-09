import type { Workspace } from '../../types'
import { shadcnDemoComponents } from './components'
import { shadcnDemoColorClasses } from './token-classes'
// `?inline` asks Vite for the stylesheet as a TEXT STRING (already compiled by Tailwind)
// instead of adding it to the page. The stage injects that text into its iframe only,
// so these styles never touch the editor panels around the canvas.
import workspaceCss from './styles.css?inline'

// ─────────────────────────────────────────────────────────────────────────────
// THE "shadcn-demo" WORKSPACE: one design system, packed into a single object.
//
// Everything the canvas knows about a design system comes through this object:
// its CSS, its color classes, its components (with placeholder content) and any
// providers they need. Nothing else in the experiment is specific to shadcn.
//
// A future IMPORTED project is just another folder like this one
// (workspaces/<project-name>/ with its own styles.css, token-classes.ts,
// components.tsx and workspace.ts). Swap which workspace the page loads and the
// whole canvas shows that project instead.
// ─────────────────────────────────────────────────────────────────────────────
export const shadcnDemoWorkspace: Workspace = {
  id: 'shadcn-demo',
  name: 'shadcn/ui',
  css: workspaceCss,
  colorClasses: shadcnDemoColorClasses,
  components: shadcnDemoComponents,
  // Providers wrapped around every component (router, data client, theme…).
  // shadcn's components don't need any, so the list is empty.
  decorators: [],
}
