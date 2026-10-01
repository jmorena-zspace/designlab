# DesignLab

Experimentation environment for UI ideas.

Stack: Vite · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · GSAP · Three.js

```bash
npm install
npm run dev
```

- Add shadcn components: `npx shadcn@latest add <component>`
- Put experiments in `src/experiments/`

## Live site

Published with GitHub Pages: https://jmorena-zspace.github.io/designlab/

Every push to `main` rebuilds and redeploys it automatically (see
`.github/workflows/deploy.yml`). To deploy by hand, open the repository's **Actions** tab,
pick **Deploy to GitHub Pages** and press **Run workflow**.

Experiments are opened with `#` links, for example
`https://jmorena-zspace.github.io/designlab/#/node-based-assignment`.
