import { useNotesStore } from '@/store/useNotesStore'
import { useGenerativeUI } from '@/hooks/useGenerativeUI'
import { useGenerativeDynamicUI } from '@/hooks/useGenerativeDynamicUI'
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
  const { partialUI, generate, retry, cancelError, isLoading, error } = useGenerativeUI(noteId)
  const {
    generate: generateDynamic,
    cancelError: cancelDynamicError,
    isLoading: isDynamicLoading,
    error: dynamicError,
  } = useGenerativeDynamicUI(noteId)
  const activeTab = note?.tabs.find((tab) => tab.id === note.activeTabId)
  const combinedIsLoading = isLoading || isDynamicLoading
  const isAnyBusy = combinedIsLoading
  const isStreamingActiveTab = combinedIsLoading && activeTab?.status === 'streaming'
  const isBranchStreamingActiveTab = !!activeTab && isStreamingActiveTab && activeTab.mode !== 'edit'
  const isApplyingEdit = !!activeTab && isStreamingActiveTab && activeTab.mode === 'edit'
  const throttledPartial = useThrottledValue(partialUI, THROTTLE_MS, !isLoading)

  const code =
    isBranchStreamingActiveTab && !isDynamicLoading ? throttledPartial?.code : activeTab?.code
  const uiType =
    isBranchStreamingActiveTab && !isDynamicLoading ? throttledPartial?.ui_type : activeTab?.uiType
  const explanation =
    isBranchStreamingActiveTab && !isDynamicLoading
      ? throttledPartial?.explanation
      : activeTab?.explanation
  const isAwaitingFirstContent = isBranchStreamingActiveTab && !code

  if (!note) return null

  const handleRetry = (tab: GeneratedUITab): void => {
    retry(tab.id, note.content, tab.direction, tab.previousCode, tab.mode)
  }

  const handleCancel = (tab: GeneratedUITab): void => {
    cancelError(tab)
    cancelDynamicError(tab)
  }

  return (
    <div
      className={`flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white transition-[box-shadow] duration-500 ${isAnyBusy ? 'animate-[pulse-glow_2s_ease-in-out_infinite]' : 'shadow-[0_4px_24px_rgba(0,0,0,0.07)]'}`}
    >
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
            isLoading={combinedIsLoading}
            onRetry={handleRetry}
            onCancel={handleCancel}
          />
        )}
      </div>
      <ArtifactComposer
        noteId={noteId}
        generate={generate}
        generateDynamic={generateDynamic}
        isLoading={combinedIsLoading}
        error={error ?? dynamicError}
      />
    </div>
  )
}
