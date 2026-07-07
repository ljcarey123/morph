import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { Output, streamText } from 'ai'
import { z } from 'zod'
import { branchOutputSchema } from '../src/schemas/generativeUi'
import { PROMPT_TAGS, UNTRUSTED_DATA_NOTICE, sanitizeText, wrapInTag } from './_shared/sanitize'

export const config = { runtime: 'edge' }

// Canvas mode exposes only these two morph-* components.
// Counters, toggles, accordion, and carousel belong to Dashboard mode exclusively.
const CANVAS_COMPONENTS = `\
INTERACTIVE COMPONENTS — Canvas supports exactly two morph-* custom elements:

──────────────────────────────────────────────
<morph-tabs>  Tab-switched content panels
──────────────────────────────────────────────
STRUCTURE RULES (strictly required — getting these wrong silently breaks the component):
  • data-tab-trigger="<id>" buttons AND data-tab-panel="<id>" sections MUST both be
    direct children of the same <morph-tabs> element. Never place panels outside it.
  • The value of data-tab-trigger must exactly match the value of data-tab-panel (case-sensitive).
  • Set default-tab="<id>" on <morph-tabs> to specify which panel appears first.
  • Style all tab buttons identically — the runtime controls which is active via
    opacity and font-weight. Never hardcode per-button active/inactive differences.
  • NEVER set display:none or hidden on data-tab-panel elements — the runtime manages
    initial visibility using default-tab. Pre-hiding panels with display:none breaks switching.

Working example:
<morph-tabs id="view-tabs" default-tab="overview" style="display:block">
  <div style="display:flex;gap:4px;border-bottom:1px solid #334155;margin-bottom:20px">
    <button data-tab-trigger="overview" style="padding:6px 18px;border:none;border-bottom:2px solid #818cf8;background:none;color:#818cf8;cursor:pointer;font-size:0.82rem;letter-spacing:0.06em;text-transform:uppercase">Overview</button>
    <button data-tab-trigger="details"  style="padding:6px 18px;border:none;border-bottom:2px solid #818cf8;background:none;color:#818cf8;cursor:pointer;font-size:0.82rem;letter-spacing:0.06em;text-transform:uppercase">Details</button>
  </div>
  <div data-tab-panel="overview"><p style="color:#e2e8f0">Overview content here.</p></div>
  <div data-tab-panel="details"><p style="color:#e2e8f0">Details content here.</p></div>
</morph-tabs>

──────────────────────────────────────────────
<morph-tooltip>  Hover or click to reveal
──────────────────────────────────────────────
STRUCTURE RULES:
  • data-tooltip-trigger and data-tooltip-content must be direct children of <morph-tooltip>.
  • <morph-tooltip> itself must have position:relative so the content can be positioned absolutely.
  • Use trigger="click" for click-to-reveal; omit for hover (default).

Working example:
<morph-tooltip id="tip-term" trigger="hover" style="position:relative;display:inline-block">
  <span data-tooltip-trigger style="border-bottom:1px dotted currentColor;cursor:help">term</span>
  <div data-tooltip-content style="position:absolute;top:120%;left:0;z-index:20;background:#1e293b;color:#f1f5f9;padding:8px 14px;border-radius:6px;font-size:0.8rem;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,0.5)">
    Explanation of the term
  </div>
</morph-tooltip>

──────────────────────────────────────────────
NEVER generate <script>, on* event attributes, javascript: URLs, or <form> — all are stripped.
If the direction asks for counters, toggles, or a structured data panel, note in your explanation
that Dashboard mode is better suited and generate the best visual Canvas alternative you can.`

const NO_INTERACTIVITY_RULE =
  'No interactivity: do not generate <script>, on* event attributes, javascript: URLs, ' +
  '<form>, or morph-* custom elements. Pure HTML and CSS only.'

const ROLE_INTRO =
  "You are a Canvas UI generator. Given a note's content and a direction, produce one " +
  'self-contained HTML snippet or raw SVG diagram. Focus on visual quality — typography, ' +
  'layout, color. Return only the markup — no markdown fences, no preamble.'

const SHARED_RENDERING_RULES = [
  'Contrast: wherever you set a background color, set an explicit text color on the same ' +
    'element or its immediate container, and vice versa. Never rely on browser defaults — ' +
    'unstyled text can be invisible against an unexpected background. A thematic palette is ' +
    'better than plain black on white; just keep contrast accessible.',
  'Full-bleed canvas: the outermost element must fill the full canvas (width:100%; ' +
    'min-height:100vh) and carry your background color — no plain-white default peeking ' +
    'through as a gap. Use internal padding, not outer margin, for spacing.',
  'Viewport: the iframe panel is typically 600px wide and 500–700px tall. Design for this ' +
    'panel size — avoid tall block-flow layouts that force a vertical scrollbar. Compact, ' +
    'proportional sizing wins over full-page web layouts.',
  'Stable ids: give every meaningful element (sections, cards, headers, list items, diagram ' +
    'groups) a stable, unique kebab-case id. The outermost element must use "view-root" (or ' +
    'a descriptive alternative) — it is the guaranteed fallback target.',
  'Visual style: commit to one coherent aesthetic that fits the content domain — ' +
    'dark/cinematic (deep navy or slate bg, vivid accent) for dramatic or narrative content; ' +
    'dense/technical (dark bg, structured grid, monospace accents) for data or analysis; ' +
    'editorial (off-white bg, strong typographic hierarchy, generous spacing) for reference or ' +
    'writing. Pick one and execute it fully. A focused palette beats a generic grey card grid.',
  'Follow-up prompts: "suggested_actions" should be 2–3 short follow-up directions, ≤6 words ' +
    'each, starting with an action verb, specific to what was just generated (e.g. "Add Q3 data ' +
    'to timeline", "Switch to dark palette", "Zoom into top five"). Avoid generic directives.',
  'Output budget: "explanation" is one or two sentences, ≤40 words. Write the full markup ' +
    'first; a long explanation with truncated markup is a failed response.',
]

function buildSharedRules(interactivityRule: string): string {
  return [
    ROLE_INTRO,
    UNTRUSTED_DATA_NOTICE,
    interactivityRule,
    SHARED_RENDERING_RULES.map((r) => `- ${r}`).join('\n'),
  ].join('\n\n')
}

const CANVAS_SYSTEM_PROMPT =
  buildSharedRules(CANVAS_COMPONENTS) +
  '\n\n' +
  'You are generating a fresh view. Return the full "code" field with "ui_type" as the ' +
  'complete markup for the entire view.'

const SIMPLE_SYSTEM_PROMPT =
  buildSharedRules(NO_INTERACTIVITY_RULE) +
  '\n\n' +
  'You are generating a fresh view. Return the full "code" field with "ui_type" as the ' +
  'complete markup for the entire view.'

const requestSchema = z.object({
  content: z.string(),
  direction: z.string(),
  style: z.enum(['simple', 'canvas']).default('canvas'),
})

export default async function handler(req: Request): Promise<Response> {
  const apiKey = req.headers.get('x-user-api-key')
  if (!apiKey) {
    return Response.json({ error: 'Missing x-user-api-key header' }, { status: 401 })
  }

  const parsed = requestSchema.safeParse(await req.json())
  if (!parsed.success) {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const { content, direction, style } = parsed.data

  console.debug('[api/generate-ui] request', {
    style,
    contentLength: content.length,
    direction,
  })

  const google = createGoogleGenerativeAI({ apiKey })

  const sanitizedContent = wrapInTag(PROMPT_TAGS.noteContent, sanitizeText(content, 20000))
  const sanitizedDirection = wrapInTag(PROMPT_TAGS.userDirection, sanitizeText(direction, 500))
  const prompt = `Note content:\n${sanitizedContent}\n\nDirection: ${sanitizedDirection}`

  const systemPrompt = style === 'simple' ? SIMPLE_SYSTEM_PROMPT : CANVAS_SYSTEM_PROMPT

  console.debug('[api/generate-ui] calling model', { style, promptLength: prompt.length })

  const result = streamText({
    model: google('gemini-flash-latest'),
    system: systemPrompt,
    prompt,
    maxOutputTokens: 16384,
    output: Output.object({ schema: branchOutputSchema }),
    onFinish: ({ finishReason, usage }) => {
      console.debug('[api/generate-ui] stream finished', { style, finishReason, usage })
    },
  })

  return result.toTextStreamResponse()
}
