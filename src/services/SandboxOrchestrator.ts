export const SandboxOrchestrator = {
  compileHtmlTemplate(rawHtml: string | undefined, uiType: string): string {
    const safeHtml = rawHtml ?? ''
    const body =
      uiType === 'svg_diagram'
        ? `<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">${safeHtml}</div>`
        : safeHtml

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    <style>
      :root { color-scheme: light; }
      body { margin: 0; min-height: 100vh; background: #ffffff; color: #111827; font-family: system-ui, -apple-system, sans-serif; }
      button, a, input, select, textarea, [onclick] { pointer-events: none; cursor: default; }
    </style>
  </head>
  <body>${body}</body>
</html>`
  },
}
