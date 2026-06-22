import { z } from 'zod'

export const suggestOptionsSchema = z.object({
  options: z
    .array(
      z.object({
        label: z.string().describe('Short 2-4 word name for this build direction.'),
        description: z.string().describe('One sentence on what this would build.'),
      }),
    )
    .length(3),
})

export type SuggestOptions = z.infer<typeof suggestOptionsSchema>
