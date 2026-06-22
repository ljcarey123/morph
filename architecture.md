
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
2. **Application Layer (`/app/api/generate-ui/route.ts` & `/src/services/`)**
   - **`/app/api/generate-ui`**: A Vercel Edge runtime route. It reads optional custom client credentials out of incoming HTTP headers, spawns isolated provider runtime scopes, and utilizes the Vercel AI SDK `streamObject` helper to stream down valid chunked payloads.
   - **`SandboxOrchestrator`**: A client utility that dynamically patches broken incoming strings, wraps valid components in a real-time Tailwind script context, and prepares clean string targets for a sandboxed environment.
3. **Hooks & UI Layer (`/src/hooks/`, `/src/components/`)**
   - **`useGenerativeUI`**: Leverages the Vercel AI SDK client hooks to execute asynchronous streams and dynamically commit final payloads straight into the state store.

---

## 2. Core Data Models (TypeScript)

```typescript
export interface Note {
  id: string;
  title: string;
  content: string; // User markdown content
  createdAt: number;
  updatedAt: number;
  generatedUI?: GeneratedUI;
}

export interface GeneratedUI {
  explanation: string;
  uiType: 'html_snippet' | 'svg_diagram';
  code: string;
  suggestedActions: string[];
}

```

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
* `setGeneratedUI(id: string, uiData: GeneratedUI): void`



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

```

---

## 5. Security & Live Stream Iframe Strategy

To draw a UI live on screen without throwing syntax errors mid-stream, use the Vercel AI SDK `useObject` hook. It provides an active `object` representing partial fields. Defensive optional chaining avoids breaking the rendering pipeline:

```tsx
// Inside components/PreviewCanvas.tsx
import { useObject } from '@ai-sdk/react';
import { generativeUiSchema } from '@/schemas/generativeUi';

const { object: partialUI, submit, isLoading } = useObject({
  api: '/api/generate-ui',
  schema: generativeUiSchema,
});

// Render targeted layout inside isolated runtime
<iframe 
  srcDoc={SandboxOrchestrator.compileHtmlTemplate(
    partialUI?.code ?? activeNote?.generatedUI?.code ?? '', 
    partialUI?.ui_type ?? 'html_snippet'
  )}
  sandbox="allow-popups" // Pure static view isolation
  className="w-full h-full border-none transition-all duration-300"
/>

```
