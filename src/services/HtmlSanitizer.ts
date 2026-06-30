import { COMPONENT_REGISTRY } from '@/sandbox-runtime/registry'

const DISALLOWED_TAGS = new Set(['script', 'iframe', 'object', 'embed', 'link'])
const ALWAYS_ALLOWED_ATTRIBUTE = /^(id|class|style|data-.+)$/

const allowedAttributesByTag = new Map<string, Set<string>>(
  COMPONENT_REGISTRY.map((component) => [
    component.tag,
    new Set(component.attributes.map((attribute) => attribute.name)),
  ]),
)

export const HtmlSanitizer = {
  sanitize(html: string): string {
    const template = document.createElement('template')
    template.innerHTML = html
    sanitizeChildren(template.content)
    debugValidateComponentWiring(template.content)
    return template.innerHTML
  },
}

function sanitizeChildren(root: ParentNode): void {
  let strippedCount = 0
  const unwrappedTags: string[] = []

  for (const element of Array.from(root.querySelectorAll('*'))) {
    const tag = element.tagName.toLowerCase()

    if (DISALLOWED_TAGS.has(tag)) {
      element.remove()
      strippedCount += 1
      continue
    }

    if (tag === 'style') {
      element.textContent = element.textContent.replace(/@import[^;]*;/gi, '')
    }

    stripDangerousAttributes(element)

    if (tag.includes('-')) {
      const allowedAttributes = allowedAttributesByTag.get(tag)
      if (!allowedAttributes) {
        element.replaceWith(...element.childNodes)
        unwrappedTags.push(tag)
        continue
      }
      restrictAttributes(element, allowedAttributes)
    }
  }

  if (strippedCount > 0 || unwrappedTags.length > 0) {
    console.debug('[HtmlSanitizer] sanitizeChildren', { strippedCount, unwrappedTags })
  }
}

// Defense-in-depth catches malicious/forged markup, but it can't catch a
// truncated generation that still parses cleanly (the browser's HTML parser
// auto-closes dangling tags, so a cut-off document looks well-formed). This
// checks the one thing that actually reveals that: every morph-tabs/
// morph-accordion trigger must have a matching panel within the same
// component, since a mismatch here means part of the document never made
// it into the response.
function debugValidateComponentWiring(root: ParentNode): void {
  for (const tabs of Array.from(root.querySelectorAll('morph-tabs'))) {
    const triggerNames = Array.from(tabs.querySelectorAll('[data-tab-trigger]')).map((element) =>
      element.getAttribute('data-tab-trigger'),
    )
    const panelNames = new Set(
      Array.from(tabs.querySelectorAll('[data-tab-panel]')).map((element) =>
        element.getAttribute('data-tab-panel'),
      ),
    )
    const missingPanels = triggerNames.filter((name) => !panelNames.has(name))
    if (missingPanels.length > 0) {
      console.warn('[HtmlSanitizer] morph-tabs trigger(s) with no matching panel', {
        id: tabs.id,
        triggerNames,
        panelNames: Array.from(panelNames),
        missingPanels,
      })
    }
  }

  for (const accordion of Array.from(root.querySelectorAll('morph-accordion'))) {
    for (const item of Array.from(accordion.querySelectorAll('[data-accordion-item]'))) {
      const hasTrigger = item.querySelector('[data-accordion-trigger]') !== null
      const hasPanel = item.querySelector('[data-accordion-panel]') !== null
      if (!hasTrigger || !hasPanel) {
        console.warn('[HtmlSanitizer] morph-accordion item missing trigger or panel', {
          accordionId: accordion.id,
          hasTrigger,
          hasPanel,
        })
      }
    }
  }
}

function stripDangerousAttributes(element: Element): void {
  for (const attribute of Array.from(element.attributes)) {
    const name = attribute.name.toLowerCase()
    if (name.startsWith('on')) {
      element.removeAttribute(attribute.name)
      continue
    }
    if ((name === 'href' || name === 'src') && /^\s*javascript:/i.test(attribute.value)) {
      element.removeAttribute(attribute.name)
    }
  }
}

function restrictAttributes(element: Element, allowedAttributes: ReadonlySet<string>): void {
  for (const attribute of Array.from(element.attributes)) {
    const name = attribute.name.toLowerCase()
    if (allowedAttributes.has(name) || ALWAYS_ALLOWED_ATTRIBUTE.test(name)) continue
    element.removeAttribute(attribute.name)
  }
}
