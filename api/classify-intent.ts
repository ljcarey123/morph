import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { classifyIntentSchema } from '../src/schemas/classifyIntent'
import { PROMPT_TAGS, UNTRUSTED_DATA_NOTICE, sanitizeText, wrapInTag } from './_shared/sanitize'

export const config = { runtime: 'edge' }

const SYSTEM_PROMPT =
  "You classify a note-taking app user's message about an artifact they currently have open " +
  '(a generated visualization). Return two fields:\n\n' +
  '1. action: "edit" to refine the current artifact, "create" for a new or unrelated one.\n' +
  '   Default to "edit" — most messages sent while viewing an artifact are short tweaks ' +
  '   ("make it bigger", "use blue instead", "add a legend"). Only use "create" when the ' +
  '   message clearly describes a different topic, an additional view, or reads as wanting ' +
  '   something new rather than a change to what is shown.\n\n' +
  '2. mode: "dynamic" or "static".\n' +
  '   Use "dynamic" only when the request specifically calls for interactive controls the user ' +
  '   will operate — tabs to switch between views, counters to increment/decrement, toggles to ' +
  '   flip on/off, or accordion sections to expand. These are rendered by a fixed component ' +
  '   library; the model produces JSON config, not HTML.\n' +
  '   Use "static" for everything else: charts, diagrams, timelines, prose layouts, data ' +
  '   tables, SVG diagrams, or any view that is purely presentational. Prefer "static" when ' +
  '   in doubt — a static view with visual richness is better than a half-interactive one.\n' +
  '   Note: "edit" actions are always static (patching existing HTML), so set mode to ' +
  '   "static" whenever action is "edit".\n\n' +
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
    mode: result.output.mode,
    finishReason: result.finishReason,
  })

  return Response.json(result.output)
}
