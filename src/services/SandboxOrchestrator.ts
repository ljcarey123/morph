import { HtmlSanitizer } from './HtmlSanitizer'
import { SANDBOX_RUNTIME_SCRIPT } from '@/sandbox-runtime/runtimeScript'

export const SandboxOrchestrator = {
  compileHtmlTemplate(rawHtml: string | undefined, uiType: string): string {
    const safeHtml = HtmlSanitizer.sanitize(rawHtml ?? '')
    console.debug('[SandboxOrchestrator] compileHtmlTemplate', {
      uiType,
      rawHtmlLength: rawHtml?.length ?? 0,
      safeHtmlLength: safeHtml.length,
    })
    const body =
      uiType === 'svg_diagram'
        ? `<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">${safeHtml}</div>`
        : safeHtml

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      :root { color-scheme: light; }
      body { margin: 0; min-height: 100vh; background: #ffffff; color: #111827; font-family: system-ui, -apple-system, sans-serif; }
    </style>
  </head>
  <body>${body}<script>${SANDBOX_RUNTIME_SCRIPT}</script></body>
</html>`
  },
}
