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
  const isStreamingActiveTab = combinedIsLoading && activeTab?.status === 'streaming'
  const throttledPartial = useThrottledValue(partialUI, THROTTLE_MS, !isLoading)

  const code =
    isStreamingActiveTab && !isDynamicLoading ? throttledPartial?.code : activeTab?.code
  const uiType =
    isStreamingActiveTab && !isDynamicLoading ? throttledPartial?.ui_type : activeTab?.uiType
  const explanation =
    isStreamingActiveTab && !isDynamicLoading
      ? throttledPartial?.explanation
      : activeTab?.explanation
  const isAwaitingFirstContent = isStreamingActiveTab && !code

  if (!note) return null

  const handleRetry = (tab: GeneratedUITab): void => {
    if (tab.generationMode === 'dynamic') {
      void generateDynamic(note.content, tab.direction)
    } else {
      const style = tab.generationMode === 'simple' ? 'simple' : 'canvas'
      retry(tab.id, note.content, tab.direction, style)
    }
  }

  const handleCancel = (tab: GeneratedUITab): void => {
    cancelError(tab)
    cancelDynamicError(tab)
  }

  return (
    <div
      className={`flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white transition-[box-shadow] duration-500 ${combinedIsLoading ? 'animate-[pulse-glow_2s_ease-in-out_infinite]' : 'shadow-[0_4px_24px_rgba(0,0,0,0.07)]'}`}
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
            isAwaitingFirstContent={isAwaitingFirstContent ?? false}
            isApplyingEdit={false}
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
