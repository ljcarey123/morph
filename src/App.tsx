import { useState } from 'react'
import { useNotesStore } from '@/store/useNotesStore'
import { NoteList } from '@/components/NoteList'
import { NoteEditor } from '@/components/NoteEditor'
import { SettingsModal } from '@/components/SettingsModal'

function App() {
  const activeNoteId = useNotesStore((state) => state.activeNoteId)
  const createNote = useNotesStore((state) => state.createNote)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h1 className="text-lg font-medium">Morph</h1>
        <button
          type="button"
          onClick={() => {
            setIsSettingsOpen(true)
          }}
          aria-label="Settings"
          className="rounded p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          ⚙
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <NoteList />

        {activeNoteId ? (
          <NoteEditor noteId={activeNoteId} />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <button
              type="button"
              onClick={() => createNote()}
              className="rounded bg-violet-600 px-4 py-2 text-sm font-medium text-white"
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
