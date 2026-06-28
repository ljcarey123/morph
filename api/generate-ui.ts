import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { Output, streamText } from 'ai'
import { z } from 'zod'
import { generativeUiSchema } from '../src/schemas/generativeUi'
import { PROMPT_TAGS, UNTRUSTED_DATA_NOTICE, sanitizeText, wrapInTag } from './_shared/sanitize'

export const config = { runtime: 'edge' }

const ROLE_INTRO =
  "You are a UI generation engine. Given a note's markdown content and a requested direction, " +
  'produce a single self-contained HTML snippet or raw SVG diagram that visualizes it, a short ' +
  'explanation of your reasoning, and up to 3 suggested next actions. Return clean HTML or SVG ' +
  'only — no markdown code fences.'

const RENDERING_RULES = [
  'No interactivity: never generate <script> tags, onclick/onchange/etc. attributes, or <form> ' +
    'submissions, and never draw buttons, links, or controls that imply something will happen ' +
    'on click. This renders inside a sandboxed iframe with no JavaScript execution — none of it ' +
    'can run, and it will mislead the user. Anything actionable belongs in suggested_actions ' +
    'instead, which renders as real, clickable controls outside the sandbox.',
  'Contrast: always pair every background color with an explicitly contrasting text color on ' +
    'the same element or its container, and vice versa — never rely on browser or inherited ' +
    'defaults for either, since unstyled text can end up invisible against an unexpected ' +
    'background. Use a real color palette suited to the content rather than defaulting to ' +
    'plain black on white — standard but interesting, while keeping contrast clear.',
  'Full-bleed canvas: the outermost element of your markup must stretch to fill the entire ' +
    "canvas (width: 100%, min-height: 100vh) and carry your chosen background color itself — " +
    "never leave the page's plain white default exposed as a gap or border around your " +
    'content. Apply comfortable padding as inner spacing on that same element (or its ' +
    'children), not as outer margin, so the background reaches edge-to-edge.',
  'Fit, never scroll: the whole thing must fit within the width and height of the container ' +
    "you're given — design to fit, not to scroll. Feel free to experiment with spacing, " +
    'rounded corners, or other distinctive styling within that constraint.',
  'Stable ids: every meaningfully distinct element you generate (sections, cards, headers, ' +
    'list items, individual diagram groups, etc.) must carry a stable, descriptive, ' +
    'kebab-case id attribute, unique within the document — never two elements sharing one id, ' +
    'never an empty id. The single outermost element of your markup must also carry its own ' +
    'stable id (use "view-root" unless something more descriptive fits), so it is always ' +
    'available as a guaranteed edit target even when nothing smaller covers a requested change.',
]

const SHARED_RULES =
  ROLE_INTRO +
  '\n\n' +
  UNTRUSTED_DATA_NOTICE +
  '\n\n' +
  RENDERING_RULES.map((rule) => `- ${rule}`).join('\n')

const BRANCH_SYSTEM_PROMPT =
  SHARED_RULES +
  '\n\n' +
  'You are designing a fresh view for the given direction. If previous code is provided, treat ' +
  'it as loose context for continuity, not a constraint — you have full latitude to redesign ' +
  'from scratch. Return the full "code" field (with "ui_type") as the complete, self-contained ' +
  'markup for the ENTIRE view from top to bottom — never a fragment or just part of it. Never ' +
  'return "target_id" or "replacement_html".'

const EDIT_SYSTEM_PROMPT =
  SHARED_RULES +
  '\n\n' +
  'You are refining the SAME existing view the user is already looking at, with a small, ' +
  'targeted tweak. Always respond with a patch — never the full "code"/"ui_type" fields:\n' +
  '- Set "target_id" to the existing id of the SMALLEST element that fully contains everything ' +
  'the tweak touches, and "replacement_html" to the full replacement markup for just that ' +
  "element (including its own opening tag, carrying the same id).\n" +
  '- If the tweak is local to one existing element, target that element directly — do not ' +
  'reach for a bigger ancestor out of caution.\n' +
  '- If it touches multiple disjoint elements or restructures the layout, walk up to whichever ' +
  'shared ancestor contains all of it — up to and including the outermost "view-root" element ' +
  'if nothing smaller does — and target that instead.\n' +
  '- Never drop, blank out, collapse, or replace untouched sections with placeholders, ' +
  'comments, or empty space — if you are not sure whether something is affected by the tweak, ' +
  'copy it through unchanged rather than omitting it.\n' +
  '- "target_id" and "replacement_html" are an all-or-nothing pair: always set both together, ' +
  'never one without the other, and never substitute "code"/"ui_type" instead — even when the ' +
  "tweak is substantial (e.g. adding a large new section inside the target). However big the " +
  'change, write it out in full inside "replacement_html" rather than reaching for the ' +
  'full-document fields.'

const requestSchema = z.object({
  content: z.string(),
  direction: z.string(),
  previousCode: z.string().optional(),
  mode: z.enum(['branch', 'edit']).optional(),
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
  const { content, direction, previousCode, mode = 'branch' } = parsed.data

  const google = createGoogleGenerativeAI({ apiKey })

  const sanitizedContent = wrapInTag(PROMPT_TAGS.noteContent, sanitizeText(content, 20000))
  const sanitizedDirection = wrapInTag(PROMPT_TAGS.userDirection, sanitizeText(direction, 500))
  const sanitizedPreviousCode = previousCode
    ? wrapInTag(PROMPT_TAGS.existingView, sanitizeText(previousCode, 20000))
    : undefined

  const previousCodeLabel =
    mode === 'edit' ? 'Existing view to refine' : 'Previous code to correct or expand on'
  const prompt = sanitizedPreviousCode
    ? `Note content:\n${sanitizedContent}\n\nMode: ${mode}\n\nDirection: ${sanitizedDirection}\n\n${previousCodeLabel}:\n${sanitizedPreviousCode}`
    : `Note content:\n${sanitizedContent}\n\nMode: ${mode}\n\nDirection: ${sanitizedDirection}`

  const result = streamText({
    model: google('gemini-flash-latest'),
    system: mode === 'edit' ? EDIT_SYSTEM_PROMPT : BRANCH_SYSTEM_PROMPT,
    prompt,
    output: Output.object({ schema: generativeUiSchema }),
  })

  return result.toTextStreamResponse()
}
