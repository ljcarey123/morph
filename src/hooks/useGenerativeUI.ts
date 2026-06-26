import { useRef } from 'react'
import { experimental_useObject as useObject } from '@ai-sdk/react'
import { generativeUiSchema } from '@/schemas/generativeUi'
import { useNotesStore } from '@/store/useNotesStore'
import { HtmlPatcher } from '@/services/HtmlPatcher'

export function useGenerativeUI(noteId: string) {
  const userApiKey = useNotesStore((state) => state.userApiKey)
  const addPendingTab = useNotesStore((state) => state.addPendingTab)
  const patchGeneratedTab = useNotesStore((state) => state.patchGeneratedTab)
  const tabIdRef = useRef<string | null>(null)
  const modeRef = useRef<'branch' | 'edit'>('branch')
  const previousCodeRef = useRef<string | undefined>(undefined)

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

      if (modeRef.current === 'edit' && object.target_id && object.replacement_html) {
        const patched = HtmlPatcher.applyPatch(
          previousCodeRef.current ?? '',
          object.target_id,
          object.replacement_html,
        )
        if (patched === null) {
          patchGeneratedTab(noteId, tabId, {
            explanation: `Could not find an element with id "${object.target_id}" to edit — try again or describe the change differently.`,
            status: 'error',
          })
          return
        }
        patchGeneratedTab(noteId, tabId, {
          code: patched,
          explanation: object.explanation,
          suggestedActions: object.suggested_actions,
          status: 'done',
        })
        return
      }

      if (object.code) {
        patchGeneratedTab(noteId, tabId, {
          uiType: object.ui_type,
          code: HtmlPatcher.normalize(object.code),
          explanation: object.explanation,
          suggestedActions: object.suggested_actions,
          status: 'done',
        })
        return
      }

      console.warn(
        '[useGenerativeUI] response matched neither the patch nor the full-document shape:',
        object,
      )
      patchGeneratedTab(noteId, tabId, {
        explanation: object.explanation || 'Generation failed.',
        status: 'error',
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
    modeRef.current = 'branch'
    previousCodeRef.current = previousCode
    submit({ content, direction, previousCode, mode: 'branch' })
  }

  const retry = (
    tabId: string,
    content: string,
    direction: string,
    previousCode?: string,
    mode: 'branch' | 'edit' = 'branch',
  ): void => {
    tabIdRef.current = tabId
    modeRef.current = mode
    previousCodeRef.current = previousCode
    patchGeneratedTab(noteId, tabId, { status: 'streaming', explanation: '' })
    submit({ content, direction, previousCode, mode })
  }

  const editTab = (
    tabId: string,
    content: string,
    direction: string,
    previousCode?: string,
  ): void => {
    tabIdRef.current = tabId
    modeRef.current = 'edit'
    previousCodeRef.current = previousCode
    patchGeneratedTab(noteId, tabId, { direction, previousCode, mode: 'edit', status: 'streaming' })
    submit({ content, direction, previousCode, mode: 'edit' })
  }

  return { partialUI, generate, retry, editTab, isLoading, error }
}
