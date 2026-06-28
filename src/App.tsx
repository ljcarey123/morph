import { useState } from 'react'
import { useNotesStore } from '@/store/useNotesStore'
import { NoteList } from '@/components/NoteList'
import { NoteWorkspace } from '@/components/NoteWorkspace'
import { SettingsModal } from '@/components/SettingsModal'

function App() {
  const activeNoteId = useNotesStore((state) => state.activeNoteId)
  const createNote = useNotesStore((state) => state.createNote)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen flex-col bg-stone-950 text-stone-100">
      <header className="flex items-center justify-between border-b border-stone-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsSidebarOpen((prev) => !prev)
            }}
            aria-label={isSidebarOpen ? 'Hide notes panel' : 'Show notes panel'}
            aria-pressed={isSidebarOpen}
            className="rounded p-2 text-stone-400 hover:bg-stone-800 hover:text-stone-100"
          >
            ☰
          </button>
          <h1 className="text-lg font-medium">Morph</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsSettingsOpen(true)
          }}
          aria-label="Settings"
          className="rounded p-2 text-stone-400 hover:bg-stone-800 hover:text-stone-100"
        >
          ⚙
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div
          className={`overflow-hidden transition-all duration-200 ${
            isSidebarOpen ? 'w-64' : 'w-0'
          }`}
        >
          <NoteList />
        </div>

        {activeNoteId ? (
          <NoteWorkspace noteId={activeNoteId} />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <button
              type="button"
              onClick={() => createNote()}
              className="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-stone-950 hover:bg-amber-400"
            >
              Create your first note
            </button>
          </div>
        )}
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false)
        }}
      />
    </div>
  )
}

export default App
