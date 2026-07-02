import type { SuggestOptions } from '@/schemas/suggestOptions'

export interface Note {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
  tabs: GeneratedUITab[]
  activeTabId: string | null
  suggestedOptions: SuggestOptions['options']
}

export interface GeneratedUITab {
  id: string
  title: string
  uiType?: 'html_snippet' | 'svg_diagram'
  code: string
  explanation: string
  suggestedActions: string[]
  direction: string
  previousCode?: string
  mode?: 'branch' | 'edit'
  generationMode?: 'static' | 'dynamic'
  createdAt: number
  status: 'streaming' | 'done' | 'error'
  error?: string
  componentState?: Record<string, string | number | boolean>
}
