import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { dynamicUiConfigSchema } from '../src/schemas/dynamicUi'
import { PROMPT_TAGS, UNTRUSTED_DATA_NOTICE, sanitizeText, wrapInTag } from './_shared/sanitize'

export const maxDuration = 60

const SYSTEM_PROMPT =
  'You are a Dashboard configuration engine. Given a note\'s content and a direction, output ' +
  'a JSON config that a renderer converts into an interactive HTML dashboard with cards, tabs, ' +
  'accordion panels, numeric counters, and on/off toggles.\n\n' +

  'LAYOUT — choose exactly one and populate only the matching field:\n' +
  '• "tabbed" → fill `tabs` (2–5 tabs, each with an id, label, and either cards[] or a body ' +
  'paragraph). Best for content with named, distinct sections.\n' +
  '• "cards"  → fill `cards` (2–8 entity cards in a grid). Best for comparing peer entities.\n' +
  '• "accordion" → fill `accordion` (3–8 items, each with id, title, body). Best for ' +
  'reference content the user reads selectively.\n\n' +

  'CARDS — available in any layout. Each card can include:\n' +
  '• stats[]: key/value pairs (e.g. { label: "Size", value: "42 km²" })\n' +
  '• body: one or two plain-text sentences\n' +
  '• controls[]: interactive widgets placed below the stats/body\n' +
  '  - counter: { type:"counter", id, label, min, max, initial }  — numeric stepper\n' +
  '  - toggle:  { type:"toggle",  id, label, initialOn }          — on/off switch\n' +
  '  Set stateKey (stable kebab-case) on either control only if the value should survive ' +
  'page reloads.\n\n' +

  'THEME — provide all 6 CSS color values: background, surface, border, accent, text, muted.\n' +
  'Pick colors that match the content domain (history → aged tones; tech → dark with neon ' +
  'accents; nature → greens). Make it visually distinctive, not a generic grey card grid.\n\n' +

  'OUTPUT RULES:\n' +
  '• suggested_actions: 2–3 short follow-up directions (≤8 words each)\n' +
  '• title: ≤6 words, or omit if the layout makes the topic self-evident\n' +
  '• All labels: 1–4 words. Body text: ≤2 sentences.\n\n' +

  UNTRUSTED_DATA_NOTICE

const requestSchema = z.object({
  content: z.string(),
  direction: z.string(),
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
  const { content, direction } = parsed.data

  console.debug('[api/generate-dynamic-ui] request', {
    contentLength: content.length,
    directionLength: direction.length,
  })

  const google = createGoogleGenerativeAI({ apiKey })

  const prompt =
    wrapInTag(PROMPT_TAGS.noteContent, sanitizeText(content, 8000)) +
    '\n\n' +
    wrapInTag(PROMPT_TAGS.userDirection, sanitizeText(direction, 500))

  const result = await generateText({
    model: google('gemini-flash-latest'),
    system: SYSTEM_PROMPT,
    prompt,
    output: Output.object({ schema: dynamicUiConfigSchema }),
    maxOutputTokens: 8192,
  })

  console.debug('[api/generate-dynamic-ui] result', {
    layout: result.output.layout,
    tabCount: result.output.tabs?.length,
    cardCount: result.output.cards?.length ?? result.output.tabs?.flatMap((t) => t.cards ?? []).length,
    finishReason: result.finishReason,
  })

  return Response.json(result.output)
}
