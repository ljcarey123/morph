
# Technical Architecture & Data Schemas

## 1. Application Architecture Layers

Local-first, BYOK streaming workspace. The user's API key never leaves the browser except as a request header forwarded to the Vercel Edge function, which uses it to call Gemini and streams the result back. No server-side key storage.

```
[Component / Hooks Layer]  ◄──(useObject stream / fetch)──►  [Vercel Edge API]
│                                                                     │
├── useGenerativeUI (Simple / Canvas)                                 ├── /api/generate-ui
├── useGenerativeDynamicUI (Dashboard)                                ├── /api/generate-dynamic-ui
├── useSuggestOptions                                                  └── /api/suggest-options
└── useNotesStore (Zustand + persist localStorage)                          │
                                                                     [Gemini via @ai-sdk/google]
```

**Store layer** — `useNotesStore` (Zustand + `persist` middleware). Single source of truth for notes, artifact tabs, BYOK key, and per-tab component state. All persisted to localStorage; no server DB today.

**API layer** — Three Vercel Edge functions. All require the `x-user-api-key` header (BYOK). Untrusted user fields wrapped in delimiter tags before reaching the model prompt.

**Services layer** — Pure client utilities: `HtmlSanitizer` (strips scripts, event handlers, unknown custom elements), `HtmlPatcher` (normalizes streaming-truncated HTML via the DOM parser, calls sanitizer), `SandboxOrchestrator` (compiles the final `srcDoc` — injects the trusted runtime script, calls sanitizer again as defence-in-depth), `DynamicUiRenderer` (turns a typed JSON config into HTML for Dashboard mode).

**Sandbox runtime** — `src/sandbox-runtime/runtimeScript.ts` is the only JavaScript ever executed inside the artifact iframe. Hand-authored, never LLM-generated. Implements the `morph-*` custom-element library and the `postMessage` state bridge. `registry.ts` is the single source of truth for allowed tags and attributes, used by both the sanitizer allowlist and the prompt component docs.

**Hooks layer** — `useGenerativeUI` (drives `/api/generate-ui` via `experimental_useObject`), `useGenerativeDynamicUI` (drives `/api/generate-dynamic-ui` via `fetch`), `useSuggestOptions` (drives `/api/suggest-options`), `useThrottledValue` (trailing-edge throttle, 1 s, immediate flush on stream end).

**Component layer** — `NoteWorkspace` (composes everything for one note), `ArtifactTabs` (tab strip), `ArtifactView` (header + preview area, fullscreen portal, grow-in animation on tab switch), `ArtifactComposer` (3-mode toggle + text input), `PreviewCanvas` (memoized `srcDoc`, `postMessage` bridge listener, iframe).

---

## 2. Core Data Models (TypeScript)

```typescript
export interface Note {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
  tabs: GeneratedUITab[]
  activeTabId: string | null
  suggestedOptions: SuggestedOption[]  // cached from /api/suggest-options
}

export interface GeneratedUITab {
  id: string
  title: string
  uiType?: 'html_snippet' | 'svg_diagram'
  code: string
  explanation: string
  suggestedActions: string[]
  direction: string          // the prompt that produced this tab
  generationMode?: 'simple' | 'canvas' | 'dynamic'
  createdAt: number
  status: 'streaming' | 'done' | 'error'
  error?: string
  componentState?: Record<string, string | number | boolean>  // persisted morph-* state
}

export interface SuggestedOption {
  label: string
  description: string
  mode: 'simple' | 'canvas' | 'dashboard'
}
```

---

## 3. Generation Modes

Three modes, selectable via the `ArtifactComposer` toggle:

| Mode | API route | Output | morph-* components |
|---|---|---|---|
| **Simple** | `/api/generate-ui` (`style=simple`) | Plain HTML/CSS | None — scripts and morph-* stripped |
| **Canvas** | `/api/generate-ui` (`style=canvas`) | HTML with interactive components | tabs, accordion, carousel, tooltip |
| **Dashboard** | `/api/generate-dynamic-ui` | JSON config → `DynamicUiRenderer` → HTML | toggle, counter (stateful) |

The `/api/suggest-options` response includes a `mode` field per option, so the model can recommend which mode suits a given direction.

---

## 4. Store Actions (`useNotesStore`)

| Action | Description |
|---|---|
| `createNote / updateNoteContent / updateNoteTitle / deleteNote` | Note CRUD |
| `setApiKey(key)` | Store BYOK key in localStorage |
| `setSuggestedOptions(noteId, options)` | Cache suggest-options response |
| `addPendingTab(noteId, direction)` | Create a streaming-state tab, return its id |
| `patchGeneratedTab(noteId, tabId, patch)` | Merge patch into tab (code, status, error, etc.) |
| `removeTab(noteId, tabId)` | Delete a tab, fall back active tab |
| `setActiveTabId(noteId, tabId \| null)` | Switch active tab (null = note editor) |
| `patchComponentState(noteId, tabId, key, value)` | Persist morph-* component state |

---

## 5. Security & Iframe Sandbox

### Sanitization chain

LLM output passes through sanitization twice:

1. **At persistence** — `HtmlPatcher.normalize()` runs `DOMParser` to close truncated tags, then calls `HtmlSanitizer.sanitize()`. This is what gets stored in `tab.code`.
2. **At render** — `SandboxOrchestrator.compileHtmlTemplate()` calls `HtmlSanitizer.sanitize()` again as defence-in-depth before injecting into `srcDoc`.

`HtmlSanitizer` strips: `<script>`, `<iframe>`, `<object>`, `<embed>`, `<link>`, all `on*` event-handler attributes, `href`/`src` starting with `javascript:`. For hyphenated custom elements: unknown tags are **unwrapped** (children kept, wrapper dropped); known tags (from `registry.ts`) have non-allowlisted attributes stripped.

### Iframe policy

```
sandbox="allow-popups allow-scripts"
```

- `allow-scripts` is present solely to run `runtimeScript.ts` (the trusted component library).
- **`allow-same-origin` is never added** — without it the iframe gets an opaque/null origin and cannot access the parent app's cookies or localStorage, where the BYOK key lives.

### postMessage bridge

`PreviewCanvas` listens for messages from the iframe's `contentWindow` only:

```typescript
// Accepted message shapes (validated with zod):
{ type: 'morph:request-state', key: string, requestId: string }
{ type: 'morph:report-state',  key: string, value: string | number | boolean }
```

Anything that doesn't match is silently dropped. `morph:report-state` calls `patchComponentState`; `morph:request-state` replies with the stored value.

---

## 6. morph-* Component Library

Six components, all implemented in `src/sandbox-runtime/runtimeScript.ts`. The LLM emits declarative markup; the runtime wires up behaviour.

| Component | Canvas | Dashboard | State persistence |
|---|---|---|---|
| `morph-tabs` | ✓ | — | optional (`data-state-key`) |
| `morph-accordion` | ✓ | — | — |
| `morph-carousel` | ✓ | — | — |
| `morph-tooltip` | ✓ | — | — |
| `morph-toggle` | — | ✓ | required (`data-state-key`) |
| `morph-counter` | — | ✓ | required (`data-state-key`) |

`registry.ts` is the single source of truth: its attribute allowlist drives `HtmlSanitizer`'s per-tag rules, and the Canvas system prompt pulls component docs from it to stay in sync.

**Key runtime behaviour:** all components use the `hidden` attribute (not inline `display:none`) to show/hide panels and tooltip content. On `connectedCallback`, each component calls `style.removeProperty("display")` on runtime-controlled child elements to normalise any inline pre-hiding the LLM may have written.

---

## 7. API Schemas (Zod)

```typescript
// /api/generate-ui — structured output constraint sent to the model
export const branchOutputSchema = z.object({
  ui_type: z.enum(['html_snippet', 'svg_diagram']),
  code: z.string().min(1),       // declared first so Gemini fills it before explanation
  explanation: z.string(),
  suggested_actions: z.array(z.string()).max(3),
})

// /api/suggest-options
export const suggestOptionsSchema = z.object({
  options: z.array(z.object({
    label: z.string(),
    description: z.string(),
    mode: z.enum(['simple', 'canvas', 'dashboard']),
  })).length(3),
})
```

`/api/generate-dynamic-ui` uses its own `dynamicUiSchema` for the JSON config that `DynamicUiRenderer` consumes.

---

## 8. Streaming & Partial Rendering

The Canvas/Simple path uses `experimental_useObject` (`@ai-sdk/react`) against `streamText + Output.object` on the server. The partial `object` is passed through `useThrottledValue(partialUI, 1_000, !isLoading)` — commits at most once per second while streaming, flushes immediately when `isLoading` goes false.

`SandboxOrchestrator.compileHtmlTemplate` is memoized in `PreviewCanvas` via `useMemo([code, uiType])`, so the iframe only remounts when content actually changes — not on every parent re-render.

The Dashboard path uses a plain `fetch` (no streaming) since `generate-dynamic-ui` returns a complete JSON object.

---

## 9. Future Considerations

### Supabase for accounts & sync

Current persistence is localStorage-only. Adding Supabase would unlock cross-device sync and user accounts. The BYOK model is compatible — the API key stays in the browser and the edge function call pattern doesn't change. Planned scope: auth + notes/tabs sync first; artifact HTML blobs can be regenerated cheaply so blob storage is lower priority. Offline-first sync (write locally, replicate async) is the right model for a workspace tool.

### Playwright for end-to-end testing

Current coverage (vitest + jsdom) is unit/component-level only — nothing exercises the real iframe sandbox, the `postMessage` bridge, or a generate → render → interact flow in a real browser. Playwright would close that gap.

Worth covering once added: a real generation round-trip rendering a `morph-tabs`/`morph-accordion` artifact and clicking through it, the `data-state-key` persistence surviving a reload, and a forged `<script>`/`onclick` in model output confirmed never executing.

### In-browser LLMs

`/api/suggest-options` is called frequently (on every note focus) and has a small, structured output. A small quantized model via Transformers.js (WASM/WebGPU, cached in IndexedDB after first load, no API key) could replace it for cost reduction. The `/api/generate-ui` path needs real reasoning quality for long, schema-following HTML — keep it on Gemini.
