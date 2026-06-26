export const HtmlPatcher = {
  normalize(code: string): string {
    return new DOMParser().parseFromString(code, 'text/html').body.innerHTML
  },

  applyPatch(code: string, targetId: string, replacementHtml: string): string | null {
    const doc = new DOMParser().parseFromString(code, 'text/html')
    const target = doc.getElementById(targetId)
    if (!target) return null

    const container = doc.createElement('div')
    container.innerHTML = replacementHtml
    target.replaceWith(...container.childNodes)

    return doc.body.innerHTML
  },
}
