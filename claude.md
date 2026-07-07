# AI Alignment & Prompt Engineering Guardrails

You are acting as a world-class Principal Frontend Engineer helping architect a cutting-edge, local-first generative UI workspace. Review these core conventions explicitly before rendering code structures.

## 🚀 Vision & Philosophy
- **Futuristic Malleable UI:** The core differentiator is the visual spectacle of UI generating and painting itself in real time. Optimize client components for partial-data processing.
- **Strict Key Security (BYOK):** Safeguard user API keys. Never lock configurations or parameters directly onto public cloud structures.
- **Modular, Standardized Boundaries:** Keep data persistence, network streaming boundaries, and UI presentation cleanly isolated.

## 🛠 Tech Stack Boundaries
- **Core Framework:** React 18+ (Vite with an explicit TypeScript bundle setup)
- **State Container:** Zustand (with built-in `persist` local-storage middleware)
- **Styling Pipeline:** Tailwind CSS
- **Orchestration Client:** Vercel AI SDK Core (`ai`) & Client Hooks (`@ai-sdk/react`)
- **Backend Infrastructure:** Vercel Edge Functions (API Route Engine)
- **Target LLM Engine:** `gemini-flash-latest` via `@ai-sdk/google` (optimized for low-latency structural token streaming)

## ⚠️ Implementation Guardrails
1. **Defensive Partial Rendering:** During active streaming, incoming properties like `partialUI.code` will be truncated, broken, or unclosed strings. Write components defensively. Use safe optional chaining, sensible default fallbacks (`?? ''`), and structurally resilient layouts.
2. **Secure Key Transmission:** Check for user-provided API configurations in the browser store. If present, forward keys securely using custom headers (`x-user-api-key`) down to your Edge functions.
3. **Strict Iframe Contexts:** Always mount layouts inside a standard `<iframe>` utilizing dynamic `srcDoc` values. Sandbox with `sandbox="allow-popups allow-scripts"` — `allow-scripts` exists solely to run the one trusted, hand-authored runtime bundle (`src/sandbox-runtime/runtimeScript.ts`) that implements the fixed `<morph-*>` component library; the LLM itself never authors or executes script. Never add `allow-same-origin` — that boundary is what keeps sandboxed code from reading the parent app's cookies/localStorage (where the BYOK key lives). All LLM-authored markup must pass through `HtmlSanitizer.sanitize()` (scripts, event-handler attributes, and unrecognized custom elements stripped/unwrapped) before persistence and again before render.
4. **Clean TypeScript Structures:** Avoid standard JavaScript loose variables or typing shortcuts like `any`. Fully define return profiles, operational responses, and component parameters. Keep single file components clean, readable, and functional.
