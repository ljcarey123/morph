import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { suggestOptionsSchema } from '../src/schemas/suggestOptions'
import { PROMPT_TAGS, UNTRUSTED_DATA_NOTICE, sanitizeText, wrapInTag } from './_shared/sanitize'

export const config = { runtime: 'edge' }

const SYSTEM_PROMPT =
  "You suggest visualization ideas for a note-taking app's UI generator. Given a " +
  "note's content, propose exactly 3 distinct, imaginative directions — each one " +
  'specific to what the note is actually about, referencing real names, dates, ' +
  'figures, or themes from the content rather than generic placeholders.\n\n' +
  'Format:\n' +
  '- label: 2–4 word title for the chip (e.g. "Legion Deployment Map")\n' +
  '- description: a vivid 1–2 sentence prompt written as a direct instruction to ' +
  'the UI generator — specific enough that a designer could execute it without ' +
  'reading the note. Reference actual content (names, numbers, events). Start with ' +
  'an action verb ("Draw", "Build", "Show", "Render", "Map", "Chart"). ' +
  'Aim for 25–50 words.\n' +
  '- mode: pick "canvas" or "dashboard".\n' +
  '  Use "canvas" for any primarily visual output: maps, diagrams, charts, timelines, ' +
  'SVG graphics, network graphs, infographics, annotated illustrations.\n' +
  '  Use "dashboard" only when the suggestion is specifically a structured data-exploration ' +
  'interface: a card grid of entities with stats, a tabbed multi-section view, or a control ' +
  'panel with counters or toggles the user will operate (e.g. "adjust troop counts", ' +
  '"toggle province visibility").\n\n' +
  'Aim for variety across the 3 suggestions — different modes, chart types, or visual metaphors. ' +
  'Do not suggest a table or plain timeline every time.\n\n' +
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

  const sanitizedContent = wrapInTag(PROMPT_TAGS.noteContent, sanitizeText(content, 20000))

  const result = await generateText({
    model: google('gemini-flash-latest'),
    system: SYSTEM_PROMPT,
    prompt: sanitizedContent,
    output: Output.object({ schema: suggestOptionsSchema }),
  })

  console.debug('[api/suggest-options] result', {
    optionCount: result.output.options.length,
    finishReason: result.finishReason,
  })

  return Response.json(result.output)
}
