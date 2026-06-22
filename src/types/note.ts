export interface Note {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
  tabs: GeneratedUITab[]
  activeTabId: string | null
}

export interface GeneratedUITab {
  id: string
  title: string
  uiType: 'html_snippet' | 'svg_diagram'
  code: string
  explanation: string
  suggestedActions: string[]
  direction: string
  createdAt: number
}
