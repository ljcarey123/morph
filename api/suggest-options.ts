import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { suggestOptionsSchema } from '../src/schemas/suggestOptions'
import { PROMPT_TAGS, UNTRUSTED_DATA_NOTICE, sanitizeText, wrapInTag } from './_shared/sanitize'

export const maxDuration = 60

const SYSTEM_PROMPT =
  "You suggest visualization ideas for a note-taking app's UI generator. Given a note's " +
  'content, propose exactly 3 distinct, imaginative directions — each specific to what the ' +
  'note is actually about, referencing real names, dates, figures, or themes rather than ' +
  'generic placeholders.\n\n' +

  'FORMAT:\n' +
  '• label: 2–4 word chip title (e.g. "Legion Deployment Map")\n' +
  '• description: a vivid 1–2 sentence prompt written as a direct instruction — specific ' +
  'enough that a designer could execute it without reading the note. Reference actual ' +
  'content. Start with an action verb (Draw, Build, Show, Render, Map, Chart). 25–50 words.\n' +
  '• mode: "canvas" or "dashboard" (see below)\n\n' +

  'MODE GUIDE:\n' +
  '• "simple" — plain static visual output: reference cards, summary layouts, ' +
  'typography-driven infographics, annotated illustrations. No interactive components. ' +
  'Best when the note is text-heavy or the value is in clean presentation, not navigation.\n' +
  '• "canvas" — richer visual output that benefits from tab navigation (explore multiple ' +
  'sections) or hover tooltips (annotated maps, diagrams with definitions). Same visual ' +
  'freedom as simple, but use only when tabbing or tooltips genuinely add value.\n' +
  '• "dashboard" — structured data explorer: a grid of entity cards with stats, a ' +
  'tabbed multi-section view, or a panel with numeric counters and on/off toggles the ' +
  'user will actively operate (e.g. "adjust troop counts", "toggle province visibility", ' +
  '"track resource levels"). Choose dashboard when interaction — not just visual layout — ' +
  'is the point.\n\n' +

  'Aim for variety across the 3 suggestions: different modes, chart types, or visual ' +
  'metaphors. Avoid suggesting the same visual form twice.\n\n' +

  UNTRUSTED_DATA_NOTICE

const requestSchema = z.object({
  content: z.string(),
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
  const { content } = parsed.data

  console.debug('[api/suggest-options] request', { contentLength: content.length })

  const google = createGoogleGenerativeAI({ apiKey })

  const result = await generateText({
    model: google('gemini-flash-latest'),
    system: SYSTEM_PROMPT,
    prompt: wrapInTag(PROMPT_TAGS.noteContent, sanitizeText(content, 20000)),
    output: Output.object({ schema: suggestOptionsSchema }),
  })

  console.debug('[api/suggest-options] result', { optionCount: result.output.options.length })

  return Response.json(result.output)
}
