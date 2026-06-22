# Security Model

## Bring Your Own Key (BYOK)

Morph has no shared or default provider key. There is nothing to leak from a
server-side secret because none exists.

**Data flow for a user's API key:**

1. The user enters their Gemini API key in the UI. It is written to
   `userApiKey` in `useNotesStore` (Zustand), persisted only to the browser's
   `localStorage` via the `persist` middleware. It never reaches any backend
   datastore.
2. On each generation request, the client reads the key from the store and
   sends it as the `x-user-api-key` request header — never as a query
   parameter, and never embedded in the request body.
3. The Edge function reads `x-user-api-key` from the incoming request,
   uses it to construct a request-scoped provider client, and discards it
   when the request completes. The key is never logged, never written to
   disk or any cache, and never echoed back in a response.
4. If `x-user-api-key` is missing or empty, the route must reject the
   request (`401`) rather than falling back to any default key — there is no
   fallback key to fall back to.

**Implications for implementation:**

- Don't add `console.log`/error-tracking calls that could capture request
  headers wholesale — log structured fields, never the raw header object.
- Don't introduce a server-side default key "for convenience" (e.g. a
  `GOOGLE_GENERATIVE_AI_API_KEY` env var used when the header is absent).
  That decision has been made deliberately: see the BYOK section of
  [claude.md](./claude.md).

## Iframe / Sandbox Trust Boundary

Generated UI code (`GeneratedUI.code`) comes from an LLM and must be treated
as untrusted input — equivalent to user-submitted HTML.

- Rendered exclusively via `<iframe srcDoc={...} sandbox="allow-popups">`.
- `allow-scripts` must never be added to the `sandbox` attribute. Without it,
  any `<script>` tag the model emits is inert — it will not execute. This is
  the entire security boundary; removing it turns every generation into
  unsandboxed script execution in the app's origin context.
- Don't add `allow-same-origin` either — combined with `allow-scripts` it
  would let an iframe script reach back into the parent document/storage
  (including `localStorage`, where the user's API key lives).
- If a future feature genuinely needs interactivity inside the canvas (e.g.
  clickable generated buttons), that requires a deliberate redesign of this
  boundary — not a one-line sandbox attribute change. Raise it as its own
  discussion rather than loosening this in passing.

## Secrets in the repo

- `.env.example` documents the (currently empty) set of server env vars.
  Real values go in `.env.local`, which `.gitignore` already excludes via the
  `*.local` pattern.
- `.vercel/` (created by `vercel link`/`vercel dev`) is gitignored.
