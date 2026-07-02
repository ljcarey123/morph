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
    <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-100 bg-slate-50/60 px-3 py-2">
      <button
        type="button"
        onClick={() => { setActiveTabId(noteId, null) }}
        className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
          note.activeTabId === null
            ? 'bg-white text-violet-600 shadow-sm'
            : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        Note
      </button>

      {note.tabs.map((tab) => (
        <div
          key={tab.id}
          className={`flex shrink-0 items-stretch rounded-full text-xs animate-[tab-in_480ms_cubic-bezier(0.34,1.56,0.64,1)_both] ${
            tab.id === note.activeTabId
              ? 'bg-white text-violet-600 shadow-sm'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <button
            type="button"
            onClick={() => { setActiveTabId(noteId, tab.id) }}
            className="flex min-w-0 max-w-48 items-center gap-1.5 pl-3 pr-2 py-1.5 text-left font-medium"
          >
            {tab.status === 'streaming' ? (
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400/60" style={{ animationDuration: '1.4s' }} />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet-500" />
              </span>
            ) : tab.status === 'error' ? (
              <span className="shrink-0 font-bold text-red-400">!</span>
            ) : (
              <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wide ${
                tab.id === note.activeTabId ? 'bg-violet-100 text-violet-500' : 'bg-slate-100 text-slate-400'
              }`}>
                {tab.uiType === 'svg_diagram' ? 'SVG' : 'HTML'}
              </span>
            )}
            <span className="min-w-0 truncate">{tab.title || 'Untitled view'}</span>
          </button>
          <button
            type="button"
            onClick={() => { removeTab(noteId, tab.id) }}
            aria-label={`Delete ${tab.title || 'view'}`}
            className="shrink-0 self-center rounded-full px-2 py-1.5 text-slate-300 transition-colors hover:text-red-400"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
