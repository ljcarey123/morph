import { useNotesStore } from '@/store/useNotesStore'

export function NoteList() {
  const notes = useNotesStore((state) => state.notes)
  const activeNoteId = useNotesStore((state) => state.activeNoteId)
  const createNote = useNotesStore((state) => state.createNote)
  const deleteNote = useNotesStore((state) => state.deleteNote)
  const setActiveNoteId = useNotesStore((state) => state.setActiveNoteId)

  const noteList = Object.values(notes).sort((a, b) => b.updatedAt - a.updatedAt)

  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r border-stone-800">
      <button
        type="button"
        onClick={() => createNote()}
        className="m-2 rounded border border-stone-700/50 px-3 py-2 text-sm text-stone-300 transition-colors hover:border-stone-600 hover:bg-stone-800 hover:text-stone-100"
      >
        + New note
      </button>

      <ul className="flex-1 overflow-y-auto">
        {noteList.map((note) => (
          <li
            key={note.id}
            className={`flex items-center justify-between px-3 py-2 text-sm ${
              note.id === activeNoteId
                ? 'bg-amber-500/10 text-stone-100 border-l-2 border-amber-500/50'
                : 'text-stone-400 hover:bg-stone-800/70 border-l-2 border-transparent'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setActiveNoteId(note.id)
              }}
              className="flex-1 truncate text-left"
            >
              {note.title}
            </button>
            <button
              type="button"
              onClick={() => {
                deleteNote(note.id)
              }}
              aria-label={`Delete ${note.title}`}
              className="ml-2 shrink-0 text-stone-500 hover:text-red-400"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
