
# Technical Architecture & Data Schemas

## 1. Application Architecture Layers

The application utilizes a decoupled, local-first streaming presentation model optimized for Vercel Serverless/Edge Runtimes:


```

[UI/Hooks Layer] ◄──(useObject Live Stream)──► [Vercel Edge API Route]
│                                                 │
▼                                                 ▼
[useNotesStore] (Zustand + Persist)              [Gemini 1.5 Flash via AI SDK]

```

1. **Business Layer (`/src/store/useNotesStore.ts`)**
   - A Zustand state engine backed by `persist` local-storage middleware.
   - Manages notes data maps, the currently active workspace ID, and client-side custom API keys.
2. **Application Layer (`/api/generate-ui.ts`, `/api/suggest-options.ts` & `/src/services/`)**
   - **`/api/generate-ui`**: A Vercel Edge runtime route. It reads optional custom client credentials out of incoming HTTP headers, spawns isolated provider runtime scopes, and utilizes the Vercel AI SDK `streamText` + `Output.object` helper to stream down valid chunked payloads. Accepts a `direction` (the chosen suggestion or free-text request) and an optional `previousCode` (the active tab being corrected/expanded) alongside `content`.
   - **`/api/suggest-options`**: A Vercel Edge runtime route. Given a note's `content`, makes a fast, non-streaming `generateText` + `Output.object` call that proposes exactly 3 tailored build directions for the Generate popup.
   - **`SandboxOrchestrator`**: A client utility that dynamically patches broken incoming strings, wraps valid components in a real-time Tailwind script context, and prepares clean string targets for a sandboxed environment.
3. **Hooks & UI Layer (`/src/hooks/`, `/src/components/`)**
   - **`useGenerativeUI`**: Leverages the Vercel AI SDK client hooks to execute asynchronous streams and, on completion, appends the result as a new `GeneratedUITab` on the note rather than overwriting any previous result.
   - **`useSuggestOptions`**: Plain fetch wrapper around `/api/suggest-options`, used to populate the 3 suggestion cards shown before each generation.
   - **`useThrottledValue`**: Generic trailing-edge throttle used to limit how often the streaming partial UI is committed to render state (~10s), with an immediate flush once the stream finishes.
   - **`GeneratedUIPanel`**: A large, glassmorphic, animated popup (not an inline column) hosting the tab bar, the `PreviewCanvas` body, and the "Add view" row (3 suggestions + free-text input) used to grow new tabs.

---

## 2. Core Data Models (TypeScript)

```typescript
export interface Note {
  id: string;
  title: string;
  content: string; // User markdown content
  createdAt: number;
  updatedAt: number;
  tabs: GeneratedUITab[];
  activeTabId: string | null;
}

export interface GeneratedUITab {
  id: string;
  title: string;
  uiType: 'html_snippet' | 'svg_diagram';
  code: string;
  explanation: string;
  suggestedActions: string[];
  direction: string; // the suggestion label or free-text request that produced this tab
  createdAt: number;
}

```

Each Generate action appends a new `GeneratedUITab` to `note.tabs` rather than
overwriting the previous result, so every build direction the user explores
stays accessible from the popup's tab bar.

---

## 3. Application Component Specifications

### A. Business Layer: `useNotesStore` (Zustand)

* **State Properties:**
* `notes: Record<string, Note>`
* `activeNoteId: string | null`
* `userApiKey: string | null` (Bring Your Own Key option stored locally)


* **Actions:**
* `createNote / updateNoteContent / deleteNote`
* `setApiKey(key: string | null): void`
* `addGeneratedTab(id: string, tab: Omit<GeneratedUITab, 'id' | 'createdAt'>): void` — appends a new tab and makes it active
* `setActiveTabId(id: string, tabId: string): void`



### B. Application Layer: `SandboxOrchestrator` (Client Sandbox)

* **Methods:**
* `compileHtmlTemplate(rawHtml: string || undefined, uiType: string): string`
* Returns a fully structured HTML shell string. Safely inserts a fallbacked version of `rawHtml`. If code blocks terminate mid-tag during an active stream, it falls back gracefully or wraps it cleanly so the browser canvas updates smoothly.
* Injects `<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>` directly inside the frame context for instant visual styling.





---

## 4. Unified Vercel API Schema (Zod)

The server runtime and client streaming receiver share this explicit structure via Zod:

```typescript
import { z } from 'zod';

export const generativeUiSchema = z.object({
  explanation: z.string().describe("Architectural analysis or workflow overview of the canvas."),
  ui_type: z.enum(['html_snippet', 'svg_diagram']),
  code: z.string().describe("Clean HTML or raw SVG structural data. No markdown wrap strings."),
  suggested_actions: z.array(z.string()).max(3),
});

export const suggestOptionsSchema = z.object({
  options: z.array(z.object({
    label: z.string().describe('Short 2-4 word name for this build direction.'),
    description: z.string().describe('One sentence on what this would build.'),
  })).length(3),
});

```

---

## 5. Security & Live Stream Iframe Strategy

To draw a UI live on screen without throwing syntax errors mid-stream, use the Vercel AI SDK `useObject` hook. It provides an active `object` representing partial fields. Defensive optional chaining avoids breaking the rendering pipeline:

> Note: in the installed `@ai-sdk/react` version, this hook is exported as `experimental_useObject` — import it as `import { experimental_useObject as useObject } from '@ai-sdk/react'`.

Re-rendering the iframe on every streamed token is unnecessary churn, so the
partial object is passed through `useThrottledValue` before reaching
`PreviewCanvas` — it commits at most once per ~10s while streaming, then
flushes immediately once `isLoading` becomes false:

```tsx
// Inside components/GeneratedUIPanel.tsx
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { generativeUiSchema } from '@/schemas/generativeUi';
import { useThrottledValue } from '@/hooks/useThrottledValue';

const { object: partialUI, submit, isLoading } = useObject({
  api: '/api/generate-ui',
  schema: generativeUiSchema,
});

const throttled = useThrottledValue(partialUI, 10_000, !isLoading);
const code = isLoading ? throttled?.code : activeTab?.code;

// Render targeted layout inside isolated runtime — unchanged sandbox policy
<iframe 
  srcDoc={SandboxOrchestrator.compileHtmlTemplate(
    code ?? '', 
    isLoading ? throttled?.ui_type : activeTab?.uiType ?? 'html_snippet'
  )}
  sandbox="allow-popups" // Pure static view isolation
  className="w-full h-full border-none transition-all duration-300"
/>

```

---

## 6. Future Considerations

### Playwright for end-to-end testing

Current test coverage (vitest + jsdom) is unit/component-level only — nothing
exercises the actual iframe sandbox, the `postMessage` state bridge, or a
real generate → render → interact flow in a real browser. Playwright would
close that gap.

Plan: develop specs interactively against `npm run dev` using the Playwright
MCP server (driving the browser through Claude Code turn by turn, which is
also a deliberate way to build the skill), then commit the resulting specs
as ordinary `@playwright/test` files that run headless in CI. The two modes
aren't exclusive — MCP for authoring/debugging, `@playwright/test` for
repeatable runs.

Worth covering once added: a real generation round-trip rendering a
`morph-tabs`/`morph-toggle` artifact and clicking through it, the
`data-state-key` persistence surviving a reload, and a forged
`<script>`/`onclick` in model output confirmed never executing.

### In-browser LLMs for cost reduction

Goal is offloading small, frequent tasks from the Gemini API — not
replacing `generate-ui`, which needs real reasoning quality to produce long,
structurally correct, schema-following HTML/SVG.

- **`classify-intent`** is the strongest candidate: called on every chat
  message, tiny input (message ≤500 chars, artifact summary ≤200 chars),
  single binary output (`edit`/`create`). This is narrow enough that it
  likely doesn't need a generative LLM at all — a **Transformers.js**
  zero-shot-classification pipeline (small quantized model, WASM/WebGPU,
  cached in IndexedDB after first load, no API key) is a better fit than a
  chat-style local LLM for a single classification decision.
- **`suggest-options`** is a weaker fit for now: it reasons over up to 20k
  chars of note content to propose creative directions, which needs more
  breadth than small on-device models realistically have today, and it's
  called far less often (not per keystroke) — leave it on Gemini.
- Tradeoff to surface in the UI either way: first use downloads and caches a
  model (tens of MB for a small classifier), so the composer should show a
  "loading local model…" state rather than appearing to hang.
