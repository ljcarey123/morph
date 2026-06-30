import { z } from 'zod'

export const generativeUiSchema = z.object({
  ui_type: z.enum(['html_snippet', 'svg_diagram']).optional(),
  code: z
    .string()
    .optional()
    .describe(
      'Full self-contained HTML or raw SVG document. No markdown wrap strings. Provide this ' +
        '(with ui_type) for a full redesign, or provide target_id + replacement_html instead ' +
        'for a targeted edit patch — never both, and never this alongside target_id.',
    ),
  target_id: z
    .string()
    .optional()
    .describe(
      'The id of an existing element to replace, for a targeted edit patch. Always provided ' +
        'together with replacement_html — never on its own, and never alongside code/ui_type, ' +
        'even for a large or substantial change.',
    ),
  replacement_html: z
    .string()
    .optional()
    .describe(
      "Markup to replace the target element with, including that element's own opening tag " +
        'carrying the same id. Required whenever target_id is set — a target_id without this ' +
        'is an incomplete, unusable response.',
    ),
  explanation: z.string().describe('One or two sentence summary of what this view shows and why.'),
  suggested_actions: z.array(z.string()).max(3),
})

export type GenerativeUi = z.infer<typeof generativeUiSchema>

// Mode-specific schemas given to the model as its structured-output constraint
// (api/generate-ui.ts picks one based on request.mode). Unlike the permissive
// generativeUiSchema above — which has to accept either shape since the client
// hook parses both modes through one schema — these make the one field each
// mode actually needs non-optional, so the provider's JSON-schema-constrained
// generation can't produce a schema-valid response that's missing it.
// Field order matters: Gemini's structured output fills fields in declared order, so the
// large/critical field goes first and the open-ended prose field goes last — a verbose
// "explanation" must never be able to starve the token budget before "code" is written.
export const branchOutputSchema = z.object({
  ui_type: z.enum(['html_snippet', 'svg_diagram']),
  code: z
    .string()
    .min(1)
    .describe(
      'Full self-contained HTML or raw SVG document for the entire view. No markdown wrap ' +
        'strings. Always required in this mode — never omit it, however large or ambitious ' +
        'the requested view is. Write this before "explanation".',
    ),
  explanation: z
    .string()
    .describe('One or two sentence summary of what this view shows and why. Keep it brief.'),
  suggested_actions: z.array(z.string()).max(3),
})

export const editOutputSchema = z.object({
  target_id: z
    .string()
    .min(1)
    .describe('The id of the existing element to replace with replacement_html.'),
  replacement_html: z
    .string()
    .min(1)
    .describe(
      "Markup to replace the target element with, including that element's own opening tag " +
        'carrying the same id. Always required alongside target_id in this mode. Write this ' +
        'before "explanation".',
    ),
  explanation: z
    .string()
    .describe('One or two sentence summary of what changed and why. Keep it brief.'),
  suggested_actions: z.array(z.string()).max(3),
})
