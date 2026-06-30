export interface ComponentAttribute {
  name: string
  type: 'string' | 'number' | 'boolean'
  description: string
}

export interface ComponentDefinition {
  tag: string
  description: string
  attributes: ComponentAttribute[]
  example: string
}

export const COMPONENT_REGISTRY: readonly ComponentDefinition[] = [
  {
    tag: 'morph-tabs',
    description:
      'Switches between sibling panels. Children flagged data-tab-trigger="x" become clickable ' +
      'tab buttons; children flagged data-tab-panel="x" are shown/hidden together, matched by ' +
      'the same "x" value.',
    attributes: [
      {
        name: 'default-tab',
        type: 'string',
        description: 'The data-tab-trigger value to show first. Defaults to the first trigger.',
      },
      {
        name: 'data-state-key',
        type: 'string',
        description: 'Stable kebab-case key to remember the selected tab across edits/reloads.',
      },
    ],
    example:
      '<morph-tabs id="plan-tabs">\n' +
      '  <button data-tab-trigger="day">Day</button>\n' +
      '  <button data-tab-trigger="week">Week</button>\n' +
      '  <section data-tab-panel="day">Day content…</section>\n' +
      '  <section data-tab-panel="week">Week content…</section>\n' +
      '</morph-tabs>',
  },
  {
    tag: 'morph-accordion',
    description:
      'Expand/collapse sections. Each section is a child flagged data-accordion-item, ' +
      'containing one data-accordion-trigger and one data-accordion-panel.',
    attributes: [
      {
        name: 'allow-multiple',
        type: 'boolean',
        description: 'If present, more than one section can stay open at once.',
      },
    ],
    example:
      '<morph-accordion id="faq">\n' +
      '  <div data-accordion-item>\n' +
      '    <button data-accordion-trigger>Question one</button>\n' +
      '    <div data-accordion-panel>Answer one</div>\n' +
      '  </div>\n' +
      '</morph-accordion>',
  },
  {
    tag: 'morph-toggle',
    description: 'An on/off switch. Carries a "checked" attribute when on.',
    attributes: [
      { name: 'checked', type: 'boolean', description: 'Whether the switch starts on.' },
      {
        name: 'data-state-key',
        type: 'string',
        description: 'Stable kebab-case key to remember on/off across edits/reloads.',
      },
    ],
    example:
      '<morph-toggle id="dark-mode" data-state-key="dark-mode" ' +
      'style="display:inline-block;width:36px;height:20px;border-radius:10px;background:#374151;">' +
      '</morph-toggle>',
  },
  {
    tag: 'morph-counter',
    description:
      'Increment/decrement control. A child flagged data-counter-value displays the current ' +
      'number; children flagged data-counter-increment / data-counter-decrement are the buttons.',
    attributes: [
      { name: 'value', type: 'number', description: 'Starting value. Defaults to 0.' },
      { name: 'min', type: 'number', description: 'Minimum allowed value.' },
      { name: 'max', type: 'number', description: 'Maximum allowed value.' },
      { name: 'step', type: 'number', description: 'Amount changed per click. Defaults to 1.' },
      {
        name: 'data-state-key',
        type: 'string',
        description: 'Stable kebab-case key to remember the value across edits/reloads.',
      },
    ],
    example:
      '<morph-counter id="reps" data-state-key="reps" value="0" min="0">\n' +
      '  <button data-counter-decrement>-</button>\n' +
      '  <span data-counter-value></span>\n' +
      '  <button data-counter-increment>+</button>\n' +
      '</morph-counter>',
  },
  {
    tag: 'morph-carousel',
    description:
      'Pages through children flagged data-carousel-slide, one visible at a time. Children ' +
      'flagged data-carousel-prev / data-carousel-next page through; data-carousel-dot children ' +
      'jump to a specific slide by their position.',
    attributes: [],
    example:
      '<morph-carousel id="gallery">\n' +
      '  <div data-carousel-slide>Slide one</div>\n' +
      '  <div data-carousel-slide>Slide two</div>\n' +
      '  <button data-carousel-prev>‹</button>\n' +
      '  <button data-carousel-next>›</button>\n' +
      '</morph-carousel>',
  },
  {
    tag: 'morph-tooltip',
    description:
      'Reveals a child flagged data-tooltip-content when the child flagged data-tooltip-trigger ' +
      'is hovered or clicked.',
    attributes: [
      {
        name: 'trigger',
        type: 'string',
        description: '"hover" (default) or "click".',
      },
    ],
    example:
      '<morph-tooltip id="info">\n' +
      '  <span data-tooltip-trigger>ⓘ</span>\n' +
      '  <span data-tooltip-content>Extra detail here</span>\n' +
      '</morph-tooltip>',
  },
] as const

export const COMPONENT_TAGS: readonly string[] = COMPONENT_REGISTRY.map(
  (component) => component.tag,
)
