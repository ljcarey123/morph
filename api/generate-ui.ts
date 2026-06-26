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
  'than a fresh design.\n\n' +
  'This renders inside a sandboxed iframe with no JavaScript execution: never generate ' +
  '<script> tags, onclick/onchange/etc. attributes, or <form> submissions, and never draw ' +
  'buttons, links, or controls that imply something will happen on click — none of it can ' +
  'run, and it will mislead the user. Anything actionable belongs in suggested_actions ' +
  'instead, which renders as real, clickable controls outside the sandbox. ' +
  'Always pair every background color with an explicitly contrasting text color on the same ' +
  'element or its container, and vice versa — never rely on browser or inherited defaults ' +
  'for either, since unstyled text can end up invisible against an unexpected background. ' +
  'Use a real color palette suited to the content rather than defaulting to plain black ' +
  'on white — standard but interesting, while keeping contrast clear and text easy to read. ' +
  'The outermost element of your markup must stretch to fill the entire canvas (width: 100%, ' +
  "min-height: 100vh) and carry your chosen background color itself — never leave the page's " +
  'plain white default exposed as a gap or border around your content. Apply comfortable ' +
  'padding as inner spacing on that same full-bleed element (or its children), not as outer ' +
  'margin, so the background reaches edge-to-edge while the content inside still feels ' +
  'comfortably spaced. Feel free to experiment with spacing, rounded corners, or other ' +
  'distinctive styling — but the whole thing must fit within the width and height of the ' +
  'container you are given: design to fit, not to scroll.\n\n' +
  'Every meaningfully distinct element you generate (sections, cards, headers, list items, ' +
  'individual diagram groups, etc.) must carry a stable, descriptive, kebab-case id attribute, ' +
  'unique within the document — never two elements sharing one id, never an empty id. This is ' +
  'how future edits will address specific parts of your output.\n\n' +
  'Every request carries a mode. In "branch" mode you have full latitude to redesign the view ' +
  'for the new direction, using any previous code only as loose context: return the full ' +
  '"code" field (with "ui_type") as the complete, self-contained markup for the ENTIRE view ' +
  'from top to bottom — never a fragment or just part of it.\n\n' +
  'In "edit" mode the user is refining the SAME existing view with a small, targeted tweak. You ' +
  'have two ways to respond — pick whichever fits:\n' +
  '1. If the tweak is local to one existing element, return "target_id" set to that element\'s ' +
  'existing id, and "replacement_html" set to the full replacement markup for just that element ' +
  '(including its own opening tag, carrying the same id). Omit "code" and "ui_type" entirely in ' +
  'this case.\n' +
  '2. If the tweak touches multiple disjoint elements, restructures the overall layout, or no ' +
  'single existing id covers it, fall back to returning the full "code" field (with "ui_type") ' +
  'exactly as in branch mode — reproducing every element of the existing view verbatim, ' +
  'byte-for-byte where unaffected, and only altering the specific part the tweak targets. Never ' +
  'drop, blank out, collapse, or replace untouched sections with placeholders, comments, or empty ' +
  'space — if you are not sure whether something is affected by the tweak, copy it through ' +
  'unchanged rather than omitting it.\n' +
  'Never return both a "code" document and a "target_id"/"replacement_html" patch in the same ' +
  'response.'

interface GenerateUiRequestBody {
  content: string
  direction: string
  previousCode?: string
  mode?: 'branch' | 'edit'
}

export default async function handler(req: Request): Promise<Response> {
  const apiKey = req.headers.get('x-user-api-key')
  if (!apiKey) {
    return Response.json({ error: 'Missing x-user-api-key header' }, { status: 401 })
  }

  const {
    content,
    direction,
    previousCode,
    mode = 'branch',
  } = (await req.json()) as GenerateUiRequestBody

  const google = createGoogleGenerativeAI({ apiKey })

  const previousCodeLabel =
    mode === 'edit' ? 'Existing view to refine' : 'Previous code to correct or expand on'
  const prompt = previousCode
    ? `Note content:\n${content}\n\nMode: ${mode}\n\nDirection: ${direction}\n\n${previousCodeLabel}:\n${previousCode}`
    : `Note content:\n${content}\n\nMode: ${mode}\n\nDirection: ${direction}`

  const result = streamText({
    model: google('gemini-flash-latest'),
    system: SYSTEM_PROMPT,
    prompt,
    output: Output.object({ schema: generativeUiSchema }),
  })

  return result.toTextStreamResponse()
}
