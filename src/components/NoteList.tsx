import { useState } from 'react'
import { useNotesStore } from '@/store/useNotesStore'

const BLOB_COLORS = [
  'bg-violet-400',
  'bg-pink-400',
  'bg-amber-400',
  'bg-teal-400',
  'bg-blue-400',
  'bg-rose-400',
]

function getBlobColor(id: string): string {
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff
  return BLOB_COLORS[hash % BLOB_COLORS.length] ?? 'bg-violet-400'
}

interface NoteListProps {
  onOpenSettings: () => void
  onCollapse: () => void
}

export function NoteList({ onOpenSettings, onCollapse }: NoteListProps) {
  const notes = useNotesStore((state) => state.notes)
  const activeNoteId = useNotesStore((state) => state.activeNoteId)
  const noteOrder = useNotesStore((state) => state.noteOrder)
  const createNote = useNotesStore((state) => state.createNote)
  const deleteNote = useNotesStore((state) => state.deleteNote)
  const setActiveNoteId = useNotesStore((state) => state.setActiveNoteId)
  const reorderNotes = useNotesStore((state) => state.reorderNotes)

  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  // Notes in custom order first, then any not-yet-ordered notes by updatedAt
  const orderedNotes = [
    ...noteOrder.filter((id) => notes[id]).map((id) => notes[id]!),
    ...Object.values(notes)
      .filter((n) => !noteOrder.includes(n.id))
      .sort((a, b) => b.updatedAt - a.updatedAt),
  ]

  const handleDragStart = (id: string): void => {
    setDraggedId(id)
  }

  const handleDragOver = (event: React.DragEvent, id: string): void => {
    event.preventDefault()
    if (id !== draggedId) setDragOverId(id)
  }

  const handleDrop = (targetId: string): void => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null)
      setDragOverId(null)
      return
    }
    const ids = orderedNotes.map((n) => n.id)
    const fromIdx = ids.indexOf(draggedId)
    const toIdx = ids.indexOf(targetId)
    const newIds = [...ids]
    newIds.splice(fromIdx, 1)
    newIds.splice(toIdx, 0, draggedId)
    reorderNotes(newIds)
    setDraggedId(null)
    setDragOverId(null)
  }

  const handleDragEnd = (): void => {
    setDraggedId(null)
    setDragOverId(null)
  }

  return (
    <div className="flex h-full flex-col rounded-2xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between px-5 pb-3 pt-5">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-800">Morph</h1>
          <p className="mt-0.5 text-xs text-slate-400">AI workspace</p>
        </div>
        <button
          type="button"
          onClick={onCollapse}
          title="Collapse sidebar"
          className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-slate-50 hover:text-slate-500"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 2L5 7l4 5" />
          </svg>
        </button>
      </div>

      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={() => { createNote() }}
          className="w-full rounded-xl bg-violet-500 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-violet-600 active:scale-[0.98]"
        >
          + New note
        </button>
      </div>

      <ul className="flex-1 overflow-y-auto px-2">
        {orderedNotes.map((note) => (
          <li
            key={note.id}
            draggable
            onDragStart={() => { handleDragStart(note.id) }}
            onDragOver={(e) => { handleDragOver(e, note.id) }}
            onDrop={() => { handleDrop(note.id) }}
            onDragEnd={handleDragEnd}
            className={`group flex items-center gap-2 rounded-xl px-2 py-2.5 transition-colors ${
              note.id === activeNoteId
                ? 'bg-violet-50 text-slate-800'
                : 'text-slate-500 hover:bg-slate-50'
            } ${
              note.id === draggedId ? 'opacity-40' : ''
            } ${
              note.id === dragOverId ? 'ring-2 ring-violet-300 ring-offset-1' : ''
            }`}
          >
            {/* Drag handle */}
            <span className="shrink-0 cursor-grab text-slate-200 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing">
              <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
                <circle cx="3" cy="3" r="1.2" /><circle cx="7" cy="3" r="1.2" />
                <circle cx="3" cy="7" r="1.2" /><circle cx="7" cy="7" r="1.2" />
                <circle cx="3" cy="11" r="1.2" /><circle cx="7" cy="11" r="1.2" />
              </svg>
            </span>
            <span className={`h-2 w-2 shrink-0 rounded-full ${getBlobColor(note.id)}`} />
            <button
              type="button"
              onClick={() => { setActiveNoteId(note.id) }}
              className={`flex-1 truncate text-left text-sm ${
                note.id === activeNoteId ? 'font-medium text-slate-800' : 'text-slate-600'
              }`}
            >
              {note.title}
            </button>
            <button
              type="button"
              onClick={() => { deleteNote(note.id) }}
              aria-label={`Delete ${note.title}`}
              className="shrink-0 text-xs text-slate-300 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div className="border-t border-slate-100 px-2 pb-3 pt-2">
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
        >
          <span>⚙</span>
          <span>Settings</span>
        </button>
      </div>
    </div>
  )
}
