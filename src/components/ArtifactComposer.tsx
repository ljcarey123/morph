import { useCallback, useEffect, useState } from 'react'
import { useNotesStore } from '@/store/useNotesStore'
import { useSuggestOptions } from '@/hooks/useSuggestOptions'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

type GenerationMode = 'canvas' | 'dashboard'

interface ArtifactComposerProps {
  noteId: string
  generate: (content: string, direction: string, previousCode?: string) => void
  generateDynamic: (content: string, direction: string) => Promise<void>
  isLoading: boolean
  error: Error | undefined
}

export function ArtifactComposer({
  noteId,
  generate,
  generateDynamic,
  isLoading,
  error,
}: ArtifactComposerProps) {
  const note = useNotesStore((state) => state.notes[noteId])
  const setSuggestedOptions = useNotesStore((state) => state.setSuggestedOptions)
  const { fetchOptions, isLoading: isLoadingOptions } = useSuggestOptions()
  const [message, setMessage] = useState('')
  const [mode, setMode] = useState<GenerationMode>('canvas')

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

  const busy = isLoading

  const handleSubmit = (): void => {
    const text = message.trim()
    if (text.length === 0 || busy) return
    setMessage('')
    if (mode === 'dashboard') {
      void generateDynamic(note.content, text)
    } else {
      generate(note.content, text)
    }
  }

  const activeTab = note.tabs.find((tab) => tab.id === note.activeTabId)
  const hasChips = note.suggestedOptions.length > 0 || Boolean(activeTab?.suggestedActions.some(Boolean))

  return (
    <div className="group flex flex-col gap-2.5 border-t border-slate-100 bg-slate-50/60 p-3">
      {error ? <p className="text-xs text-red-500">{error.message}</p> : null}

      {hasChips ? (
        <div className="grid grid-rows-[0fr] overflow-hidden opacity-0 transition-all duration-300 ease-out group-focus-within:grid-rows-[1fr] group-focus-within:opacity-100">
          <div className="flex min-h-0 flex-col gap-2 overflow-hidden pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
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
                  className="animate-[chip-in_380ms_ease-out_both]"
                  style={{ animationDelay: `${(index * 30).toString()}ms` }}
                  onClick={() => {
                    setMessage(option.description)
                    setMode(option.mode)
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
                      className="animate-[chip-in_380ms_ease-out_both] px-2 py-1 text-xs"
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

      <div className="flex items-center gap-2">
        <div className="flex shrink-0 rounded-full bg-slate-100 p-0.5 text-xs">
          {(['canvas', 'dashboard'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m) }}
              disabled={busy}
              className={`rounded-full px-3 py-1.5 capitalize transition-all duration-200 disabled:opacity-40 ${
                mode === m
                  ? 'bg-white font-medium text-violet-600 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={message}
          onChange={(event) => { setMessage(event.target.value) }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              handleSubmit()
            }
          }}
          placeholder="Describe a new view…"
          disabled={busy}
          className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-100 disabled:opacity-40"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy || message.trim().length === 0}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500 text-white shadow-sm transition-all hover:bg-violet-600 active:scale-95 disabled:opacity-40"
          aria-label="Send"
        >
          {busy ? (
            <LoadingSpinner size="sm" className="border-violet-300 border-t-white" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
