import { describe, expect, it } from 'vitest'
import { SandboxOrchestrator } from './SandboxOrchestrator'

describe('SandboxOrchestrator.compileHtmlTemplate', () => {
  it('embeds raw html as-is for html_snippet', () => {
    const html = SandboxOrchestrator.compileHtmlTemplate('<p>hi</p>', 'html_snippet')

    expect(html).toContain('<body><p>hi</p></body>')
  })

  it('wraps svg_diagram content in a centering container', () => {
    const html = SandboxOrchestrator.compileHtmlTemplate('<svg></svg>', 'svg_diagram')

    expect(html).toContain('justify-content:center')
    expect(html).toContain('<svg></svg>')
  })

  it('falls back to an empty body when rawHtml is undefined', () => {
    const html = SandboxOrchestrator.compileHtmlTemplate(undefined, 'html_snippet')

    expect(html).toContain('<body></body>')
  })

  it('always includes the Tailwind browser script', () => {
    const html = SandboxOrchestrator.compileHtmlTemplate('<div></div>', 'html_snippet')

    expect(html).toContain('@tailwindcss/browser')
  })
})
