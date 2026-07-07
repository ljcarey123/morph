import { useRef } from 'react'
import { experimental_useObject as useObject } from '@ai-sdk/react'
import { branchOutputSchema } from '@/schemas/generativeUi'
import { useNotesStore } from '@/store/useNotesStore'
import { HtmlPatcher } from '@/services/HtmlPatcher'
import type { GeneratedUITab } from '@/types/note'

export function useGenerativeUI(noteId: string) {
  const userApiKey = useNotesStore((state) => state.userApiKey)
  const addPendingTab = useNotesStore((state) => state.addPendingTab)
  const patchGeneratedTab = useNotesStore((state) => state.patchGeneratedTab)
  const removeTab = useNotesStore((state) => state.removeTab)
  const tabIdRef = useRef<string | null>(null)
  const styleRef = useRef<'simple' | 'canvas'>('canvas')

  const {
    object: partialUI,
    submit,
    isLoading,
    error,
  } = useObject({
    api: '/api/generate-ui',
    schema: branchOutputSchema,
    headers: () => ({
      'x-user-api-key': userApiKey ?? '',
    }),
    onFinish: ({ object, error: finishError }) => {
      const tabId = tabIdRef.current
      console.debug('[useGenerativeUI] onFinish', {
        tabId,
        style: styleRef.current,
        hasObject: Boolean(object),
        codeLength: object?.code?.length ?? 0,
        finishError: finishError?.message,
      })
      if (!tabId) return
      if (!object) {
        console.warn('[useGenerativeUI] final object failed schema validation', {
          tabId,
          message: finishError?.message,
        })
        patchGeneratedTab(noteId, tabId, {
          error:
            finishError?.message ??
            'The model returned a response that did not match the expected format — try again.',
          status: 'error',
        })
        return
      }

      if (object.code) {
        patchGeneratedTab(noteId, tabId, {
          uiType: object.ui_type,
          code: HtmlPatcher.normalize(object.code),
          explanation: object.explanation,
          suggestedActions: object.suggested_actions,
          generationMode: styleRef.current,
          status: 'done',
          error: undefined,
        })
        return
      }

      console.warn('[useGenerativeUI] response missing code field:', object)
      patchGeneratedTab(noteId, tabId, {
        error: 'The model returned an incomplete response — try again.',
        status: 'error',
      })
    },
    onError: (caught) => {
      const tabId = tabIdRef.current
      console.debug('[useGenerativeUI] onError', { tabId, message: caught.message })
      if (!tabId) return
      patchGeneratedTab(noteId, tabId, {
        error: caught.message || 'Generation failed.',
        status: 'error',
      })
    },
  })

  const generate = (content: string, direction: string, style: 'simple' | 'canvas' = 'canvas'): void => {
    tabIdRef.current = addPendingTab(noteId, direction)
    styleRef.current = style
    console.debug('[useGenerativeUI] generate', {
      tabId: tabIdRef.current,
      style,
      direction,
    })
    submit({ content, direction, style })
  }

  const retry = (
    tabId: string,
    content: string,
    direction: string,
    style: 'simple' | 'canvas' = 'canvas',
  ): void => {
    tabIdRef.current = tabId
    styleRef.current = style
    console.debug('[useGenerativeUI] retry', { tabId, style, direction })
    patchGeneratedTab(noteId, tabId, { status: 'streaming', error: undefined })
    submit({ content, direction, style })
  }

  const cancelError = (tab: GeneratedUITab): void => {
    if (tab.code) {
      patchGeneratedTab(noteId, tab.id, { status: 'done', error: undefined })
    } else {
      removeTab(noteId, tab.id)
    }
  }

  return { partialUI, generate, retry, cancelError, isLoading, error }
}
