import { useCallback, useEffect, useRef, useState } from 'react'
import { useNotesStore } from '@/store/useNotesStore'
import { useGenerativeUI } from '@/hooks/useGenerativeUI'
import { useSuggestOptions } from '@/hooks/useSuggestOptions'
import { useThrottledValue } from '@/hooks/useThrottledValue'
import { PreviewCanvas } from '@/components/PreviewCanvas'
import { Button } from '@/components/ui/Button'
import { Disclosure } from '@/components/ui/Disclosure'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface GeneratedUIPanelProps {
  noteId: string
  isOpen: boolean
  onClose: () => void
}

const THROTTLE_MS = 1_000
const DEFAULT_RAIL_WIDTH = 340
const MIN_RAIL_WIDTH = 260
const MAX_RAIL_WIDTH = 560

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function GeneratedUIPanel({ noteId, isOpen, onClose }: GeneratedUIPanelProps) {
  const note = useNotesStore((state) => state.notes[noteId])
  const setActiveTabId = useNotesStore((state) => state.setActiveTabId)
  const removeTab = useNotesStore((state) => state.removeTab)
  const setSuggestedOptions = useNotesStore((state) => state.setSuggestedOptions)
  const { partialUI, generate, retry, editTab, isLoading, error } = useGenerativeUI(noteId)
  const { fetchOptions, isLoading: isLoadingOptions } = useSuggestOptions()
  const [customDirection, setCustomDirection] = useState('')
  const [customEdit, setCustomEdit] = useState('')
  const historyRef = useRef<HTMLDivElement>(null)
  const railContainerRef = useRef<HTMLDivElement>(null)
  const [railWidth, setRailWidth] = useState(DEFAULT_RAIL_WIDTH)
  const [isResizingRail, setIsResizingRail] = useState(false)

  const runFetchOptions = useCallback(
    async (content: string): Promise<void> => {
      const result = await fetchOptions(content)
      if (result) setSuggestedOptions(noteId, result)
    },
    [fetchOptions, setSuggestedOptions, noteId],
  )

  useEffect(() => {
    if (!isOpen) return
    const current = useNotesStore.getState().notes[noteId]
    if (!current?.content) return
    if (current.suggestedOptions.length > 0) return
    void runFetchOptions(current.content)
  }, [isOpen, noteId, runFetchOptions])

  useEffect(() => {
    const history = historyRef.current
    if (!history || typeof history.scrollTo !== 'function') return
    history.scrollTo({ top: history.scrollHeight, behavior: 'smooth' })
  }, [note?.tabs.length])

  useEffect(() => {
    if (!isResizingRail) return
    const handlePointerMove = (event: PointerEvent): void => {
      const container = railContainerRef.current
      if (!container) return
      const { left } = container.getBoundingClientRect()
      const next = event.clientX - left
      setRailWidth(Math.min(MAX_RAIL_WIDTH, Math.max(MIN_RAIL_WIDTH, next)))
    }
    const handlePointerUp = (): void => {
      setIsResizingRail(false)
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)
    return () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isResizingRail])

  const activeTab = note?.tabs.find((tab) => tab.id === note.activeTabId)
  const isViewingStreamingTab = isLoading && activeTab?.status === 'streaming'

  const throttledPartial = useThrottledValue(partialUI, THROTTLE_MS, !isLoading)

  const code = isViewingStreamingTab ? throttledPartial?.code : activeTab?.code
  const uiType = isViewingStreamingTab ? throttledPartial?.ui_type : activeTab?.uiType
  const explanation = isViewingStreamingTab ? throttledPartial?.explanation : activeTab?.explanation
  const suggestedActions = isViewingStreamingTab
    ? throttledPartial?.suggested_actions
    : activeTab?.suggestedActions
  const hasDetails = Boolean(activeTab) && activeTab?.status !== 'error'
  const isAwaitingFirstContent = isViewingStreamingTab && !code

  if (!note) return null

  const options = note.suggestedOptions

  const handlePick = (direction: string): void => {
    generate(note.content, direction, activeTab?.code)
    setCustomDirection('')
  }

  const handleCustomSubmit = (): void => {
    if (customDirection.trim().length === 0) return
    handlePick(customDirection.trim())
  }

  const handleRetry = (tab: NonNullable<typeof activeTab>): void => {
    retry(tab.id, note.content, tab.direction, tab.previousCode, tab.mode)
  }

  const handleApplyEdit = (direction: string): void => {
    if (!activeTab) return
    editTab(activeTab.id, note.content, direction, activeTab.code)
    setCustomEdit('')
  }

  const handleCustomEditSubmit = (): void => {
    if (customEdit.trim().length === 0) return
    handleApplyEdit(customEdit.trim())
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

        <div ref={railContainerRef} className="flex flex-1 overflow-hidden">
          <div
            style={{ width: railWidth }}
            className="flex shrink-0 flex-col border-r border-white/10"
          >
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
                      <span className="min-w-0 truncate">{tab.title || 'Untitled view'}</span>
                    </span>
                    <span className="text-[10px] text-zinc-500">{formatTime(tab.createdAt)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      removeTab(noteId, tab.id)
                    }}
                    aria-label={`Delete ${tab.title || 'view'}`}
                    className="shrink-0 self-center rounded px-2 py-1 text-xs text-zinc-500 hover:bg-white/10 hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 border-t border-white/10 p-3">
              {error ? <p className="text-xs text-red-400">{error.message}</p> : null}
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">
                  {isLoadingOptions ? 'Thinking…' : 'Suggestions'}
                </span>
                <Button
                  variant="icon"
                  onClick={() => {
                    void runFetchOptions(note.content)
                  }}
                  disabled={isLoadingOptions || isLoading || note.content.trim().length === 0}
                  aria-label="Regenerate suggestions"
                  title="Regenerate suggestions"
                >
                  {isLoadingOptions ? <LoadingSpinner size="sm" /> : '↻'}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
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

          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize history rail"
            onPointerDown={(event) => {
              event.preventDefault()
              if ('setPointerCapture' in event.currentTarget) {
                event.currentTarget.setPointerCapture(event.pointerId)
              }
              setIsResizingRail(true)
            }}
            className="w-1 shrink-0 cursor-col-resize bg-white/10 hover:bg-violet-500/50"
          />

          <div className="flex flex-1 flex-col">
            <div className="flex min-w-0 items-center justify-between gap-2 border-b border-white/10 px-4 py-2">
              <span className="min-w-0 truncate text-xs text-zinc-400">
                {activeTab?.title ?? 'No view selected'}
              </span>
              {hasDetails ? (
                <Disclosure key={note.activeTabId ?? 'none'} label="Details">
                  {explanation ? <p className="mb-2 text-xs text-zinc-300">{explanation}</p> : null}
                  {suggestedActions && suggestedActions.length > 0 ? (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {suggestedActions
                        .filter((action): action is string => Boolean(action))
                        .map((action) => (
                          <Button
                            key={action}
                            variant="chip"
                            className="px-2 py-1 text-xs"
                            onClick={() => {
                              handleApplyEdit(action)
                            }}
                            disabled={isLoading}
                          >
                            {action}
                          </Button>
                        ))}
                    </div>
                  ) : null}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customEdit}
                      onChange={(event) => {
                        setCustomEdit(event.target.value)
                      }}
                      placeholder="Tweak this view…"
                      disabled={isLoading}
                      className="flex-1 rounded border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-100 outline-none disabled:opacity-40"
                    />
                    <Button
                      variant="chip"
                      className="px-2 py-1 text-xs"
                      onClick={handleCustomEditSubmit}
                      disabled={isLoading || customEdit.trim().length === 0}
                    >
                      Apply
                    </Button>
                  </div>
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
              ) : isAwaitingFirstContent ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-zinc-400">
                  <LoadingSpinner size="lg" label="Generating…" />
                  <p className="text-xs">Generating…</p>
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
