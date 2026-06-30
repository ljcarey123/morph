import { z } from 'zod'

export const sandboxBridgeMessageSchema = z.union([
  z.object({
    type: z.literal('morph:request-state'),
    key: z.string(),
    requestId: z.string(),
  }),
  z.object({
    type: z.literal('morph:report-state'),
    key: z.string(),
    value: z.union([z.string(), z.number(), z.boolean()]),
  }),
])

export type SandboxBridgeMessage = z.infer<typeof sandboxBridgeMessageSchema>
