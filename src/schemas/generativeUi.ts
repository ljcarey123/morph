import { z } from 'zod'

// Schema given to the model as its structured-output constraint.
// (api/generate-ui.ts picks one based on request.mode). Unlike the permissive
// generativeUiSchema above — which has to accept either shape since the client
// hook parses both modes through one schema — these make the one field each
// mode actually needs non-optional, so the provider's JSON-schema-constrained
// generation can't produce a schema-valid response that's missing it.
// Field order matters: Gemini fills fields in declaration order, so the large/critical
// field goes first and the open-ended prose field goes last — a verbose "explanation"
// must never be able to starve the token budget before "code" is written.
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

