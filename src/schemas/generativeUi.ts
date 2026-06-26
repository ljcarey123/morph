import { z } from 'zod'

export const generativeUiSchema = z.object({
  explanation: z.string().describe('Architectural analysis or workflow overview of the canvas.'),
  ui_type: z.enum(['html_snippet', 'svg_diagram']).optional(),
  code: z
    .string()
    .optional()
    .describe(
      'Full self-contained HTML or raw SVG document. No markdown wrap strings. Provide this ' +
        '(with ui_type) for a full redesign, or provide target_id + replacement_html instead ' +
        'for a targeted edit patch — never both.',
    ),
  target_id: z
    .string()
    .optional()
    .describe('The id of an existing element to replace, for a targeted edit patch.'),
  replacement_html: z
    .string()
    .optional()
    .describe(
      "Markup to replace the target element with, including that element's own opening tag " +
        'carrying the same id.',
    ),
  suggested_actions: z.array(z.string()).max(3),
})

export type GenerativeUi = z.infer<typeof generativeUiSchema>
