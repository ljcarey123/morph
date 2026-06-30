import { useNotesStore } from '@/store/useNotesStore'

interface ArtifactTabsProps {
  noteId: string
}

export function ArtifactTabs({ noteId }: ArtifactTabsProps) {
  const note = useNotesStore((state) => state.notes[noteId])
  const setActiveTabId = useNotesStore((state) => state.setActiveTabId)
  const removeTab = useNotesStore((state) => state.removeTab)

  if (!note) return null

  return (
    <div className="flex items-stretch gap-1 overflow-x-auto border-b border-stone-800 px-2 py-1">
      <button
        type="button"
        onClick={() => {
          setActiveTabId(noteId, null)
        }}
        className={`shrink-0 rounded px-3 py-2 text-sm ${
          note.activeTabId === null
            ? 'bg-amber-500/15 text-stone-100'
            : 'text-stone-400 hover:bg-stone-800'
        }`}
      >
        Note
      </button>
      {note.tabs.map((tab) => (
        <div
          key={tab.id}
          className={`flex shrink-0 items-stretch gap-1 rounded text-sm animate-[tab-in_200ms_ease-out_both] ${
            tab.id === note.activeTabId
              ? 'bg-amber-500/15 text-stone-100'
              : 'text-stone-400 hover:bg-stone-800'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTabId(noteId, tab.id)
            }}
            className="flex min-w-0 max-w-48 items-center gap-2 px-3 py-2 text-left"
          >
            {tab.status === 'streaming' ? (
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400/50" style={{ animationDuration: '1.4s' }} />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400/80" />
              </span>
            ) : tab.status === 'error' ? (
              <span className="shrink-0 text-[10px] font-bold text-red-400">!</span>
            ) : (
              <span className="shrink-0 rounded bg-white/10 px-1 text-[10px] uppercase tracking-wide text-stone-400">
                {tab.uiType === 'svg_diagram' ? 'SVG' : 'HTML'}
              </span>
            )}
            <span className="min-w-0 truncate">{tab.title || 'Untitled view'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              removeTab(noteId, tab.id)
            }}
            aria-label={`Delete ${tab.title || 'view'}`}
            className="shrink-0 self-center rounded px-2 text-xs text-stone-500 hover:bg-white/10 hover:text-red-400"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
