import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useNotesStore } from '@/store/useNotesStore'
import { useGenerativeUI } from './useGenerativeUI'

const submit = vi.fn()
let capturedOnFinish: (args: { object: unknown }) => void = () => undefined

vi.mock('@ai-sdk/react', () => ({
  experimental_useObject: vi.fn((options: { onFinish: (args: { object: unknown }) => void }) => {
    capturedOnFinish = options.onFinish
    return { object: undefined, submit, isLoading: false, error: undefined }
  }),
}))

describe('useGenerativeUI', () => {
  let noteId: string
  let tabId: string

  beforeEach(() => {
    useNotesStore.setState({ notes: {}, activeNoteId: null, userApiKey: 'test-key' })
    localStorage.clear()
    submit.mockReset()

    noteId = useNotesStore.getState().createNote()
    tabId = useNotesStore.getState().addPendingTab(noteId, 'Timeline')
    useNotesStore.getState().patchGeneratedTab(noteId, tabId, {
      code: '<div id="header"><h1>Old</h1></div>',
      uiType: 'html_snippet',
      status: 'done',
    })
  })

  it('patches the active tab in place when the response is a target_id/replacement_html patch', () => {
    const { result } = renderHook(() => useGenerativeUI(noteId))

    act(() => {
      result.current.editTab(
        tabId,
        'note body',
        'make the header bigger',
        '<div id="header"><h1>Old</h1></div>',
      )
    })
    act(() => {
      capturedOnFinish({
        object: {
          explanation: 'Made the header bigger',
          target_id: 'header',
          replacement_html: '<div id="header"><h1>Big</h1></div>',
          suggested_actions: [],
        },
      })
    })

    const tab = useNotesStore.getState().notes[noteId]?.tabs[0]
    expect(tab?.code).toBe('<div id="header"><h1>Big</h1></div>')
    expect(tab?.uiType).toBe('html_snippet')
    expect(tab?.explanation).toBe('Made the header bigger')
    expect(tab?.status).toBe('done')
  })

  it('marks the tab as errored when the patch target id cannot be found', () => {
    const { result } = renderHook(() => useGenerativeUI(noteId))

    act(() => {
      result.current.editTab(tabId, 'note body', 'tweak it', '<div id="header"></div>')
    })
    act(() => {
      capturedOnFinish({
        object: {
          explanation: 'irrelevant',
          target_id: 'missing-id',
          replacement_html: '<div id="missing-id"></div>',
          suggested_actions: [],
        },
      })
    })

    const tab = useNotesStore.getState().notes[noteId]?.tabs[0]
    expect(tab?.status).toBe('error')
    expect(tab?.error).toContain('Could not find an element with id "missing-id"')
    expect(tab?.code).toBe('<div id="header"><h1>Old</h1></div>')
  })

  it('still applies a full-document response as before', () => {
    const { result } = renderHook(() => useGenerativeUI(noteId))

    act(() => {
      result.current.editTab(tabId, 'note body', 'redo everything', '<div id="header"></div>')
    })
    act(() => {
      capturedOnFinish({
        object: {
          explanation: 'redone',
          ui_type: 'svg_diagram',
          code: '<svg></svg>',
          suggested_actions: ['a'],
        },
      })
    })

    const tab = useNotesStore.getState().notes[noteId]?.tabs[0]
    expect(tab?.code).toBe('<svg></svg>')
    expect(tab?.uiType).toBe('svg_diagram')
    expect(tab?.explanation).toBe('redone')
    expect(tab?.suggestedActions).toEqual(['a'])
    expect(tab?.status).toBe('done')
  })

  it('marks the tab as errored with a clear message when the response matches neither shape', () => {
    const { result } = renderHook(() => useGenerativeUI(noteId))

    act(() => {
      result.current.editTab(tabId, 'note body', 'add a big new section', '<div id="card"></div>')
    })
    act(() => {
      capturedOnFinish({
        object: {
          explanation: 'A long description of an intended change, not an error message.',
          ui_type: 'html_snippet',
          target_id: 'card',
          suggested_actions: [],
        },
      })
    })

    const tab = useNotesStore.getState().notes[noteId]?.tabs[0]
    expect(tab?.status).toBe('error')
    expect(tab?.error).toBe('The model returned an incomplete response — try again.')
    expect(tab?.explanation).not.toContain('A long description of an intended change')
    expect(tab?.code).toBe('<div id="header"><h1>Old</h1></div>')
  })

  it('cancelError reverts an errored edit to done and clears the error, keeping the prior code', () => {
    const { result } = renderHook(() => useGenerativeUI(noteId))

    act(() => {
      result.current.editTab(tabId, 'note body', 'tweak it', '<div id="header"></div>')
    })
    act(() => {
      capturedOnFinish({
        object: {
          explanation: 'irrelevant',
          target_id: 'missing-id',
          replacement_html: '<div id="missing-id"></div>',
          suggested_actions: [],
        },
      })
    })

    const erroredTab = useNotesStore.getState().notes[noteId]?.tabs[0]
    expect(erroredTab?.status).toBe('error')

    act(() => {
      if (!erroredTab) throw new Error('expected tab to exist')
      result.current.cancelError(erroredTab)
    })

    const tab = useNotesStore.getState().notes[noteId]?.tabs[0]
    expect(tab?.status).toBe('done')
    expect(tab?.error).toBeUndefined()
    expect(tab?.code).toBe('<div id="header"><h1>Old</h1></div>')
  })

  it('cancelError removes the tab entirely when there is no previous content to fall back to', () => {
    const newTabId = useNotesStore.getState().addPendingTab(noteId, 'Brand new')
    useNotesStore.getState().patchGeneratedTab(noteId, newTabId, {
      error: 'The model returned an incomplete response — try again.',
      status: 'error',
    })
    const { result } = renderHook(() => useGenerativeUI(noteId))
    const tab = useNotesStore.getState().notes[noteId]?.tabs.find((t) => t.id === newTabId)

    act(() => {
      if (!tab) throw new Error('expected tab to exist')
      result.current.cancelError(tab)
    })

    expect(useNotesStore.getState().notes[noteId]?.tabs.some((t) => t.id === newTabId)).toBe(false)
  })

  it('forwards the stored tab mode when retrying, so a retried edit can still patch', () => {
    useNotesStore.getState().patchGeneratedTab(noteId, tabId, { mode: 'edit' })
    const { result } = renderHook(() => useGenerativeUI(noteId))

    act(() => {
      result.current.retry(tabId, 'note body', 'tweak it', '<div id="header"></div>', 'edit')
    })

    expect(submit).toHaveBeenCalledWith({
      content: 'note body',
      direction: 'tweak it',
      previousCode: '<div id="header"></div>',
      mode: 'edit',
    })

    act(() => {
      capturedOnFinish({
        object: {
          explanation: 'fixed',
          target_id: 'header',
          replacement_html: '<div id="header"><h1>Fixed</h1></div>',
          suggested_actions: [],
        },
      })
    })

    const tab = useNotesStore.getState().notes[noteId]?.tabs[0]
    expect(tab?.code).toBe('<div id="header"><h1>Fixed</h1></div>')
  })
})
