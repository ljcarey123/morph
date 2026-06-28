import { z } from 'zod'

export const classifyIntentSchema = z.object({
  action: z
    .enum(['create', 'edit'])
    .describe(
      'Whether the message describes creating a brand-new artifact from scratch, or making a ' +
        'small edit/tweak to one that already exists.',
    ),
})

export type ClassifyIntent = z.infer<typeof classifyIntentSchema>
