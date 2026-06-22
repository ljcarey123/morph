# Contributing

## Workflow

- Branch off `main` per change; no direct pushes to `main` once collaborators
  are involved.
- Before opening a PR, run:
  ```bash
  npm run lint
  npm run format:check
  npm run build
  ```
- Keep PRs scoped to one concern. This repo favors small, reviewable diffs
  over bundling unrelated cleanup into a feature change.

## TypeScript

- `strict` mode is on project-wide (`tsconfig.app.json`, `tsconfig.node.json`,
  `tsconfig.api.json`). `any` is a lint error
  (`@typescript-eslint/no-explicit-any`) — if you're reaching for it, the
  type is underspecified somewhere; fix that instead.
- Use `interface` for object shapes (enforced by
  `@typescript-eslint/consistent-type-definitions`); reserve `type` for
  unions, tuples, and mapped/derived types.
- Fully type exported function signatures (params and return type). Local
  React components can rely on inference for their return type — annotating
  `JSX.Element` everywhere is noise.

## Defensive partial rendering

`useObject` delivers `partialUI` as the stream fills in — fields may be
`undefined`, and `code`/explanation strings may be truncated mid-token until
the stream completes. Every component reading from a partial object must:

- Use optional chaining (`partialUI?.code`) rather than assuming presence.
- Provide a sensible fallback (`?? ''`, `?? activeNote?.generatedUI?.code`),
  not a thrown error or blank crash state.
- Tolerate structurally invalid intermediate values (an unclosed tag, a
  half-written attribute) — the UI should look "still loading," never
  broken.

See `architecture.md` §5 for the canonical pattern.

## Iframe / sandbox

Never add `allow-scripts` or `allow-same-origin` to the generated-UI
`<iframe sandbox="...">`. This is a security boundary, not a default to
tune for convenience — see [SECURITY.md](./SECURITY.md) before touching it.

## State

- Cross-cutting app state (notes, active note, the user's API key) lives in
  `useNotesStore` (Zustand). Don't duplicate it into component state.
- Ephemeral, component-local UI state (an input's draft value, a hover flag)
  stays in `useState` — it doesn't belong in the store.

## Styling

- Tailwind utility classes only; no separate `.css` files per component.
  Keep components single-file: markup, logic, and styling together.
