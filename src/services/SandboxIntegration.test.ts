import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import { SandboxOrchestrator } from './SandboxOrchestrator'

describe('Sandbox runtime integration (real script execution via jsdom)', () => {
  it('never executes LLM-forged scripts/handlers, while real morph-* components work', async () => {
    const llmOutput =
      '<script>window.__pwned = true;</script>' +
      '<button id="evil" onclick="window.__pwned = true">Evil</button>' +
      '<morph-tabs id="tabs">' +
      '<button data-tab-trigger="a">A</button>' +
      '<button data-tab-trigger="b">B</button>' +
      '<section data-tab-panel="a">Panel A</section>' +
      '<section data-tab-panel="b">Panel B</section>' +
      '</morph-tabs>' +
      '<morph-toggle id="toggle"></morph-toggle>'

    const html = SandboxOrchestrator.compileHtmlTemplate(llmOutput, 'html_snippet')
    const dom = new JSDOM(html, { runScripts: 'dangerously' })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect((dom.window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined()
    expect(dom.window.document.getElementById('evil')?.getAttribute('onclick')).toBeNull()

    expect(typeof dom.window.customElements.get('morph-toggle')).toBe('function')
    expect(typeof dom.window.customElements.get('morph-tabs')).toBe('function')

    const toggle = dom.window.document.getElementById('toggle')
    if (!toggle) throw new Error('toggle not found')
    expect(toggle.hasAttribute('checked')).toBe(false)
    toggle.dispatchEvent(new dom.window.Event('click', { bubbles: true }))
    expect(toggle.hasAttribute('checked')).toBe(true)

    const panelA = dom.window.document.querySelector('[data-tab-panel="a"]')
    const panelB = dom.window.document.querySelector('[data-tab-panel="b"]')
    const triggerB = dom.window.document.querySelector('[data-tab-trigger="b"]')
    if (!(panelA instanceof dom.window.HTMLElement) || !(panelB instanceof dom.window.HTMLElement)) {
      throw new Error('panels not found')
    }
    if (!triggerB) throw new Error('trigger not found')

    expect(panelA.hidden).toBe(false)
    expect(panelB.hidden).toBe(true)
    triggerB.dispatchEvent(new dom.window.Event('click', { bubbles: true }))
    expect(panelB.hidden).toBe(false)
    expect(panelA.hidden).toBe(true)

    dom.window.close()
  })
})
