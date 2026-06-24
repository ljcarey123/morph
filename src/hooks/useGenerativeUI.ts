import { useRef } from 'react'
import { experimental_useObject as useObject } from '@ai-sdk/react'
import { generativeUiSchema } from '@/schemas/generativeUi'
import { useNotesStore } from '@/store/useNotesStore'

export function useGenerativeUI(noteId: string) {
  const userApiKey = useNotesStore((state) => state.userApiKey)
  const addPendingTab = useNotesStore((state) => state.addPendingTab)
  const patchGeneratedTab = useNotesStore((state) => state.patchGeneratedTab)
  const tabIdRef = useRef<string | null>(null)

  const {
    object: partialUI,
    submit,
    isLoading,
    error,
  } = useObject({
    api: '/api/generate-ui',
    schema: generativeUiSchema,
    headers: () => ({
      'x-user-api-key': userApiKey ?? '',
    }),
    onFinish: ({ object }) => {
      const tabId = tabIdRef.current
      if (!tabId || !object) return
      patchGeneratedTab(noteId, tabId, {
        uiType: object.ui_type,
        code: object.code,
        explanation: object.explanation,
        suggestedActions: object.suggested_actions,
        status: 'done',
      })
    },
    onError: (caught) => {
      const tabId = tabIdRef.current
      if (!tabId) return
      patchGeneratedTab(noteId, tabId, {
        explanation: caught.message || 'Generation failed.',
        status: 'error',
      })
    },
  })

  const generate = (content: string, direction: string, previousCode?: string): void => {
    tabIdRef.current = addPendingTab(noteId, direction, previousCode)
    submit({ content, direction, previousCode })
  }

  const retry = (
    tabId: string,
    content: string,
    direction: string,
    previousCode?: string,
  ): void => {
    tabIdRef.current = tabId
    patchGeneratedTab(noteId, tabId, { status: 'streaming', explanation: '' })
    submit({ content, direction, previousCode })
  }

  return { partialUI, generate, retry, isLoading, error }
}
