import { useCallback, useState } from 'react'
import { useNotesStore } from '@/store/useNotesStore'
import type { ClassifyIntent } from '@/schemas/classifyIntent'

export function useClassifyIntent() {
  const userApiKey = useNotesStore((state) => state.userApiKey)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | undefined>(undefined)

  const fetchAction = useCallback(
    async (
      message: string,
      currentArtifact: string,
    ): Promise<ClassifyIntent['action'] | undefined> => {
      setIsLoading(true)
      setError(undefined)
      try {
        const response = await fetch('/api/classify-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-api-key': userApiKey ?? '',
          },
          body: JSON.stringify({ message, currentArtifact }),
        })
        if (!response.ok) {
          throw new Error(await response.text())
        }
        const data = (await response.json()) as ClassifyIntent
        return data.action
      } catch (caught) {
        setError(caught instanceof Error ? caught : new Error('Failed to classify intent'))
        return undefined
      } finally {
        setIsLoading(false)
      }
    },
    [userApiKey],
  )

  return { fetchAction, isLoading, error }
}
