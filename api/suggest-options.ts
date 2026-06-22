import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText, Output } from 'ai'
import { suggestOptionsSchema } from '../src/schemas/suggestOptions'

export const config = { runtime: 'edge' }

const SYSTEM_PROMPT =
  "You suggest build directions for a note-taking app's UI generator. Given a " +
  "note's content, propose exactly 3 distinct, concrete directions for a small " +
  'HTML/SVG visualization that would suit this note (e.g. a timeline, a comparison ' +
  'table, a mind map) tailored to what the note is actually about. Keep each label ' +
  'short and each description to one sentence.'

export default async function handler(req: Request): Promise<Response> {
  const apiKey = req.headers.get('x-user-api-key')
  if (!apiKey) {
    return Response.json({ error: 'Missing x-user-api-key header' }, { status: 401 })
  }

  const { content } = (await req.json()) as { content: string }

  const google = createGoogleGenerativeAI({ apiKey })

  const result = await generateText({
    model: google('gemini-flash-latest'),
    system: SYSTEM_PROMPT,
    prompt: content,
    output: Output.object({ schema: suggestOptionsSchema }),
  })

  return Response.json(result.output)
}
