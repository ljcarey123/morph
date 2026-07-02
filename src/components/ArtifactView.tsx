import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { PreviewCanvas } from '@/components/PreviewCanvas'
import { Button } from '@/components/ui/Button'
import { Disclosure } from '@/components/ui/Disclosure'
import type { GeneratedUITab } from '@/types/note'

interface ArtifactViewProps {
  noteId: string
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

function GrowthIndicator() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <span
          className="absolute inset-0 m-auto h-24 w-24 animate-ping rounded-full bg-violet-400/10"
          style={{ animationDuration: '2.2s', animationDelay: '0.6s' }}
        />
        <span
          className="absolute inset-0 m-auto h-14 w-14 animate-ping rounded-full bg-violet-400/15"
          style={{ animationDuration: '2.2s', animationDelay: '0.3s' }}
        />
        <span className="h-5 w-5 animate-pulse rounded-full bg-violet-500 shadow-[0_0_24px_rgba(139,92,246,0.5)]" />
      </div>
      <p className="tracking-[0.25em] text-xs uppercase text-slate-400">Growing</p>
    </div>
  )
}

function ExpandIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2 5V2h3M12 5V2H9M2 9v3h3M12 9v3H9" />
    </svg>
  )
}

function CollapseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M5 2v3H2M9 2v3h3M5 12V9H2M9 12V9h3" />
    </svg>
  )
}

export function ArtifactView({
  noteId,
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
  // Store which tab id is expanded rather than a bare boolean so switching
  // tabs naturally collapses the overlay without needing a setState-in-effect.
  const [expandedTabId, setExpandedTabId] = useState<string | null>(null)
  const isExpanded = expandedTabId === tab?.id

  // Increment to force the in-flow div to remount (and replay grow-in) when
  // the fullscreen overlay closes.
  const [inFlowKey, setInFlowKey] = useState(0)
  const wasExpandedRef = useRef(false)
  useEffect(() => {
    if (wasExpandedRef.current && !isExpanded) {
      setInFlowKey((k) => k + 1)
    }
    wasExpandedRef.current = isExpanded
  }, [isExpanded])

  useEffect(() => {
    if (!isExpanded) return
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setExpandedTabId(null)
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('keydown', handleKey)
    }
  }, [isExpanded])

  if (!tab) return null

  const canExpand = tab.status !== 'error' && Boolean(code)

  const headerContent = (expanded: boolean) => (
    <div className="flex min-w-0 items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
      <span className="flex min-w-0 items-center gap-2 text-xs text-slate-500">
        <span className="truncate font-medium text-slate-700">{tab.title || 'Untitled view'}</span>
        {isApplyingEdit ? (
          <span className="flex shrink-0 items-center gap-1.5 text-violet-500">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-500" />
            Applying…
          </span>
        ) : null}
      </span>
      <div className="flex shrink-0 items-center gap-1">
        {tab.status !== 'error' ? (
          <Disclosure label="Details">
            <div className="mb-3 flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                tab.generationMode === 'dynamic'
                  ? 'bg-violet-100 text-violet-600'
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {tab.generationMode === 'dynamic' ? 'Dashboard' : 'Canvas'}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-400">
                {tab.uiType === 'svg_diagram' ? 'SVG' : 'HTML'}
              </span>
            </div>
            {explanation ? (
              <p className="break-words text-xs leading-relaxed text-slate-600">{explanation}</p>
            ) : (
              <p className="text-xs italic text-slate-400">No description</p>
            )}
          </Disclosure>
        ) : null}
        {canExpand ? (
          <button
            type="button"
            onClick={() => { setExpandedTabId(expanded ? null : tab.id) }}
            title={expanded ? 'Collapse (Esc)' : 'Expand to full page'}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            {expanded ? <CollapseIcon /> : <ExpandIcon />}
          </button>
        ) : null}
      </div>
    </div>
  )

  const canvasContent = (
    <div
      key={tab.id}
      className={`flex-1 overflow-hidden transition-shadow duration-700 ${
        isLoading && !isAwaitingFirstContent ? 'animate-[pulse-glow_1.8s_ease-in-out_infinite]' : ''
      }`}
    >
      {tab.status === 'error' ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-sm text-red-500">{tab.error ?? 'Generation failed.'}</p>
          <div className="flex gap-2">
            <Button onClick={() => { onRetry(tab) }} disabled={isLoading}>Retry</Button>
            <Button variant="ghost" onClick={() => { onCancel(tab) }} disabled={isLoading}>Cancel</Button>
          </div>
        </div>
      ) : isAwaitingFirstContent ? (
        <GrowthIndicator />
      ) : (
        <PreviewCanvas noteId={noteId} tabId={tab.id} code={code} uiType={uiType} />
      )}
    </div>
  )

  return (
    <>
      {/* Normal (in-flow) view — key increments on fullscreen exit to replay grow-in */}
      <div key={inFlowKey} className="flex h-full flex-col animate-[grow-in_500ms_cubic-bezier(0.34,1.56,0.64,1)_both]">
        {headerContent(false)}
        {isExpanded ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-xs text-slate-400">
            <span>Expanded</span>
            <kbd className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">Esc</kbd>
            <span>to collapse</span>
          </div>
        ) : (
          canvasContent
        )}
      </div>

      {/* Full-page overlay via portal */}
      {isExpanded
        ? createPortal(
            <div className="fixed inset-0 z-50 flex flex-col bg-white animate-[grow-in_280ms_cubic-bezier(0.34,1.4,0.64,1)_both]">
              {headerContent(true)}
              {canvasContent}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
