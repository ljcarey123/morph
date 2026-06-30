import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { classifyIntentSchema } from '../src/schemas/classifyIntent'
import { PROMPT_TAGS, UNTRUSTED_DATA_NOTICE, sanitizeText, wrapInTag } from './_shared/sanitize'

export const config = { runtime: 'edge' }

const SYSTEM_PROMPT =
  "You classify a note-taking app user's message about an artifact they currently have open " +
  '(a generated visualization). Decide whether the message means to refine that same artifact ' +
  '("edit"), or to create a new, separate, or unrelated one ("create").\n\n' +
  'Default to "edit" — most messages sent while looking at an artifact are short tweaks to it ' +
  '("make it bigger", "use blue instead", "add a legend"), even when worded tersely or without ' +
  'explicitly referencing the artifact. Only classify as "create" when the message clearly ' +
  'describes a different topic, an additional/separate view, or otherwise reads as wanting ' +
  'something new rather than a change to what is currently shown — compare the message against ' +
  'the "<current_artifact>" description to judge whether it is on-topic.\n\n' +
  UNTRUSTED_DATA_NOTICE

const requestSchema = z.object({
  message: z.string(),
  currentArtifact: z.string(),
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
  const { message, currentArtifact } = parsed.data

  console.debug('[api/classify-intent] request', {
    messageLength: message.length,
    currentArtifactLength: currentArtifact.length,
  })

  const google = createGoogleGenerativeAI({ apiKey })

  const sanitizedMessage = wrapInTag(PROMPT_TAGS.userMessage, sanitizeText(message, 500))
  const sanitizedArtifact = wrapInTag(
    PROMPT_TAGS.currentArtifact,
    sanitizeText(currentArtifact, 200),
  )
  const prompt = `${sanitizedArtifact}\n\n${sanitizedMessage}`

  const result = await generateText({
    model: google('gemini-flash-latest'),
    system: SYSTEM_PROMPT,
    prompt,
    output: Output.object({ schema: classifyIntentSchema }),
  })

  console.debug('[api/classify-intent] result', {
    action: result.output.action,
    finishReason: result.finishReason,
  })

  return Response.json(result.output)
}
