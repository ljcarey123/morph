import { z } from 'zod'

export const suggestOptionsSchema = z.object({
  options: z
    .array(
      z.object({
        label: z.string().describe('Short 2-4 word chip title (e.g. "Legion Map").'),
        description: z
          .string()
          .describe(
            'A vivid 1-2 sentence generation prompt starting with an action verb, ' +
              'referencing specific content from the note. This is what the user sends ' +
              'to the generator when they click the chip — make it detailed and specific.',
          ),
        mode: z
          .enum(['canvas', 'dashboard'])
          .describe(
            '"canvas" for free-form visual layouts: maps, diagrams, charts, timelines, ' +
              'SVG graphics, network graphs, infographics, anything primarily visual. ' +
              '"dashboard" for structured data-exploration: a card grid of entities with ' +
              'stats, a tabbed multi-section view, or a control panel with counters/toggles ' +
              'the user will operate.',
          ),
      }),
    )
    .length(3),
})

export type SuggestOptions = z.infer<typeof suggestOptionsSchema>
