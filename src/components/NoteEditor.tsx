import { useState } from 'react'
import { useNotesStore } from '@/store/useNotesStore'
import { GeneratedUIPanel } from '@/components/GeneratedUIPanel'

interface NoteEditorProps {
  noteId: string
}

export function NoteEditor({ noteId }: NoteEditorProps) {
  const note = useNotesStore((state) => state.notes[noteId])
  const updateNoteContent = useNotesStore((state) => state.updateNoteContent)
  const updateNoteTitle = useNotesStore((state) => state.updateNoteTitle)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  if (!note) return null

  return (
    <div className="flex h-full flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
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
          className="flex-1 truncate rounded bg-transparent text-lg font-medium text-zinc-100 outline-none focus:bg-zinc-900"
        />
        <button
          type="button"
          onClick={() => {
            setIsPanelOpen(true)
          }}
          disabled={note.content.trim().length === 0}
          className="rounded bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Generate
        </button>
      </div>

      <textarea
        value={note.content}
        onChange={(event) => {
          updateNoteContent(noteId, event.target.value)
        }}
        placeholder="Write your note…"
        className="h-full w-full resize-none rounded border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-100 outline-none"
      />

      <GeneratedUIPanel
        noteId={noteId}
        isOpen={isPanelOpen}
        onClose={() => {
          setIsPanelOpen(false)
        }}
      />
    </div>
  )
}
