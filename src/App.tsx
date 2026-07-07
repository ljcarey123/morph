import { useState } from 'react'
import { useNotesStore } from '@/store/useNotesStore'
import { NoteList } from '@/components/NoteList'
import { NoteWorkspace } from '@/components/NoteWorkspace'
import { SettingsModal } from '@/components/SettingsModal'
import { AuthGate } from '@/components/AuthGate'

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 2l4 5-4 5" />
    </svg>
  )
}

function WorkspaceApp() {
  const activeNoteId = useNotesStore((state) => state.activeNoteId)
  const createNote = useNotesStore((state) => state.createNote)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen overflow-hidden bg-[#f0eef8]">
      {/* Sidebar — transitions to a thin strip when collapsed */}
      <div
        className={`shrink-0 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-[272px]' : 'w-10'}`}
      >
        {isSidebarOpen ? (
          <div className="h-full p-3 pr-1.5">
            <NoteList
              onOpenSettings={() => { setIsSettingsOpen(true) }}
              onCollapse={() => { setIsSidebarOpen(false) }}
            />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center pt-3">
            <button
              type="button"
              onClick={() => { setIsSidebarOpen(true) }}
              title="Show sidebar"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm transition-colors hover:text-slate-600"
            >
              <ChevronRightIcon />
            </button>
          </div>
        )}
      </div>

      {/* Main workspace */}
      <div className="flex min-w-0 flex-1 flex-col p-3 pl-1.5">
        {activeNoteId ? (
          <NoteWorkspace noteId={activeNoteId} />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <button
              type="button"
              onClick={() => { createNote() }}
              className="rounded-2xl bg-violet-500 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-violet-600"
            >
              Create your first note
            </button>
          </div>
        )}
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => { setIsSettingsOpen(false) }}
      />
    </div>
  )
}

function App() {
  return (
    <AuthGate>
      <WorkspaceApp />
    </AuthGate>
  )
}

export default App
