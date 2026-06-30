import { z } from 'zod'

export const classifyIntentSchema = z.object({
  action: z
    .enum(['create', 'edit'])
    .describe(
      'Whether the message describes creating a brand-new artifact from scratch, or making a ' +
        'small edit/tweak to one that already exists.',
    ),
  mode: z
    .enum(['static', 'dynamic'])
    .describe(
      '"dynamic" when the request calls for interactive controls (tabs to switch between, ' +
        'counters to increment, toggles to flip, accordion sections to expand) — these are ' +
        'rendered by a fixed component library and must be configured via JSON, not free HTML. ' +
        '"static" for everything else: charts, diagrams, timelines, prose layouts, data tables, ' +
        'SVG diagrams. When in doubt, prefer "static".',
    ),
})

export type ClassifyIntent = z.infer<typeof classifyIntentSchema>
