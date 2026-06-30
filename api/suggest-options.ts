import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { suggestOptionsSchema } from '../src/schemas/suggestOptions'
import { PROMPT_TAGS, UNTRUSTED_DATA_NOTICE, sanitizeText, wrapInTag } from './_shared/sanitize'

export const config = { runtime: 'edge' }

const SYSTEM_PROMPT =
  "You suggest build directions for a note-taking app's UI generator. Given a " +
  "note's content, propose exactly 3 distinct, concrete directions for a small " +
  'HTML/SVG visualization that would suit this note (e.g. a timeline, a comparison ' +
  'table, a mind map) tailored to what the note is actually about. Keep each label ' +
  'short and each description to one sentence.\n\n' +
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
