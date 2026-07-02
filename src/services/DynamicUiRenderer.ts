import type {
  DynamicUiConfig,
  Theme,
  CardSpec,
  TabSpec,
  AccordionItem,
  ControlSpec,
} from '@/schemas/dynamicUi'

// Converts a style object to an inline style string
function s(styles: Record<string, string | number | undefined>): string {
  return Object.entries(styles)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}:${String(v)}`)
    .join(';')
}

function counterBtnStyle(theme: Theme): string {
  return s({
    display: 'inline-flex',
    'align-items': 'center',
    'justify-content': 'center',
    width: '26px',
    height: '26px',
    'border-radius': '50%',
    border: `1px solid ${theme.border}`,
    background: 'transparent',
    color: theme.accent,
    cursor: 'pointer',
    'font-size': '1.1rem',
    'line-height': '1',
    'flex-shrink': '0',
  })
}

function labelStyle(theme: Theme): string {
  return s({
    'font-size': '0.7rem',
    color: theme.muted,
    'text-transform': 'uppercase',
    'letter-spacing': '0.08em',
  })
}

function renderCounter(spec: ControlSpec, theme: Theme): string {
  const attrs = [
    `id="${spec.id}"`,
    spec.stateKey ? `data-state-key="${spec.stateKey}"` : '',
    `value="${String(spec.initial ?? 0)}"`,
    spec.min !== undefined ? `min="${String(spec.min)}"` : '',
    spec.max !== undefined ? `max="${String(spec.max)}"` : '',
    spec.step !== undefined ? `step="${String(spec.step)}"` : '',
  ]
    .filter(Boolean)
    .join(' ')

  const labelText = spec.unit ? `${spec.label} · ${spec.unit}` : spec.label

  return `<morph-counter ${attrs} style="${s({ display: 'block', 'margin-top': '10px' })}">
  <div style="${s({ display: 'flex', 'align-items': 'center', 'justify-content': 'space-between', gap: '8px' })}">
    <span style="${labelStyle(theme)}">${labelText}</span>
    <div style="${s({ display: 'flex', 'align-items': 'center', gap: '8px' })}">
      <button data-counter-decrement style="${counterBtnStyle(theme)}">−</button>
      <span data-counter-value style="${s({ 'min-width': '52px', 'text-align': 'center', color: theme.text, 'font-size': '0.9rem' })}">${String(spec.initial ?? 0)}</span>
      <button data-counter-increment style="${counterBtnStyle(theme)}">+</button>
    </div>
  </div>
</morph-counter>`
}

function renderToggle(spec: ControlSpec, theme: Theme): string {
  const initial = spec.initialOn ?? false
  const attrs = [
    `id="${spec.id}"`,
    spec.stateKey ? `data-state-key="${spec.stateKey}"` : '',
    initial ? 'checked' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const dotLeft = initial ? '19px' : '3px'

  return `<morph-toggle ${attrs} style="${s({ display: 'block', 'margin-top': '10px', cursor: 'pointer' })}">
  <div style="${s({ display: 'flex', 'align-items': 'center', 'justify-content': 'space-between', gap: '8px' })}">
    <span style="${labelStyle(theme)}">${spec.label}</span>
    <div style="${s({ display: 'flex', 'align-items': 'center', gap: '6px' })}">
      ${spec.offLabel ? `<span style="${s({ 'font-size': '0.7rem', color: theme.muted })}">${spec.offLabel}</span>` : ''}
      <div style="${s({ position: 'relative', width: '36px', height: '20px', 'border-radius': '10px', background: theme.border, 'flex-shrink': '0' })}">
        <div style="${s({ position: 'absolute', top: '3px', left: dotLeft, width: '14px', height: '14px', 'border-radius': '50%', background: theme.accent, transition: 'left 0.15s' })}"></div>
      </div>
      ${spec.onLabel ? `<span style="${s({ 'font-size': '0.7rem', color: theme.muted })}">${spec.onLabel}</span>` : ''}
    </div>
  </div>
</morph-toggle>`
}

function renderControl(spec: ControlSpec, theme: Theme): string {
  if (spec.type === 'counter') return renderCounter(spec, theme)
  return renderToggle(spec, theme)
}

function renderCard(card: CardSpec, theme: Theme): string {
  const titleInner = card.tooltipText
    ? `<morph-tooltip id="${card.id}-tooltip" trigger="hover" style="${s({ position: 'relative', display: 'inline' })}">
    <span data-tooltip-trigger style="${s({ 'border-bottom': `1px dotted ${theme.accent}`, cursor: 'help' })}">${card.title}</span>
    <div data-tooltip-content style="${s({ position: 'absolute', 'z-index': '10', background: theme.surface, border: `1px solid ${theme.border}`, 'border-radius': '4px', padding: '8px 10px', 'font-size': '0.75rem', color: theme.text, 'max-width': '240px', 'box-shadow': '0 4px 16px rgba(0,0,0,0.5)', top: '100%', left: '0', 'margin-top': '4px' })}">${card.tooltipText}</div>
  </morph-tooltip>`
    : card.title

  const subtitle = card.subtitle
    ? `<p style="${s({ margin: '4px 0 0', 'font-size': '0.75rem', color: theme.muted })}">${card.subtitle}</p>`
    : ''

  const stats =
    card.stats?.length
      ? `<div style="${s({ display: 'flex', 'flex-wrap': 'wrap', gap: '6px 16px', 'margin-top': '10px' })}">
    ${card.stats
      .map(
        (stat) =>
          `<span style="${s({ 'font-size': '0.72rem' })}">` +
          `<span style="${s({ color: theme.muted })}">${stat.label}:</span>` +
          `<span style="${s({ color: theme.text, 'margin-left': '4px' })}">${stat.value}</span>` +
          `</span>`,
      )
      .join('\n    ')}
  </div>`
      : ''

  const body = card.body
    ? `<p style="${s({ margin: '10px 0 0', 'font-size': '0.8rem', color: theme.text, 'line-height': '1.55' })}">${card.body}</p>`
    : ''

  const controls =
    card.controls?.length
      ? `<div style="${s({ 'margin-top': '12px', 'border-top': `1px solid ${theme.border}`, 'padding-top': '10px' })}">
    ${card.controls.map((c) => renderControl(c, theme)).join('\n    ')}
  </div>`
      : ''

  return `<div id="${card.id}" style="${s({ background: theme.surface, border: `1px solid ${theme.border}`, 'border-radius': '6px', padding: '16px' })}">
  <h3 style="${s({ margin: '0', 'font-size': '0.95rem', color: theme.accent, 'font-weight': '600', 'line-height': '1.3' })}">${titleInner}</h3>
  ${subtitle}
  ${stats}
  ${body}
  ${controls}
</div>`
}

function renderCardGrid(cards: CardSpec[], theme: Theme): string {
  return `<div style="${s({ display: 'grid', 'grid-template-columns': 'repeat(auto-fill,minmax(260px,1fr))', gap: '16px' })}">
  ${cards.map((card) => renderCard(card, theme)).join('\n  ')}
</div>`
}

function renderTabs(tabs: TabSpec[], theme: Theme): string {
  const defaultTab = tabs[0]?.id ?? ''

  // All buttons start with neutral styling; the runtime's activate() immediately
  // sets opacity/fontWeight on connectedCallback so the initial active tab is
  // visually distinguished without hardcoding per-position styles.
  const triggers = tabs
    .map(
      (tab) =>
        `<button data-tab-trigger="${tab.id}" style="${s({
          padding: '8px 16px',
          cursor: 'pointer',
          'font-size': '0.78rem',
          'text-transform': 'uppercase',
          'letter-spacing': '0.1em',
          border: 'none',
          'border-bottom': `2px solid ${theme.accent}`,
          background: 'transparent',
          color: theme.accent,
          opacity: '0.5',
          'font-weight': '400',
          'white-space': 'nowrap',
        })}">${tab.label}</button>`,
    )
    .join('\n  ')

  const panels = tabs
    .map((tab) => {
      const panelBody =
        tab.cards?.length
          ? renderCardGrid(tab.cards, theme)
          : `<p style="${s({ color: theme.muted, 'font-size': '0.875rem', 'line-height': '1.6' })}">${tab.body ?? ''}</p>`
      return `<div data-tab-panel="${tab.id}" style="${s({ 'padding-top': '20px' })}">
    ${panelBody}
  </div>`
    })
    .join('\n  ')

  return `<morph-tabs id="view-tabs" default-tab="${defaultTab}" style="${s({ display: 'block' })}">
  <div style="${s({ display: 'flex', 'flex-wrap': 'wrap', 'border-bottom': `1px solid ${theme.border}`, 'margin-bottom': '4px', gap: '4px' })}">
    ${triggers}
  </div>
  ${panels}
</morph-tabs>`
}

function renderAccordion(items: AccordionItem[], theme: Theme, allowMultiple: boolean): string {
  const itemEls = items
    .map(
      (item) =>
        `<div data-accordion-item${item.open ? ' open' : ''} style="${s({ 'border-bottom': `1px solid ${theme.border}` })}">
    <button data-accordion-trigger style="${s({ display: 'flex', width: '100%', 'align-items': 'center', 'justify-content': 'space-between', padding: '12px 0', background: 'none', border: 'none', color: theme.accent, cursor: 'pointer', 'font-size': '0.875rem', 'text-align': 'left', gap: '8px' })}">
      <span>${item.title}</span>
      <span style="${s({ color: theme.muted, 'font-size': '0.7rem', 'flex-shrink': '0' })}">▾</span>
    </button>
    <div data-accordion-panel style="${s({ padding: '0 0 16px', 'font-size': '0.875rem', color: theme.text, 'line-height': '1.65' })}">
      ${item.body}
    </div>
  </div>`,
    )
    .join('\n  ')

  return `<morph-accordion id="view-accordion"${allowMultiple ? ' allow-multiple' : ''} style="${s({ display: 'block' })}">
  ${itemEls}
</morph-accordion>`
}

export const DynamicUiRenderer = {
  render(config: DynamicUiConfig): string {
    const { theme } = config

    const title = config.title
      ? `<h1 style="${s({ margin: '0 0 28px', 'font-size': '1.35rem', color: theme.accent, 'text-align': 'center', 'letter-spacing': '0.1em', 'font-weight': '700', 'text-transform': 'uppercase' })}">${config.title}</h1>`
      : ''

    let body = ''
    if (config.layout === 'tabbed' && config.tabs?.length) {
      body = renderTabs(config.tabs, theme)
    } else if (config.layout === 'cards' && config.cards?.length) {
      body = renderCardGrid(config.cards, theme)
    } else if (config.layout === 'accordion' && config.accordion?.length) {
      body = renderAccordion(config.accordion, theme, config.allowMultiple ?? false)
    }

    return `<div id="view-root" style="${s({ background: theme.background, 'min-height': '100vh', padding: '32px 24px', color: theme.text, 'font-family': 'Georgia, serif', 'box-sizing': 'border-box' })}">
  ${title}
  ${body}
</div>`
  },
}
