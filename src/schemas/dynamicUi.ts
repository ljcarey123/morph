import { z } from 'zod'

const themeSchema = z.object({
  background: z.string().describe('CSS color for the full-page background'),
  surface: z.string().describe('CSS color for card and panel backgrounds'),
  border: z.string().describe('CSS color for borders and dividers'),
  accent: z.string().describe('CSS color for headings, highlights, and active elements'),
  text: z.string().describe('CSS color for primary body text'),
  muted: z.string().describe('CSS color for secondary labels and captions'),
})

const statSchema = z.object({
  label: z.string(),
  value: z.string(),
})

const counterControlSchema = z.object({
  type: z.literal('counter'),
  id: z.string(),
  label: z.string(),
  stateKey: z.string().optional().describe('Kebab-case key — set only if value should persist across reloads'),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  initial: z.number().optional(),
  unit: z.string().optional().describe('Short unit label shown next to the value, e.g. "soldiers"'),
})

const toggleControlSchema = z.object({
  type: z.literal('toggle'),
  id: z.string(),
  label: z.string(),
  stateKey: z.string().optional().describe('Kebab-case key — set only if state should persist across reloads'),
  offLabel: z.string().optional(),
  onLabel: z.string().optional(),
  initial: z.boolean().optional(),
})

export const controlSchema = z.discriminatedUnion('type', [counterControlSchema, toggleControlSchema])

export const cardSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  tooltipText: z.string().optional().describe('Shown on hover over the card title'),
  stats: z.array(statSchema).optional(),
  body: z.string().optional().describe('Short plain-text paragraph shown below stats'),
  controls: z.array(controlSchema).optional(),
})

export const tabSchema = z.object({
  id: z.string(),
  label: z.string(),
  cards: z.array(cardSchema).optional(),
  body: z.string().optional().describe('Plain text shown when there are no cards for this tab'),
})

export const accordionItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  open: z.boolean().optional().describe('Whether this item starts expanded'),
})

// Field order matters: Gemini fills fields in declaration order.
// Content (tabs/cards/accordion) must come before optional prose fields
// so the model writes the substantive structure before any captions.
export const dynamicUiConfigSchema = z.object({
  layout: z
    .enum(['tabbed', 'cards', 'accordion'])
    .describe(
      '"tabbed" for content with distinct sections worth switching between, ' +
        '"cards" for a flat grid of peer entities, ' +
        '"accordion" for reference content that expands on demand',
    ),
  theme: themeSchema,
  tabs: z.array(tabSchema).optional().describe('Provide when layout is "tabbed" — one entry per tab'),
  cards: z.array(cardSchema).optional().describe('Provide when layout is "cards"'),
  accordion: z.array(accordionItemSchema).optional().describe('Provide when layout is "accordion"'),
  allowMultiple: z.boolean().optional().describe('Accordion only: allow more than one section open at once'),
  suggested_actions: z
    .array(z.string())
    .describe('1–3 short follow-up prompts the user might want to try next'),
  title: z.string().max(60).optional().describe('Optional short heading (≤8 words) shown at the top'),
})

export type DynamicUiConfig = z.infer<typeof dynamicUiConfigSchema>
export type Theme = z.infer<typeof themeSchema>
export type CardSpec = z.infer<typeof cardSchema>
export type TabSpec = z.infer<typeof tabSchema>
export type AccordionItem = z.infer<typeof accordionItemSchema>
export type ControlSpec = z.infer<typeof controlSchema>
export type CounterControl = z.infer<typeof counterControlSchema>
export type ToggleControl = z.infer<typeof toggleControlSchema>
