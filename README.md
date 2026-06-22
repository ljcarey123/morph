# Morph

A local-first generative UI workspace. See [architecture.md](./architecture.md) for the technical design and [claude.md](./claude.md) for the engineering conventions.

## Stack

- React 18+ via Vite (TypeScript, strict mode)
- Zustand (with `persist` middleware)
- Tailwind CSS v4
- Vercel AI SDK (`ai`, `@ai-sdk/react`, `@ai-sdk/google`)
- Vercel Edge Functions (`/api`)

## Development

```bash
npm install
npm run dev      # start the Vite dev server
npm run build    # type-check and build for production
npm run lint      # run ESLint
```

Vercel Edge Functions live under `/api` and are served locally via `vercel dev` (requires the [Vercel CLI](https://vercel.com/docs/cli)).
