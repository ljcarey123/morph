import { useNotesStore } from '@/store/useNotesStore'

export function NoteList() {
  const notes = useNotesStore((state) => state.notes)
  const activeNoteId = useNotesStore((state) => state.activeNoteId)
  const createNote = useNotesStore((state) => state.createNote)
  const deleteNote = useNotesStore((state) => state.deleteNote)
  const setActiveNoteId = useNotesStore((state) => state.setActiveNoteId)

  const noteList = Object.values(notes).sort((a, b) => b.updatedAt - a.updatedAt)

  return (
    <div className="flex h-full w-64 flex-col border-r border-zinc-800">
      <button
        type="button"
        onClick={() => createNote()}
        className="m-2 rounded border border-zinc-800 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800"
      >
        + New note
      </button>

      <ul className="flex-1 overflow-y-auto">
        {noteList.map((note) => (
          <li
            key={note.id}
            className={`flex items-center justify-between px-3 py-2 text-sm ${
              note.id === activeNoteId
                ? 'bg-violet-600/20 text-zinc-100'
                : 'text-zinc-400 hover:bg-zinc-800'
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
              className="ml-2 shrink-0 text-zinc-500 hover:text-red-400"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
