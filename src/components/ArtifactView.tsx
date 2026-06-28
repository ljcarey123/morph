import { PreviewCanvas } from '@/components/PreviewCanvas'
import { Button } from '@/components/ui/Button'
import { Disclosure } from '@/components/ui/Disclosure'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { GeneratedUITab } from '@/types/note'

interface ArtifactViewProps {
  tab: GeneratedUITab | undefined
  code: string | undefined
  uiType: string | undefined
  explanation: string | undefined
  isAwaitingFirstContent: boolean
  isApplyingEdit: boolean
  isLoading: boolean
  onRetry: (tab: GeneratedUITab) => void
  onCancel: (tab: GeneratedUITab) => void
}

export function ArtifactView({
  tab,
  code,
  uiType,
  explanation,
  isAwaitingFirstContent,
  isApplyingEdit,
  isLoading,
  onRetry,
  onCancel,
}: ArtifactViewProps) {
  if (!tab) return null

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-w-0 items-center justify-between gap-2 border-b border-stone-800 px-4 py-2">
        <span className="flex min-w-0 items-center gap-2 truncate text-xs text-stone-400">
          {tab.title || 'Untitled view'}
          {isApplyingEdit ? <LoadingSpinner size="sm" label="Applying edit…" /> : null}
        </span>
        {explanation && tab.status !== 'error' ? (
          <Disclosure label="Details">
            <p className="text-xs text-stone-300">{explanation}</p>
          </Disclosure>
        ) : null}
      </div>
      <div className="flex-1 overflow-hidden">
        {tab.status === 'error' ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-red-400">{tab.error ?? 'Generation failed.'}</p>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  onRetry(tab)
                }}
                disabled={isLoading}
              >
                Retry
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  onCancel(tab)
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : isAwaitingFirstContent ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-stone-400">
            <LoadingSpinner size="lg" label="Generating…" />
            <p className="text-xs">Generating…</p>
          </div>
        ) : (
          <PreviewCanvas code={code} uiType={uiType} />
        )}
      </div>
    </div>
  )
}
