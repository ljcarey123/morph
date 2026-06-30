import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { Output, streamText } from 'ai'
import { z } from 'zod'
import { branchOutputSchema, editOutputSchema } from '../src/schemas/generativeUi'
import { COMPONENT_REGISTRY } from '../src/sandbox-runtime/registry'
import { PROMPT_TAGS, UNTRUSTED_DATA_NOTICE, sanitizeText, wrapInTag } from './_shared/sanitize'

export const config = { runtime: 'edge' }

const ROLE_INTRO =
  "You are a UI generation engine. Given a note's markdown content and a requested direction, " +
  'produce a single self-contained HTML snippet or raw SVG diagram that visualizes it, a short ' +
  'explanation of your reasoning, and up to 3 suggested next actions. Return clean HTML or SVG ' +
  'only — no markdown code fences.'

const COMPONENT_DOCS = COMPONENT_REGISTRY.map((component) => {
  const attrs = component.attributes
    .map((attribute) => `    - ${attribute.name} (${attribute.type}): ${attribute.description}`)
    .join('\n')
  return (
    `  ${component.tag}: ${component.description}\n` +
    (attrs ? `${attrs}\n` : '') +
    `    Example:\n      ${component.example.split('\n').join('\n      ')}`
  )
}).join('\n')

const RENDERING_RULES = [
  'No scripting of your own: never generate <script> tags, onclick/onchange/etc. attributes, ' +
    'javascript: URLs, or <form> submissions — anything like this is stripped before render and ' +
    'will simply be missing, misleading the user. The ONLY way to make something interactive is ' +
    'the fixed set of pre-built components below; everything else you draw (including plain ' +
    '<button>/<a> elements) must be purely static, since clicking it does nothing. Anything that ' +
    'should trigger a real action belongs in suggested_actions instead.',
  'Interactive components: you may use these custom tags freely inside your markup — they are ' +
    'real, working, pre-built widgets, not placeholders. Wire up their documented data-* child ' +
    'markers/attributes exactly as shown; everything else about their appearance (colors, ' +
    'spacing, layout) is yours to style same as any other element:\n' +
    COMPONENT_DOCS +
    '\n  Only set "data-state-key" on a component when its value should be remembered across ' +
    'edits and reloads (e.g. a counter tracking real progress) — give it a stable, descriptive, ' +
    'kebab-case value, unique within the document, same spirit as element ids below. Leave it ' +
    'off for purely transient state like which tab happens to be open.',
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

  console.debug('[api/generate-ui] request', {
    mode,
    contentLength: content.length,
    direction,
    hasPreviousCode: Boolean(previousCode),
    previousCodeLength: previousCode?.length ?? 0,
  })

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

  console.debug('[api/generate-ui] calling model', {
    mode,
    schema: mode === 'edit' ? 'editOutputSchema' : 'branchOutputSchema',
    promptLength: prompt.length,
  })

  const result =
    mode === 'edit'
      ? streamText({
          model: google('gemini-flash-latest'),
          system: EDIT_SYSTEM_PROMPT,
          prompt,
          maxOutputTokens: 8192,
          output: Output.object({ schema: editOutputSchema }),
          onFinish: ({ finishReason, usage }) => {
            console.debug('[api/generate-ui] stream finished', { mode, finishReason, usage })
          },
        })
      : streamText({
          model: google('gemini-flash-latest'),
          system: BRANCH_SYSTEM_PROMPT,
          prompt,
          maxOutputTokens: 8192,
          output: Output.object({ schema: branchOutputSchema }),
          onFinish: ({ finishReason, usage }) => {
            console.debug('[api/generate-ui] stream finished', { mode, finishReason, usage })
          },
        })

  return result.toTextStreamResponse()
}
