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
    <div className="flex h-full flex-1 flex-col gap-4 p-6">
      <input
        type="text"
        value={note.title}
        onChange={(event) => { updateNoteTitle(noteId, event.target.value) }}
        onBlur={(event) => {
          if (event.target.value.trim().length === 0) {
            updateNoteTitle(noteId, 'Untitled note')
          }
        }}
        placeholder="Untitled note"
        className="truncate bg-transparent text-xl font-semibold text-slate-800 outline-none placeholder:text-slate-300"
      />

      <textarea
        value={note.content}
        onChange={(event) => { updateNoteContent(noteId, event.target.value) }}
        placeholder="Write your note…"
        className="h-full w-full resize-none rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-sm leading-relaxed text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-violet-200 focus:bg-white"
      />
    </div>
  )
}
