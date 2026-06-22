# Morph

A local-first generative UI workspace. See [architecture.md](./architecture.md) for the technical design, [claude.md](./claude.md) for the engineering conventions, [CONTRIBUTING.md](./CONTRIBUTING.md) for workflow and coding guidelines, and [SECURITY.md](./SECURITY.md) for the BYOK key-handling and iframe sandbox model.

## Stack

- React 18+ via Vite (TypeScript, strict mode)
- Zustand (with `persist` middleware)
- Tailwind CSS v4
- Vercel AI SDK (`ai`, `@ai-sdk/react`, `@ai-sdk/google`)
- Vercel Edge Functions (`/api`)

## Development

```bash
npm install
npm run dev           # start the Vite dev server (frontend only, no /api)
npm run build         # type-check and build for production
npm run lint          # run ESLint
npm run format        # apply Prettier
npm run format:check  # check formatting without writing
```

`/api` routes (Vercel Edge Functions) aren't served by `npm run dev` — Vite
doesn't run them. To exercise them locally, install the
[Vercel CLI](https://vercel.com/docs/cli) and run:

```bash
npm install -g vercel
vercel dev
```

This serves the frontend and `/api/*` together (default `http://localhost:3000`).
Try `/api/health` once running as a smoke test.

## API keys

Morph is BYOK (Bring Your Own Key) — there is no server-side default
provider key. Users supply their own Gemini API key in the UI; no
`.env.local` setup is required to run the app. See
[SECURITY.md](./SECURITY.md) for the full key-handling flow.
