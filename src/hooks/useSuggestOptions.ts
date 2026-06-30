import { useCallback, useState } from 'react'
import { useNotesStore } from '@/store/useNotesStore'
import type { SuggestOptions } from '@/schemas/suggestOptions'

export function useSuggestOptions() {
  const userApiKey = useNotesStore((state) => state.userApiKey)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | undefined>(undefined)

  const fetchOptions = useCallback(
    async (content: string): Promise<SuggestOptions['options'] | undefined> => {
      setIsLoading(true)
      setError(undefined)
      console.debug('[useSuggestOptions] fetchOptions', { contentLength: content.length })
      try {
        const response = await fetch('/api/suggest-options', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-api-key': userApiKey ?? '',
          },
          body: JSON.stringify({ content }),
        })
        if (!response.ok) {
          throw new Error(await response.text())
        }
        const data = (await response.json()) as SuggestOptions
        console.debug('[useSuggestOptions] received', { optionCount: data.options.length })
        return data.options
      } catch (caught) {
        const err = caught instanceof Error ? caught : new Error('Failed to fetch suggestions')
        console.debug('[useSuggestOptions] error', { message: err.message })
        setError(err)
        return undefined
      } finally {
        setIsLoading(false)
      }
    },
    [userApiKey],
  )

  return { fetchOptions, isLoading, error }
}
