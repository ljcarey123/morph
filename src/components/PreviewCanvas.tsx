import { SandboxOrchestrator } from '@/services/SandboxOrchestrator'

interface PreviewCanvasProps {
  code: string | undefined
  uiType: string | undefined
}

export function PreviewCanvas({ code, uiType }: PreviewCanvasProps) {
  return (
    <iframe
      title="Generated UI preview"
      srcDoc={SandboxOrchestrator.compileHtmlTemplate(code, uiType ?? 'html_snippet')}
      sandbox="allow-popups"
      className="h-full w-full border-none transition-all duration-300"
    />
  )
}
