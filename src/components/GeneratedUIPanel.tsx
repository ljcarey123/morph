import { useEffect, useRef, useState } from 'react'
import { useNotesStore } from '@/store/useNotesStore'
import { useGenerativeUI } from '@/hooks/useGenerativeUI'
import { useSuggestOptions } from '@/hooks/useSuggestOptions'
import { useThrottledValue } from '@/hooks/useThrottledValue'
import { PreviewCanvas } from '@/components/PreviewCanvas'
import { Button } from '@/components/ui/Button'
import { Disclosure } from '@/components/ui/Disclosure'

interface GeneratedUIPanelProps {
  noteId: string
  isOpen: boolean
  onClose: () => void
}

const THROTTLE_MS = 3_000

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function GeneratedUIPanel({ noteId, isOpen, onClose }: GeneratedUIPanelProps) {
  const note = useNotesStore((state) => state.notes[noteId])
  const setActiveTabId = useNotesStore((state) => state.setActiveTabId)
  const removeTab = useNotesStore((state) => state.removeTab)
  const { partialUI, generate, retry, isLoading, error } = useGenerativeUI(noteId)
  const { options, fetchOptions, isLoading: isLoadingOptions } = useSuggestOptions()
  const [customDirection, setCustomDirection] = useState('')
  const historyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const content = useNotesStore.getState().notes[noteId]?.content
    if (content) {
      void fetchOptions(content)
    }
  }, [isOpen, noteId, fetchOptions])

  useEffect(() => {
    const history = historyRef.current
    if (!history || typeof history.scrollTo !== 'function') return
    history.scrollTo({ top: history.scrollHeight, behavior: 'smooth' })
  }, [note?.tabs.length])

  const activeTab = note?.tabs.find((tab) => tab.id === note.activeTabId)
  const isViewingStreamingTab = isLoading && activeTab?.status === 'streaming'

  const throttledPartial = useThrottledValue(partialUI, THROTTLE_MS, !isLoading)

  const code = isViewingStreamingTab ? throttledPartial?.code : activeTab?.code
  const uiType = isViewingStreamingTab ? throttledPartial?.ui_type : activeTab?.uiType
  const explanation = isViewingStreamingTab ? throttledPartial?.explanation : activeTab?.explanation
  const suggestedActions = isViewingStreamingTab
    ? throttledPartial?.suggested_actions
    : activeTab?.suggestedActions
  const hasDetails =
    activeTab?.status !== 'error' &&
    (Boolean(explanation) || Boolean(suggestedActions && suggestedActions.length > 0))

  if (!note) return null

  const handlePick = (direction: string): void => {
    generate(note.content, direction, activeTab?.code)
    setCustomDirection('')
  }

  const handleCustomSubmit = (): void => {
    if (customDirection.trim().length === 0) return
    handlePick(customDirection.trim())
  }

  const handleRetry = (tab: NonNullable<typeof activeTab>): void => {
    retry(tab.id, note.content, tab.direction, tab.previousCode)
  }

  return (
    <div
      className={`fixed inset-0 z-40 flex items-center justify-center bg-black/40 transition-opacity duration-300 ${
        isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      onClick={onClose}
      aria-hidden={!isOpen}
    >
      <div
        onClick={(event) => {
          event.stopPropagation()
        }}
        className={`flex h-[88vh] w-[92vw] flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/10 shadow-2xl backdrop-blur-xl transition-all duration-300 ${
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
          <h2 className="truncate text-sm font-medium text-zinc-200">{note.title}</h2>
          <Button variant="icon" onClick={onClose} aria-label="Close">
            ✕
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex w-[340px] shrink-0 flex-col border-r border-white/10">
            <div ref={historyRef} className="flex-1 space-y-1 overflow-y-auto p-3">
              {note.tabs.length === 0 ? (
                <p className="px-2 py-4 text-center text-xs text-zinc-500">
                  Pick a direction below to generate your first view.
                </p>
              ) : null}
              {note.tabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`flex items-stretch gap-1 rounded-lg text-sm ${
                    tab.id === note.activeTabId
                      ? 'bg-violet-600/30 text-zinc-100'
                      : 'text-zinc-400 hover:bg-white/10'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTabId(noteId, tab.id)
                    }}
                    className="flex min-w-0 flex-1 flex-col gap-0.5 px-3 py-2 text-left"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {tab.status === 'streaming' ? (
                        <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-violet-400" />
                      ) : tab.status === 'error' ? (
                        <span className="shrink-0 text-[10px] font-bold text-red-400">!</span>
                      ) : (
                        <span className="shrink-0 rounded bg-white/10 px-1 text-[10px] uppercase tracking-wide text-zinc-400">
                          {tab.uiType === 'svg_diagram' ? 'SVG' : 'HTML'}
                        </span>
                      )}
                      <span className="min-w-0 truncate">{tab.direction || 'Untitled view'}</span>
                    </span>
                    <span className="text-[10px] text-zinc-500">{formatTime(tab.createdAt)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      removeTab(noteId, tab.id)
                    }}
                    aria-label={`Delete ${tab.direction || 'view'}`}
                    className="shrink-0 self-center rounded px-2 py-1 text-xs text-zinc-500 hover:bg-white/10 hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 border-t border-white/10 p-3">
              {error ? <p className="text-xs text-red-400">{error.message}</p> : null}
              <div className="flex flex-wrap gap-2">
                {isLoadingOptions ? <span className="text-xs text-zinc-500">Thinking…</span> : null}
                {options.map((option) => (
                  <Button
                    key={option.label}
                    variant="chip"
                    onClick={() => {
                      handlePick(option.label)
                    }}
                    disabled={isLoading}
                    title={option.description}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customDirection}
                  onChange={(event) => {
                    setCustomDirection(event.target.value)
                  }}
                  placeholder="Or describe what you want…"
                  className="flex-1 rounded border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-100 outline-none"
                />
                <Button
                  onClick={handleCustomSubmit}
                  disabled={isLoading || customDirection.trim().length === 0}
                >
                  Send
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col">
            <div className="flex min-w-0 items-center justify-between gap-2 border-b border-white/10 px-4 py-2">
              <span className="min-w-0 truncate text-xs text-zinc-400">
                {activeTab?.direction ?? 'No view selected'}
              </span>
              {hasDetails ? (
                <Disclosure key={note.activeTabId ?? 'none'} label="Details">
                  {explanation ? <p className="mb-2 text-xs text-zinc-300">{explanation}</p> : null}
                  {suggestedActions && suggestedActions.length > 0 ? (
                    <ul className="flex flex-wrap gap-2 text-xs text-zinc-300">
                      {suggestedActions.map((action) => (
                        <li key={action} className="rounded border border-white/10 px-2 py-1">
                          {action}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </Disclosure>
              ) : null}
            </div>
            <div className="flex-1 overflow-hidden">
              {activeTab?.status === 'error' ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                  <p className="text-sm text-red-400">
                    {activeTab.explanation || 'Generation failed.'}
                  </p>
                  <Button
                    onClick={() => {
                      handleRetry(activeTab)
                    }}
                    disabled={isLoading}
                  >
                    Retry
                  </Button>
                </div>
              ) : (
                <PreviewCanvas code={code} uiType={uiType} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
