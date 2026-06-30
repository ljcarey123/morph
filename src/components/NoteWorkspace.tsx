import { useNotesStore } from '@/store/useNotesStore'
import { useGenerativeUI } from '@/hooks/useGenerativeUI'
import { useThrottledValue } from '@/hooks/useThrottledValue'
import { ArtifactTabs } from '@/components/ArtifactTabs'
import { ArtifactView } from '@/components/ArtifactView'
import { ArtifactComposer } from '@/components/ArtifactComposer'
import { NoteEditor } from '@/components/NoteEditor'
import type { GeneratedUITab } from '@/types/note'

const THROTTLE_MS = 1_000

interface NoteWorkspaceProps {
  noteId: string
}

export function NoteWorkspace({ noteId }: NoteWorkspaceProps) {
  const note = useNotesStore((state) => state.notes[noteId])
  const { partialUI, generate, retry, editTab, cancelError, isLoading, error } =
    useGenerativeUI(noteId)

  const activeTab = note?.tabs.find((tab) => tab.id === note.activeTabId)
  const isStreamingActiveTab = isLoading && activeTab?.status === 'streaming'
  // Edits patch the existing view in place once finished — keep showing the current content
  // instead of replacing it with a spinner while the patch streams in.
  const isBranchStreamingActiveTab = isStreamingActiveTab && activeTab.mode !== 'edit'
  const isApplyingEdit = isStreamingActiveTab && activeTab.mode === 'edit'
  const throttledPartial = useThrottledValue(partialUI, THROTTLE_MS, !isLoading)

  const code = isBranchStreamingActiveTab ? throttledPartial?.code : activeTab?.code
  const uiType = isBranchStreamingActiveTab ? throttledPartial?.ui_type : activeTab?.uiType
  const explanation = isBranchStreamingActiveTab
    ? throttledPartial?.explanation
    : activeTab?.explanation
  const isAwaitingFirstContent = isBranchStreamingActiveTab && !code

  if (!note) return null

  const handleRetry = (tab: GeneratedUITab): void => {
    retry(tab.id, note.content, tab.direction, tab.previousCode, tab.mode)
  }

  return (
    <div className="flex h-full flex-1 flex-col">
      <ArtifactTabs noteId={noteId} />
      <div className="flex-1 overflow-auto">
        {note.activeTabId === null ? (
          <NoteEditor noteId={noteId} />
        ) : (
          <ArtifactView
            noteId={noteId}
            tab={activeTab}
            code={code}
            uiType={uiType}
            explanation={explanation}
            isAwaitingFirstContent={isAwaitingFirstContent}
            isApplyingEdit={isApplyingEdit}
            isLoading={isLoading}
            onRetry={handleRetry}
            onCancel={cancelError}
          />
        )}
      </div>
      <ArtifactComposer
        noteId={noteId}
        generate={generate}
        editTab={editTab}
        isLoading={isLoading}
        error={error}
      />
    </div>
  )
}
