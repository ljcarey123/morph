import { useCallback, useEffect, useState } from 'react'
import { useNotesStore } from '@/store/useNotesStore'
import { useSuggestOptions } from '@/hooks/useSuggestOptions'
import { useClassifyIntent } from '@/hooks/useClassifyIntent'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface ArtifactComposerProps {
  noteId: string
  generate: (content: string, direction: string, previousCode?: string) => void
  editTab: (tabId: string, content: string, direction: string, previousCode?: string) => void
  isLoading: boolean
  error: Error | undefined
}

export function ArtifactComposer({
  noteId,
  generate,
  editTab,
  isLoading,
  error,
}: ArtifactComposerProps) {
  const note = useNotesStore((state) => state.notes[noteId])
  const setSuggestedOptions = useNotesStore((state) => state.setSuggestedOptions)
  const { fetchOptions, isLoading: isLoadingOptions } = useSuggestOptions()
  const { fetchAction, isLoading: isClassifying } = useClassifyIntent()
  const [message, setMessage] = useState('')

  const runFetchOptions = useCallback(
    async (content: string): Promise<void> => {
      const result = await fetchOptions(content)
      if (result) setSuggestedOptions(noteId, result)
    },
    [fetchOptions, setSuggestedOptions, noteId],
  )

  useEffect(() => {
    const current = useNotesStore.getState().notes[noteId]
    if (!current?.content) return
    if (current.suggestedOptions.length > 0) return
    void runFetchOptions(current.content)
  }, [noteId, runFetchOptions])

  if (!note) return null

  const activeTab = note.tabs.find((tab) => tab.id === note.activeTabId)
  const busy = isLoading || isClassifying

  const handleSubmit = async (): Promise<void> => {
    const text = message.trim()
    if (text.length === 0 || busy) return
    setMessage('')

    if (!activeTab) {
      generate(note.content, text)
      return
    }

    const action = await fetchAction(text, activeTab.direction)
    if (action === 'edit') {
      editTab(activeTab.id, note.content, text, activeTab.code)
    } else {
      generate(note.content, text)
    }
  }

  const hasChips = note.suggestedOptions.length > 0 || Boolean(activeTab?.suggestedActions.some(Boolean))

  return (
    <div className="group flex flex-col gap-2 border-t border-stone-800 p-3">
      {error ? <p className="text-xs text-red-400">{error.message}</p> : null}

      {hasChips ? (
        <div className="grid grid-rows-[0fr] overflow-hidden opacity-0 transition-all duration-300 ease-out group-focus-within:grid-rows-[1fr] group-focus-within:opacity-100">
          <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-500">
                {isLoadingOptions ? 'Thinking…' : 'Suggestions'}
              </span>
              <Button
                variant="icon"
                onClick={() => {
                  void runFetchOptions(note.content)
                }}
                disabled={isLoadingOptions || busy || note.content.trim().length === 0}
                aria-label="Regenerate suggestions"
                title="Regenerate suggestions"
              >
                {isLoadingOptions ? <LoadingSpinner size="sm" /> : '↻'}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {note.suggestedOptions.map((option, index) => (
                <Button
                  key={option.label}
                  variant="chip"
                  className="animate-[chip-in_220ms_ease-out_both]"
                  style={{ animationDelay: `${(index * 30).toString()}ms` }}
                  onClick={() => {
                    setMessage(option.label)
                  }}
                  disabled={busy}
                  title={option.description}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            {activeTab && activeTab.suggestedActions.filter(Boolean).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {activeTab.suggestedActions
                  .filter((action): action is string => Boolean(action))
                  .map((action, index) => (
                    <Button
                      key={action}
                      variant="chip"
                      className="animate-[chip-in_220ms_ease-out_both] px-2 py-1 text-xs"
                      style={{ animationDelay: `${(index * 30).toString()}ms` }}
                      onClick={() => {
                        setMessage(action)
                      }}
                      disabled={busy}
                    >
                      {action}
                    </Button>
                  ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(event) => {
            setMessage(event.target.value)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void handleSubmit()
            }
          }}
          placeholder="Describe a new view, or tweak the one you're looking at…"
          disabled={busy}
          className="flex-1 rounded border border-stone-800 bg-stone-900 px-3 py-2 text-sm text-stone-100 outline-none disabled:opacity-40"
        />
        <Button
          onClick={() => {
            void handleSubmit()
          }}
          disabled={busy || message.trim().length === 0}
        >
          {busy ? <LoadingSpinner size="sm" /> : 'Send'}
        </Button>
      </div>
    </div>
  )
}
