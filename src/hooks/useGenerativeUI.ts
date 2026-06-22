import { useRef } from 'react'
import { experimental_useObject as useObject } from '@ai-sdk/react'
import { generativeUiSchema } from '@/schemas/generativeUi'
import { useNotesStore } from '@/store/useNotesStore'

export function useGenerativeUI(noteId: string) {
  const userApiKey = useNotesStore((state) => state.userApiKey)
  const addGeneratedTab = useNotesStore((state) => state.addGeneratedTab)
  const directionRef = useRef('')

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
      if (!object) return
      addGeneratedTab(noteId, {
        title: directionRef.current,
        uiType: object.ui_type,
        code: object.code,
        explanation: object.explanation,
        suggestedActions: object.suggested_actions,
        direction: directionRef.current,
      })
    },
  })

  const generate = (content: string, direction: string, previousCode?: string): void => {
    directionRef.current = direction
    submit({ content, direction, previousCode })
  }

  return { partialUI, generate, isLoading, error }
}
