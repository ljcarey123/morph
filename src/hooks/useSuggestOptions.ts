import { useCallback, useState } from 'react'
import { useNotesStore } from '@/store/useNotesStore'
import type { SuggestOptions } from '@/schemas/suggestOptions'

export function useSuggestOptions() {
  const userApiKey = useNotesStore((state) => state.userApiKey)
  const [options, setOptions] = useState<SuggestOptions['options']>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | undefined>(undefined)

  const fetchOptions = useCallback(
    async (content: string): Promise<void> => {
      setIsLoading(true)
      setError(undefined)
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
        setOptions(data.options)
      } catch (caught) {
        setError(caught instanceof Error ? caught : new Error('Failed to fetch suggestions'))
      } finally {
        setIsLoading(false)
      }
    },
    [userApiKey],
  )

  return { options, fetchOptions, isLoading, error }
}
