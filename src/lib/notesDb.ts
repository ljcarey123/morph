import { supabase } from './supabase'
import type { Note } from '@/types/note'

// Row shape in Postgres (snake_case)
interface DbRow {
  id: string
  user_id: string
  title: string
  content: string
  tabs: Note['tabs']
  active_tab_id: string | null
  suggested_options: Note['suggestedOptions']
  sort_order: number
  created_at: string
  updated_at: string
}

// Strip streaming tabs before persisting — never write in-progress generation state
function toRow(note: Note, sortOrder: number): Omit<DbRow, 'user_id'> {
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    tabs: note.tabs.filter((t) => t.status !== 'streaming'),
    active_tab_id: note.activeTabId,
    suggested_options: note.suggestedOptions,
    sort_order: sortOrder,
    created_at: new Date(note.createdAt).toISOString(),
    updated_at: new Date(note.updatedAt).toISOString(),
  }
}

function fromRow(row: DbRow): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    tabs: (row.tabs ?? []).map((t) => ({ ...t, status: t.status ?? 'done' })),
    activeTabId: row.active_tab_id,
    suggestedOptions: row.suggested_options ?? [],
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  }
}

export const notesDb = {
  async loadAll(): Promise<{ notes: Note[]; noteOrder: string[] }> {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('sort_order', { ascending: true })
    if (error) throw error
    const rows = (data ?? []) as DbRow[]
    return {
      notes: rows.map(fromRow),
      noteOrder: rows.map((r) => r.id),
    }
  },

  async upsert(note: Note, sortOrder: number): Promise<void> {
    const { error } = await supabase.from('notes').upsert(toRow(note, sortOrder))
    if (error) throw error
  },

  async delete(noteId: string): Promise<void> {
    const { error } = await supabase.from('notes').delete().eq('id', noteId)
    if (error) throw error
  },

  async upsertOrder(orderedIds: string[]): Promise<void> {
    const rows = orderedIds.map((id, index) => ({ id, sort_order: index }))
    const { error } = await supabase.from('notes').upsert(rows)
    if (error) throw error
  },
}
