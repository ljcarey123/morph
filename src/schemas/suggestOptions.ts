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
          .enum(['simple', 'canvas', 'dashboard'])
          .describe(
            '"simple" for plain, static visual output: reference cards, summaries, typography-' +
              'driven layouts, any content where interactivity adds no value. Fast and reliable. ' +
              '"canvas" for richer visual layouts that benefit from tab navigation or hover ' +
              'tooltips: maps, diagrams, timelines, infographics with sections to explore. ' +
              '"dashboard" for structured data-exploration: a card grid of entities with stats, ' +
              'counters and on/off toggles the user will actively operate.',
          ),
      }),
    )
    .length(3),
})

export type SuggestOptions = z.infer<typeof suggestOptionsSchema>
