import { describe, expect, it } from 'vitest'
import { HtmlPatcher } from './HtmlPatcher'

describe('HtmlPatcher.normalize', () => {
  it('leaves already well-formed markup unchanged', () => {
    const code = '<div id="a"><p>hello</p></div>'

    expect(HtmlPatcher.normalize(code)).toBe(code)
  })

  it('is idempotent, so a malformed unterminated attribute is fully resolved in one pass', () => {
    const malformedCode = '<div id="a" title="unterminated<p>after</p>'

    const normalized = HtmlPatcher.normalize(malformedCode)

    expect(HtmlPatcher.normalize(normalized)).toBe(normalized)
  })

  it('never leaves a dangling open quote that could swallow text concatenated after it', () => {
    const malformedCode = '<div id="a" title="unterminated<p>after</p>'

    const normalized = HtmlPatcher.normalize(malformedCode)
    const wrapped = `${normalized}<footer id="trailer">end</footer>`
    const reparsed = new DOMParser().parseFromString(wrapped, 'text/html')

    expect(reparsed.getElementById('trailer')?.textContent).toBe('end')
  })
})

describe('HtmlPatcher.applyPatch', () => {
  it('replaces the targeted element and leaves the rest of the document unchanged', () => {
    const code = '<div id="header"><h1>Old title</h1></div><div id="body"><p>Untouched</p></div>'

    const result = HtmlPatcher.applyPatch(
      code,
      'header',
      '<div id="header"><h1>New title</h1></div>',
    )

    expect(result).toBe(
      '<div id="header"><h1>New title</h1></div><div id="body"><p>Untouched</p></div>',
    )
  })

  it('works for an svg fragment', () => {
    const code = '<svg><circle id="dot" r="1" fill="red"></circle><rect></rect></svg>'

    const result = HtmlPatcher.applyPatch(
      code,
      'dot',
      '<circle id="dot" r="1" fill="blue"></circle>',
    )

    expect(result).toBe('<svg><circle id="dot" r="1" fill="blue"></circle><rect></rect></svg>')
  })

  it('returns null when the target id is not found', () => {
    const code = '<div id="header"></div>'

    const result = HtmlPatcher.applyPatch(code, 'missing', '<div id="missing"></div>')

    expect(result).toBeNull()
  })

  it('handles replacement html with multiple sibling root nodes', () => {
    const code = '<div id="list"><span>one</span></div>'

    const result = HtmlPatcher.applyPatch(code, 'list', '<span>a</span><span>b</span>')

    expect(result).toBe('<span>a</span><span>b</span>')
  })
})
