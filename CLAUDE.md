# DesignLab

Juan's experimentation environment for UI ideas.
Stack: Vite · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · GSAP · Three.js

## About the person you're working with

Juan is learning to code. Every decision should favor code that a beginner can read, understand, and tinker with.

## Rules for every session

### 1. Human-readable code first
- Prefer clear, simple code over clever or compact code.
- Use descriptive names for variables, functions, components, and files (`cardHoverScale`, not `s`).
- Keep files and functions small and focused on one job.
- Avoid advanced patterns (heavy abstraction, complex generics, deep nesting) unless there's no simpler way. If one is needed, explain it in a comment.

### 2. Components belong to their experiment (no sharing between experiments)
- **Each new experiment lives in its own folder** and owns everything it needs. Example:
  ```
  src/experiments/node-based-assignment/
  ├── node-based-assignment.tsx   ← the experiment page (default export)
  ├── components/                 ← this experiment's own components
  ├── data/                       ← this experiment's own data
  └── (layout.ts, hooks, helpers…) ← anything else only this experiment uses
  ```
- **No common components between experiments**, unless Juan specifically calls one out. If two experiments need something similar, each gets its own copy. Don't "helpfully" extract shared code, and don't import from another experiment's folder.
- Inside the experiment's `components/` folder, keep components bespoke to that experiment and don't over-engineer them.
- Each experiment gets its own simple database/data file. Don't reuse another experiment's data unless Juan asks.
- **Allowed shared pieces (the only exceptions):**
  - shadcn/ui building blocks in `src/components/ui/` (managed by the shadcn CLI; generic, like Lego bricks). Our own designed components are built *from* these and never go inside `ui/`.
  - `src/components/info/info-explainer.tsx`, the info button + explainer panel every experiment uses (so its design can be changed in one place later).
- **Older experiments** (`device-info`, `data-tables`, `consolidated-search`) were built before this rule and still use the shared folders `src/components/cards|tables|tags|search|loaders|layout/` and `src/data/`. Leave them as they are unless Juan asks to restructure them, and don't add new experiments to those folders.

### 3. Every experiment page has an explainer
- Each experiment must include an explainer that expands from an info button.
- The explainer must make it clear how the experiment was built: the idea, the tools used (GSAP, Three.js, Tailwind...), the key steps, and which values to tweak.
- Use the shared `InfoExplainer` from `src/components/info/` (the one allowed shared component, see rule 2). The info button's visual design will be worked on later.
- Update the explainer whenever the experiment changes.

### 4. Efficient code, generously commented for learning
- Write efficient code (clean up Three.js/GSAP resources, avoid needless re-renders and duplicated work).
- Put a comment above each meaningful block explaining **how it's built** and **what it does**.
- Call out the values Juan can change, and what each one does. Use a clear marker, for example:
  `// TWEAK: rotationSpeed — higher = faster spin (try 0.5 to 5)`
- Put tweakable values at the top of the file (or component) as named constants rather than burying magic numbers in the middle of the code.
- Comments should be plain-language and explain the *why*, not just repeat the code.

### 5. Project conventions
- Import with the `@/` alias (`@/components/...`).
- Experiments live in `src/experiments/`, one folder per experiment (see rule 2), and are registered in the `experiments` list in `src/App.tsx`.
- Add shadcn components with `npx shadcn@latest add <component>`.
- Verify with `npm run build` before saying something is done. Don't start the dev server unless asked (Juan runs it himself).
- Only commit when asked.
