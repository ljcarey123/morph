import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GeneratedUITab, Note } from '@/types/note'

interface NotesState {
  notes: Record<string, Note>
  activeNoteId: string | null
  userApiKey: string | null
  createNote: () => string
  updateNoteContent: (id: string, content: string) => void
  updateNoteTitle: (id: string, title: string) => void
  deleteNote: (id: string) => void
  setActiveNoteId: (id: string | null) => void
  setApiKey: (key: string | null) => void
  addPendingTab: (id: string, direction: string, previousCode?: string) => string
  patchGeneratedTab: (
    id: string,
    tabId: string,
    patch: Partial<Omit<GeneratedUITab, 'id' | 'createdAt'>>,
  ) => void
  removeTab: (id: string, tabId: string) => void
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

      addPendingTab: (id, direction, previousCode) => {
        const tabId = crypto.randomUUID()
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
            previousCode,
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
        return tabId
      },

      patchGeneratedTab: (id, tabId, patch) => {
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
      },

      removeTab: (id, tabId) => {
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
    { name: 'morph-notes-store-v3' },
  ),
)
