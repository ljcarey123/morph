import { useEffect, useState } from 'react'
import { useNotesStore } from '@/store/useNotesStore'
import { useGenerativeUI } from '@/hooks/useGenerativeUI'
import { useSuggestOptions } from '@/hooks/useSuggestOptions'
import { useThrottledValue } from '@/hooks/useThrottledValue'
import { PreviewCanvas } from '@/components/PreviewCanvas'

interface GeneratedUIPanelProps {
  noteId: string
  isOpen: boolean
  onClose: () => void
}

const THROTTLE_MS = 10_000

export function GeneratedUIPanel({ noteId, isOpen, onClose }: GeneratedUIPanelProps) {
  const note = useNotesStore((state) => state.notes[noteId])
  const setActiveTabId = useNotesStore((state) => state.setActiveTabId)
  const { partialUI, generate, isLoading, error } = useGenerativeUI(noteId)
  const { options, fetchOptions, isLoading: isLoadingOptions } = useSuggestOptions()
  const [customDirection, setCustomDirection] = useState('')

  useEffect(() => {
    if (!isOpen) return
    const content = useNotesStore.getState().notes[noteId]?.content
    if (content) {
      void fetchOptions(content)
    }
  }, [isOpen, noteId, fetchOptions])

  const activeTab = note?.tabs.find((tab) => tab.id === note.activeTabId)
  const isActiveTabStreaming = isLoading && activeTab?.id === note?.tabs.at(-1)?.id

  const throttledPartial = useThrottledValue(partialUI, THROTTLE_MS, !isLoading)

  const code = isLoading ? throttledPartial?.code : activeTab?.code
  const uiType = isLoading ? throttledPartial?.ui_type : activeTab?.uiType
  const explanation = isLoading ? throttledPartial?.explanation : activeTab?.explanation
  const suggestedActions = isLoading
    ? throttledPartial?.suggested_actions
    : activeTab?.suggestedActions

  if (!note) return null

  const handlePick = (direction: string): void => {
    generate(note.content, direction, activeTab?.code)
    setCustomDirection('')
  }

  const handleCustomSubmit = (): void => {
    if (customDirection.trim().length === 0) return
    handlePick(customDirection.trim())
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
        className={`flex h-[88vh] w-[92vw] flex-col rounded-2xl border border-white/10 bg-white/10 shadow-2xl backdrop-blur-xl transition-all duration-300 ${
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex flex-1 gap-2 overflow-x-auto">
            {note.tabs.map((tab, index) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTabId(noteId, tab.id)
                }}
                className={`shrink-0 rounded px-3 py-1 text-sm ${
                  tab.id === note.activeTabId
                    ? 'bg-violet-600/40 text-zinc-100'
                    : 'text-zinc-400 hover:bg-white/10'
                }`}
              >
                {tab.direction || `Tab ${String(index + 1)}`}
              </button>
            ))}
            {isLoading && !isActiveTabStreaming ? (
              <span className="shrink-0 rounded px-3 py-1 text-sm text-zinc-500">Generating…</span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-2 shrink-0 rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
          >
            ✕
          </button>
        </div>

        {error ? <p className="px-4 pt-2 text-sm text-red-400">{error.message}</p> : null}

        <div className="flex flex-1 flex-col gap-2 overflow-hidden p-4">
          <div className="flex-1 overflow-hidden rounded-xl border border-white/10">
            <PreviewCanvas code={code} uiType={uiType} />
          </div>
          {explanation ? <p className="text-xs text-zinc-300">{explanation}</p> : null}
          {suggestedActions && suggestedActions.length > 0 ? (
            <ul className="flex flex-wrap gap-2 text-xs text-zinc-300">
              {suggestedActions.map((action) => (
                <li key={action} className="rounded border border-white/10 px-2 py-1">
                  {action}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 p-4">
          <div className="flex flex-wrap gap-2">
            {isLoadingOptions ? <span className="text-xs text-zinc-500">Thinking…</span> : null}
            {options.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => {
                  handlePick(option.label)
                }}
                disabled={isLoading}
                title={option.description}
                className="rounded border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-zinc-100 hover:bg-white/10 disabled:opacity-40"
              >
                {option.label}
              </button>
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
            <button
              type="button"
              onClick={handleCustomSubmit}
              disabled={isLoading || customDirection.trim().length === 0}
              className="rounded bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
