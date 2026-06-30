import { describe, expect, it } from 'vitest'
import { SandboxOrchestrator } from './SandboxOrchestrator'

describe('SandboxOrchestrator.compileHtmlTemplate', () => {
  it('embeds raw html as-is for html_snippet', () => {
    const html = SandboxOrchestrator.compileHtmlTemplate('<p>hi</p>', 'html_snippet')

    expect(html).toContain('<body><p>hi</p><script>')
  })

  it('wraps svg_diagram content in a centering container', () => {
    const html = SandboxOrchestrator.compileHtmlTemplate('<svg></svg>', 'svg_diagram')

    expect(html).toContain('justify-content:center')
    expect(html).toContain('<svg></svg>')
  })

  it('falls back to an empty body plus the runtime script when rawHtml is undefined', () => {
    const html = SandboxOrchestrator.compileHtmlTemplate(undefined, 'html_snippet')

    expect(html).toContain('<body><script>')
  })

  it('always includes the trusted sandbox component runtime', () => {
    const html = SandboxOrchestrator.compileHtmlTemplate('<div></div>', 'html_snippet')

    expect(html).toContain('customElements.define')
    expect(html).toContain('morph-toggle')
  })

  it('strips a script tag the model tried to inject', () => {
    const html = SandboxOrchestrator.compileHtmlTemplate(
      '<script>alert(1)</script><p>hi</p>',
      'html_snippet',
    )

    expect(html).not.toContain('alert(1)')
    expect(html).toContain('<p>hi</p>')
  })
})
