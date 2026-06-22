import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GeneratedUITab, Note } from '@/types/note'

interface NotesState {
  notes: Record<string, Note>
  activeNoteId: string | null
  userApiKey: string | null
  createNote: () => string
  updateNoteContent: (id: string, content: string) => void
  deleteNote: (id: string) => void
  setActiveNoteId: (id: string | null) => void
  setApiKey: (key: string | null) => void
  addGeneratedTab: (id: string, tab: Omit<GeneratedUITab, 'id' | 'createdAt'>) => void
  setActiveTabId: (id: string, tabId: string) => void
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set) => ({
      notes: {},
      activeNoteId: null,
      userApiKey: null,

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
        }
        set((state) => ({
          notes: { ...state.notes, [id]: note },
          activeNoteId: id,
        }))
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
      },

      deleteNote: (id) => {
        set((state) => {
          const notes = { ...state.notes }
          Reflect.deleteProperty(notes, id)
          const activeNoteId = state.activeNoteId === id ? null : state.activeNoteId
          return { notes, activeNoteId }
        })
      },

      setActiveNoteId: (id) => {
        set({ activeNoteId: id })
      },

      setApiKey: (key) => {
        set({ userApiKey: key })
      },

      addGeneratedTab: (id, tab) => {
        set((state) => {
          const note = state.notes[id]
          if (!note) return state
          const newTab: GeneratedUITab = {
            ...tab,
            id: crypto.randomUUID(),
            createdAt: Date.now(),
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
    }),
    { name: 'morph-notes-store-v2' },
  ),
)
