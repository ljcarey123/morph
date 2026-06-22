import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { Output, streamText } from 'ai'
import { generativeUiSchema } from '../src/schemas/generativeUi'

export const config = { runtime: 'edge' }

const SYSTEM_PROMPT =
  "You are a UI generation engine. Given a note's markdown content and a requested " +
  'direction, produce a single self-contained HTML snippet or raw SVG diagram that ' +
  'visualizes it, a short explanation of your reasoning, and up to 3 suggested next ' +
  'actions. Return clean HTML or SVG only — no markdown code fences. If previous code ' +
  'is provided, treat the direction as a correction or expansion of that code rather ' +
  'than a fresh design.'

interface GenerateUiRequestBody {
  content: string
  direction: string
  previousCode?: string
}

export default async function handler(req: Request): Promise<Response> {
  const apiKey = req.headers.get('x-user-api-key')
  if (!apiKey) {
    return Response.json({ error: 'Missing x-user-api-key header' }, { status: 401 })
  }

  const { content, direction, previousCode } = (await req.json()) as GenerateUiRequestBody

  const google = createGoogleGenerativeAI({ apiKey })

  const prompt = previousCode
    ? `Note content:\n${content}\n\nDirection: ${direction}\n\nPrevious code to correct or expand on:\n${previousCode}`
    : `Note content:\n${content}\n\nDirection: ${direction}`

  const result = streamText({
    model: google('gemini-flash-latest'),
    system: SYSTEM_PROMPT,
    prompt,
    output: Output.object({ schema: generativeUiSchema }),
  })

  return result.toTextStreamResponse()
}
