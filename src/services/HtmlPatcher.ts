import { HtmlSanitizer } from './HtmlSanitizer'

export const HtmlPatcher = {
  normalize(code: string): string {
    console.debug('[HtmlPatcher] normalize', { codeLength: code.length })
    const body = new DOMParser().parseFromString(code, 'text/html').body.innerHTML
    return HtmlSanitizer.sanitize(body)
  },

  applyPatch(code: string, targetId: string, replacementHtml: string): string | null {
    const doc = new DOMParser().parseFromString(code, 'text/html')
    const matches = doc.querySelectorAll(`[id="${targetId}"]`)
    if (matches.length > 1) {
      console.warn('[HtmlPatcher] duplicate id in document — patching the first match only', {
        targetId,
        matchCount: matches.length,
      })
    }

    const target = doc.getElementById(targetId)
    console.debug('[HtmlPatcher] applyPatch', {
      targetId,
      targetFound: Boolean(target),
      replacementHtmlLength: replacementHtml.length,
    })
    if (!target) return null

    const container = doc.createElement('div')
    container.innerHTML = replacementHtml
    target.replaceWith(...container.childNodes)

    return HtmlSanitizer.sanitize(doc.body.innerHTML)
  },
}
