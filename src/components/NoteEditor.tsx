import { useNotesStore } from '@/store/useNotesStore'

interface NoteEditorProps {
  noteId: string
}

export function NoteEditor({ noteId }: NoteEditorProps) {
  const note = useNotesStore((state) => state.notes[noteId])
  const updateNoteContent = useNotesStore((state) => state.updateNoteContent)
  const updateNoteTitle = useNotesStore((state) => state.updateNoteTitle)

  if (!note) return null

  return (
    <div className="flex h-full flex-1 flex-col gap-4 p-4">
      <input
        type="text"
        value={note.title}
        onChange={(event) => {
          updateNoteTitle(noteId, event.target.value)
        }}
        onBlur={(event) => {
          if (event.target.value.trim().length === 0) {
            updateNoteTitle(noteId, 'Untitled note')
          }
        }}
        placeholder="Untitled note"
        className="truncate rounded bg-transparent text-lg font-medium text-stone-100 outline-none focus:bg-stone-900"
      />

      <textarea
        value={note.content}
        onChange={(event) => {
          updateNoteContent(noteId, event.target.value)
        }}
        placeholder="Write your note…"
        className="h-full w-full resize-none rounded border border-stone-800 bg-stone-900 p-3 text-sm text-stone-100 outline-none"
      />
    </div>
  )
}
