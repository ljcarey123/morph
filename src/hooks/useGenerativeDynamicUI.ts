import { useCallback, useState } from 'react'
import { useNotesStore } from '@/store/useNotesStore'
import { DynamicUiRenderer } from '@/services/DynamicUiRenderer'
import { HtmlPatcher } from '@/services/HtmlPatcher'
import type { DynamicUiConfig } from '@/schemas/dynamicUi'
import type { GeneratedUITab } from '@/types/note'

export function useGenerativeDynamicUI(noteId: string) {
  const userApiKey = useNotesStore((state) => state.userApiKey)
  const addPendingTab = useNotesStore((state) => state.addPendingTab)
  const patchGeneratedTab = useNotesStore((state) => state.patchGeneratedTab)
  const removeTab = useNotesStore((state) => state.removeTab)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | undefined>(undefined)

  const generate = useCallback(
    async (content: string, direction: string): Promise<void> => {
      const tabId = addPendingTab(noteId, direction)
      setIsLoading(true)
      setError(undefined)
      console.debug('[useGenerativeDynamicUI] generate', { tabId, direction })
      try {
        const response = await fetch('/api/generate-dynamic-ui', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-api-key': userApiKey ?? '',
          },
          body: JSON.stringify({ content, direction }),
        })
        if (!response.ok) {
          throw new Error((await response.text()) || `Request failed (${response.status.toString()})`)
        }
        const configData = (await response.json()) as DynamicUiConfig
        const rawHtml = DynamicUiRenderer.render(configData)
        const code = HtmlPatcher.normalize(rawHtml)
        patchGeneratedTab(noteId, tabId, {
          uiType: 'html_snippet',
          code,
          explanation: configData.title ?? direction,
          suggestedActions: configData.suggested_actions.slice(0, 3),
          status: 'done',
          error: undefined,
        })
        console.debug('[useGenerativeDynamicUI] done', { tabId, codeLength: code.length })
      } catch (caught) {
        const err = caught instanceof Error ? caught : new Error('Dynamic generation failed')
        console.debug('[useGenerativeDynamicUI] error', { message: err.message })
        setError(err)
        patchGeneratedTab(noteId, tabId, { error: err.message, status: 'error' })
      } finally {
        setIsLoading(false)
      }
    },
    [noteId, userApiKey, addPendingTab, patchGeneratedTab],
  )

  const cancelError = useCallback(
    (tab: GeneratedUITab): void => {
      if (tab.code) {
        patchGeneratedTab(noteId, tab.id, { status: 'done', error: undefined })
      } else {
        removeTab(noteId, tab.id)
      }
    },
    [noteId, patchGeneratedTab, removeTab],
  )

  return { generate, isLoading, error, cancelError }
}
