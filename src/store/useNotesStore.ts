import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { notesDb } from '@/lib/notesDb'
import type { GeneratedUITab, Note } from '@/types/note'
import type { SuggestOptions } from '@/schemas/suggestOptions'

// Module-level debounce timers for note content updates — one per note.
const contentSyncTimers = new Map<string, ReturnType<typeof setTimeout>>()

function debounceContentSync(noteId: string, fn: () => void) {
  const existing = contentSyncTimers.get(noteId)
  if (existing) clearTimeout(existing)
  contentSyncTimers.set(noteId, setTimeout(() => {
    contentSyncTimers.delete(noteId)
    fn()
  }, 1000))
}

// Returns the sort position of a note within the current noteOrder.
function sortOrderOf(noteOrder: string[], noteId: string): number {
  const idx = noteOrder.indexOf(noteId)
  return idx === -1 ? noteOrder.length : idx
}

interface NotesState {
  notes: Record<string, Note>
  activeNoteId: string | null
  userApiKey: string | null
  noteOrder: string[]
  // Auth & sync
  hydrateFromSupabase: (notes: Note[], noteOrder: string[]) => void
  clearNotes: () => void
  // Note CRUD
  createNote: () => string
  updateNoteContent: (id: string, content: string) => void
  updateNoteTitle: (id: string, title: string) => void
  deleteNote: (id: string) => void
  setActiveNoteId: (id: string | null) => void
  setApiKey: (key: string | null) => void
  reorderNotes: (orderedIds: string[]) => void
  // Tab lifecycle
  addPendingTab: (id: string, direction: string) => string
  patchGeneratedTab: (
    id: string,
    tabId: string,
    patch: Partial<Omit<GeneratedUITab, 'id' | 'createdAt'>>,
  ) => void
  removeTab: (id: string, tabId: string) => void
  setActiveTabId: (id: string, tabId: string | null) => void
  setSuggestedOptions: (id: string, options: SuggestOptions['options']) => void
  patchComponentState: (id: string, tabId: string, key: string, value: string | number | boolean) => void
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notes: {},
      activeNoteId: null,
      userApiKey: null,
      noteOrder: [],

      hydrateFromSupabase: (notes, noteOrder) => {
        const notesMap = Object.fromEntries(notes.map((n) => [n.id, n]))
        set({ notes: notesMap, noteOrder, activeNoteId: null })
      },

      clearNotes: () => {
        set({ notes: {}, noteOrder: [], activeNoteId: null })
      },

      createNote: () => {
        const id = crypto.randomUUID()
        const now = Date.now()
        const note: Note = {
          id,
          title: 'Untitled note',
          content: '',
          createdAt: now,
          updatedAt: now,
          tabs: [],
          activeTabId: null,
          suggestedOptions: [],
        }
        set((state) => ({
          notes: { ...state.notes, [id]: note },
          activeNoteId: id,
          noteOrder: [id, ...state.noteOrder],
        }))
        void notesDb.upsert(note, 0).catch(console.error)
        return id
      },

      updateNoteContent: (id, content) => {
        set((state) => {
          const note = state.notes[id]
          if (!note) return state
          return {
            notes: {
              ...state.notes,
              [id]: { ...note, content, updatedAt: Date.now() },
            },
          }
        })
        debounceContentSync(id, () => {
          const state = get()
          const note = state.notes[id]
          if (note) {
            void notesDb.upsert(note, sortOrderOf(state.noteOrder, id)).catch(console.error)
          }
        })
      },

      updateNoteTitle: (id, title) => {
        set((state) => {
          const note = state.notes[id]
          if (!note) return state
          return {
            notes: {
              ...state.notes,
              [id]: { ...note, title, updatedAt: Date.now() },
            },
          }
        })
        const state = get()
        const note = state.notes[id]
        if (note) {
          void notesDb.upsert({ ...note, title }, sortOrderOf(state.noteOrder, id)).catch(console.error)
        }
      },

      deleteNote: (id) => {
        set((state) => {
          const notes = { ...state.notes }
          Reflect.deleteProperty(notes, id)
          const activeNoteId = state.activeNoteId === id ? null : state.activeNoteId
          return { notes, activeNoteId, noteOrder: state.noteOrder.filter((i) => i !== id) }
        })
        void notesDb.delete(id).catch(console.error)
      },

      reorderNotes: (orderedIds) => {
        set({ noteOrder: orderedIds })
        void notesDb.upsertOrder(orderedIds).catch(console.error)
      },

      setActiveNoteId: (id) => {
        set({ activeNoteId: id })
      },

      setApiKey: (key) => {
        set({ userApiKey: key })
      },

      addPendingTab: (id: string, direction: string) => {
        const tabId = crypto.randomUUID()
        console.debug('[useNotesStore] addPendingTab', { noteId: id, tabId, direction })
        set((state) => {
          const note = state.notes[id]
          if (!note) return state
          const newTab: GeneratedUITab = {
            id: tabId,
            title: direction,
            code: '',
            explanation: '',
            suggestedActions: [],
            direction,
            createdAt: Date.now(),
            status: 'streaming',
          }
          return {
            notes: {
              ...state.notes,
              [id]: {
                ...note,
                tabs: [...note.tabs, newTab],
                activeTabId: newTab.id,
                updatedAt: Date.now(),
              },
            },
          }
        })
        // Do not sync — streaming tabs are never written to Supabase
        return tabId
      },

      patchGeneratedTab: (id, tabId, patch) => {
        console.debug('[useNotesStore] patchGeneratedTab', {
          noteId: id,
          tabId,
          patchKeys: Object.keys(patch),
          status: patch.status,
          error: patch.error,
        })
        set((state) => {
          const note = state.notes[id]
          if (!note) return state
          return {
            notes: {
              ...state.notes,
              [id]: {
                ...note,
                tabs: note.tabs.map((tab) => (tab.id === tabId ? { ...tab, ...patch } : tab)),
                updatedAt: Date.now(),
              },
            },
          }
        })
        // Only sync once generation is complete — never sync streaming state
        if (patch.status !== 'streaming') {
          const state = get()
          const note = state.notes[id]
          if (note) {
            void notesDb.upsert(note, sortOrderOf(state.noteOrder, id)).catch(console.error)
          }
        }
      },

      removeTab: (id, tabId) => {
        console.debug('[useNotesStore] removeTab', { noteId: id, tabId })
        set((state) => {
          const note = state.notes[id]
          if (!note) return state
          const tabs = note.tabs.filter((tab) => tab.id !== tabId)
          const activeTabId =
            note.activeTabId === tabId ? (tabs.at(-1)?.id ?? null) : note.activeTabId
          return {
            notes: {
              ...state.notes,
              [id]: { ...note, tabs, activeTabId, updatedAt: Date.now() },
            },
          }
        })
        const state = get()
        const note = state.notes[id]
        if (note) {
          void notesDb.upsert(note, sortOrderOf(state.noteOrder, id)).catch(console.error)
        }
      },

      setActiveTabId: (id, tabId) => {
        set((state) => {
          const note = state.notes[id]
          if (!note) return state
          return {
            notes: {
              ...state.notes,
              [id]: { ...note, activeTabId: tabId },
            },
          }
        })
      },

      setSuggestedOptions: (id, options) => {
        set((state) => {
          const note = state.notes[id]
          if (!note) return state
          return {
            notes: {
              ...state.notes,
              [id]: { ...note, suggestedOptions: options },
            },
          }
        })
        const state = get()
        const note = state.notes[id]
        if (note) {
          void notesDb.upsert({ ...note, suggestedOptions: options }, sortOrderOf(state.noteOrder, id)).catch(console.error)
        }
      },

      patchComponentState: (id, tabId, key, value) => {
        console.debug('[useNotesStore] patchComponentState', { noteId: id, tabId, key, value })
        set((state) => {
          const note = state.notes[id]
          if (!note) return state
          return {
            notes: {
              ...state.notes,
              [id]: {
                ...note,
                tabs: note.tabs.map((tab) =>
                  tab.id === tabId
                    ? { ...tab, componentState: { ...tab.componentState, [key]: value } }
                    : tab,
                ),
              },
            },
          }
        })
        const state = get()
        const note = state.notes[id]
        if (note) {
          void notesDb.upsert(note, sortOrderOf(state.noteOrder, id)).catch(console.error)
        }
      },
    }),
    {
      name: 'morph-notes-store-v5',
      // Only persist the BYOK API key — notes live in Supabase now
      partialize: (state) => ({ userApiKey: state.userApiKey }),
    },
  ),
)
