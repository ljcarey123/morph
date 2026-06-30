import { useRef } from 'react'
import { experimental_useObject as useObject } from '@ai-sdk/react'
import { generativeUiSchema } from '@/schemas/generativeUi'
import { useNotesStore } from '@/store/useNotesStore'
import { HtmlPatcher } from '@/services/HtmlPatcher'
import type { GeneratedUITab } from '@/types/note'

export function useGenerativeUI(noteId: string) {
  const userApiKey = useNotesStore((state) => state.userApiKey)
  const addPendingTab = useNotesStore((state) => state.addPendingTab)
  const patchGeneratedTab = useNotesStore((state) => state.patchGeneratedTab)
  const removeTab = useNotesStore((state) => state.removeTab)
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
    onFinish: ({ object, error: finishError }) => {
      const tabId = tabIdRef.current
      console.debug('[useGenerativeUI] onFinish', {
        tabId,
        mode: modeRef.current,
        hasObject: Boolean(object),
        codeLength: object?.code?.length ?? 0,
        targetId: object?.target_id,
        replacementHtmlLength: object?.replacement_html?.length ?? 0,
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

      if (modeRef.current === 'edit' && object.target_id && object.replacement_html) {
        const patched = HtmlPatcher.applyPatch(
          previousCodeRef.current ?? '',
          object.target_id,
          object.replacement_html,
        )
        if (patched === null) {
          console.debug('[useGenerativeUI] patch target not found', {
            tabId,
            targetId: object.target_id,
          })
          patchGeneratedTab(noteId, tabId, {
            error: `Could not find an element with id "${object.target_id}" to edit — try again or describe the change differently.`,
            status: 'error',
          })
          return
        }
        patchGeneratedTab(noteId, tabId, {
          code: patched,
          explanation: object.explanation,
          suggestedActions: object.suggested_actions,
          status: 'done',
          error: undefined,
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
          error: undefined,
        })
        return
      }

      console.warn(
        '[useGenerativeUI] response matched neither the patch nor the full-document shape:',
        object,
      )
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

  const generate = (content: string, direction: string, previousCode?: string): void => {
    tabIdRef.current = addPendingTab(noteId, direction, previousCode)
    modeRef.current = 'branch'
    previousCodeRef.current = previousCode
    console.debug('[useGenerativeUI] generate', {
      tabId: tabIdRef.current,
      direction,
      hasPreviousCode: Boolean(previousCode),
    })
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
    console.debug('[useGenerativeUI] retry', { tabId, mode, direction })
    patchGeneratedTab(noteId, tabId, { status: 'streaming', error: undefined })
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
    console.debug('[useGenerativeUI] editTab', { tabId, direction })
    patchGeneratedTab(noteId, tabId, {
      direction,
      previousCode,
      mode: 'edit',
      status: 'streaming',
      error: undefined,
    })
    submit({ content, direction, previousCode, mode: 'edit' })
  }

  const cancelError = (tab: GeneratedUITab): void => {
    if (tab.code) {
      patchGeneratedTab(noteId, tab.id, { status: 'done', error: undefined })
    } else {
      removeTab(noteId, tab.id)
    }
  }

  return { partialUI, generate, retry, editTab, cancelError, isLoading, error }
}
