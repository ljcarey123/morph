import { describe, expect, it } from 'vitest'
import { HtmlSanitizer } from './HtmlSanitizer'

describe('HtmlSanitizer.sanitize', () => {
  it('leaves plain, well-formed markup unchanged', () => {
    const html = '<div id="a"><p>hello</p></div>'

    expect(HtmlSanitizer.sanitize(html)).toBe(html)
  })

  it('strips script tags entirely, including their content', () => {
    const html = '<p>hi</p><script>alert(1)</script>'

    const result = HtmlSanitizer.sanitize(html)

    expect(result).toContain('<p>hi</p>')
    expect(result).not.toContain('script')
    expect(result).not.toContain('alert')
  })

  it('strips on* event handler attributes from ordinary elements', () => {
    const html = '<button onclick="doEvil()">Click</button>'

    const result = HtmlSanitizer.sanitize(html)

    expect(result).not.toContain('onclick')
    expect(result).toContain('Click')
  })

  it('strips javascript: URLs from href/src', () => {
    const html = '<a href="javascript:doEvil()">link</a>'

    const result = HtmlSanitizer.sanitize(html)

    expect(result).not.toContain('javascript:')
  })

  it('removes iframe, object, embed, and link tags', () => {
    const html =
      '<iframe src="https://evil.example"></iframe>' +
      '<object data="x"></object>' +
      '<embed src="y">' +
      '<link rel="stylesheet" href="z">' +
      '<p>kept</p>'

    const result = HtmlSanitizer.sanitize(html)

    expect(result).not.toContain('iframe')
    expect(result).not.toContain('object')
    expect(result).not.toContain('embed')
    expect(result).not.toContain('link')
    expect(result).toContain('<p>kept</p>')
  })

  it('keeps a recognized morph-* component and its declared/data-* attributes', () => {
    const html = '<morph-toggle id="t" data-state-key="dark-mode" checked></morph-toggle>'

    const result = HtmlSanitizer.sanitize(html)

    expect(result).toContain('<morph-toggle id="t" data-state-key="dark-mode" checked="">')
  })

  it('strips undeclared attributes from a recognized morph-* component', () => {
    const html = '<morph-toggle id="t" onclick="doEvil()" foo="bar"></morph-toggle>'

    const result = HtmlSanitizer.sanitize(html)

    expect(result).not.toContain('onclick')
    expect(result).not.toContain('foo')
    expect(result).toContain('id="t"')
  })

  it('unwraps an unrecognized custom element while keeping its children', () => {
    const html = '<morph-not-real><p>kept</p></morph-not-real>'

    const result = HtmlSanitizer.sanitize(html)

    expect(result).not.toContain('morph-not-real')
    expect(result).toContain('<p>kept</p>')
  })

  it('strips @import rules from inline style tags but keeps the rest', () => {
    const html = '<style>@import url("https://evil.example/x.css"); p { color: red; }</style>'

    const result = HtmlSanitizer.sanitize(html)

    expect(result).not.toContain('@import')
    expect(result).toContain('color: red')
  })
})
