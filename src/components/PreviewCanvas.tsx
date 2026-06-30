import { useEffect, useRef } from 'react'
import { SandboxOrchestrator } from '@/services/SandboxOrchestrator'
import { sandboxBridgeMessageSchema } from '@/schemas/sandboxBridge'
import { useNotesStore } from '@/store/useNotesStore'

interface PreviewCanvasProps {
  noteId: string
  tabId: string | undefined
  code: string | undefined
  uiType: string | undefined
}

export function PreviewCanvas({ noteId, tabId, code, uiType }: PreviewCanvasProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const patchComponentState = useNotesStore((state) => state.patchComponentState)

  console.debug('[PreviewCanvas] render', { noteId, tabId, codeLength: code?.length ?? 0, uiType })

  useEffect(() => {
    const handleMessage = (event: MessageEvent): void => {
      if (!tabId || event.source !== iframeRef.current?.contentWindow) return

      const parsed = sandboxBridgeMessageSchema.safeParse(event.data)
      if (!parsed.success) return

      console.debug('[PreviewCanvas] bridge message', parsed.data)

      if (parsed.data.type === 'morph:report-state') {
        patchComponentState(noteId, tabId, parsed.data.key, parsed.data.value)
        return
      }

      const value = useNotesStore
        .getState()
        .notes[noteId]?.tabs.find((tab) => tab.id === tabId)?.componentState?.[parsed.data.key]
      iframeRef.current.contentWindow?.postMessage(
        { type: 'morph:state-response', requestId: parsed.data.requestId, value },
        '*',
      )
    }

    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [noteId, tabId, patchComponentState])

  return (
    <iframe
      ref={iframeRef}
      title="Generated UI preview"
      srcDoc={SandboxOrchestrator.compileHtmlTemplate(code, uiType ?? 'html_snippet')}
      sandbox="allow-popups allow-scripts"
      className="h-full w-full border-none transition-all duration-300"
    />
  )
}
