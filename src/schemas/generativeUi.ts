import { z } from 'zod'

export const generativeUiSchema = z.object({
  explanation: z.string().describe('Architectural analysis or workflow overview of the canvas.'),
  ui_type: z.enum(['html_snippet', 'svg_diagram']),
  code: z.string().describe('Clean HTML or raw SVG structural data. No markdown wrap strings.'),
  suggested_actions: z.array(z.string()).max(3),
})

export type GenerativeUi = z.infer<typeof generativeUiSchema>
