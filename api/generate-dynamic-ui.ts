import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { dynamicUiConfigSchema } from '../src/schemas/dynamicUi'
import { PROMPT_TAGS, UNTRUSTED_DATA_NOTICE, sanitizeText, wrapInTag } from './_shared/sanitize'

export const config = { runtime: 'edge' }

const SYSTEM_PROMPT =
  "You are a UI configuration engine. Given a note's markdown content and a requested " +
  'direction, produce a compact JSON configuration for an interactive view. A fixed ' +
  'client-side renderer converts it to real HTML with working morph-tabs, morph-counter, ' +
  'morph-toggle, morph-accordion, and morph-tooltip components.\n\n' +
  'Layout — choose ONE and populate ONLY the matching field:\n' +
  '- "tabbed" → fill `tabs` (2–5 tabs, each with an id, label, and either cards or body text)\n' +
  '- "cards" → fill `cards` (2–8 cards, each with id, title, and optional stats/body/controls)\n' +
  '- "accordion" → fill `accordion` (3–8 items, each with id, title, and body)\n\n' +
  'Controls (inside cards only):\n' +
  '- counter: numeric value to track/adjust. Set stateKey (stable kebab-case) only if it ' +
  'should persist across reloads. Set reasonable min/max.\n' +
  '- toggle: binary on/off state. Set stateKey if it should persist.\n\n' +
  'Theme: choose colors matched to the content domain. All six fields are required.\n\n' +
  'Output constraints:\n' +
  '- suggested_actions: exactly 2–3 short follow-up prompts, no more.\n' +
  '- title: at most 6 words if provided; skip it if the layout makes the topic obvious.\n' +
  '- All string labels should be concise (1–4 words).\n\n' +
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
