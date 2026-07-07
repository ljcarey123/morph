import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useNotesStore } from '@/store/useNotesStore'
import { useGenerativeUI } from './useGenerativeUI'

const submit = vi.fn()
let capturedOnFinish: (args: { object: unknown; error?: Error }) => void = () => undefined

vi.mock('@ai-sdk/react', () => ({
  experimental_useObject: vi.fn(
    (options: { onFinish: (args: { object: unknown; error?: Error }) => void }) => {
      capturedOnFinish = options.onFinish
      return { object: undefined, submit, isLoading: false, error: undefined }
    },
  ),
}))

describe('useGenerativeUI', () => {
  let noteId: string

  beforeEach(() => {
    useNotesStore.setState({ notes: {}, activeNoteId: null, userApiKey: 'test-key', noteOrder: [] })
    localStorage.clear()
    submit.mockReset()
    noteId = useNotesStore.getState().createNote()
  })

  it('generate submits with the given style and creates a pending tab', () => {
    const { result } = renderHook(() => useGenerativeUI(noteId))

    act(() => {
      result.current.generate('note body', 'Timeline', 'canvas')
    })

    expect(submit).toHaveBeenCalledWith({ content: 'note body', direction: 'Timeline', style: 'canvas' })
    const note = useNotesStore.getState().notes[noteId]
    expect(note?.tabs[0]?.status).toBe('streaming')
    expect(note?.tabs[0]?.direction).toBe('Timeline')
  })

  it('generate defaults to canvas style when style is omitted', () => {
    const { result } = renderHook(() => useGenerativeUI(noteId))

    act(() => {
      result.current.generate('note body', 'Map')
    })

    expect(submit).toHaveBeenCalledWith({ content: 'note body', direction: 'Map', style: 'canvas' })
  })

  it('onFinish with code patches the tab as done with the correct generationMode', () => {
    const { result } = renderHook(() => useGenerativeUI(noteId))

    act(() => { result.current.generate('note body', 'Timeline', 'simple') })
    act(() => {
      capturedOnFinish({
        object: {
          ui_type: 'html_snippet',
          code: '<div id="view-root"><h1>Timeline</h1></div>',
          explanation: 'A timeline.',
          suggested_actions: ['Add more events'],
        },
      })
    })

    const tab = useNotesStore.getState().notes[noteId]?.tabs[0]
    expect(tab?.status).toBe('done')
    expect(tab?.code).toContain('Timeline')
    expect(tab?.generationMode).toBe('simple')
    expect(tab?.explanation).toBe('A timeline.')
  })

  it('onFinish with canvas style stores generationMode as canvas', () => {
    const { result } = renderHook(() => useGenerativeUI(noteId))

    act(() => { result.current.generate('note body', 'Diagram', 'canvas') })
    act(() => {
      capturedOnFinish({
        object: {
          ui_type: 'html_snippet',
          code: '<div id="view-root"></div>',
          explanation: 'A diagram.',
          suggested_actions: [],
        },
      })
    })

    expect(useNotesStore.getState().notes[noteId]?.tabs[0]?.generationMode).toBe('canvas')
  })

  it('onFinish marks error when code is missing from the response', () => {
    const { result } = renderHook(() => useGenerativeUI(noteId))

    act(() => { result.current.generate('note body', 'Timeline', 'canvas') })
    act(() => {
      capturedOnFinish({
        object: { explanation: 'Oops, no code here.', suggested_actions: [] },
      })
    })

    const tab = useNotesStore.getState().notes[noteId]?.tabs[0]
    expect(tab?.status).toBe('error')
    expect(tab?.error).toContain('incomplete response')
  })

  it('cancelError reverts an errored tab to done when there is prior code', () => {
    const tabId = useNotesStore.getState().addPendingTab(noteId, 'Timeline')
    useNotesStore.getState().patchGeneratedTab(noteId, tabId, {
      code: '<div id="view-root"></div>',
      status: 'done',
    })
    useNotesStore.getState().patchGeneratedTab(noteId, tabId, {
      status: 'error',
      error: 'Something went wrong',
    })

    const { result } = renderHook(() => useGenerativeUI(noteId))
    const tab = useNotesStore.getState().notes[noteId]?.tabs.find((t) => t.id === tabId)!

    act(() => { result.current.cancelError(tab) })

    const updated = useNotesStore.getState().notes[noteId]?.tabs.find((t) => t.id === tabId)
    expect(updated?.status).toBe('done')
    expect(updated?.error).toBeUndefined()
  })

  it('cancelError removes the tab entirely when there is no code', () => {
    const tabId = useNotesStore.getState().addPendingTab(noteId, 'Brand new')
    useNotesStore.getState().patchGeneratedTab(noteId, tabId, {
      error: 'The model returned an incomplete response — try again.',
      status: 'error',
    })

    const { result } = renderHook(() => useGenerativeUI(noteId))
    const tab = useNotesStore.getState().notes[noteId]?.tabs.find((t) => t.id === tabId)!

    act(() => { result.current.cancelError(tab) })

    expect(useNotesStore.getState().notes[noteId]?.tabs.some((t) => t.id === tabId)).toBe(false)
  })

  it('retry resubmits with the given style and resets the tab to streaming', () => {
    const tabId = useNotesStore.getState().addPendingTab(noteId, 'Timeline')
    useNotesStore.getState().patchGeneratedTab(noteId, tabId, {
      code: '<div></div>',
      status: 'error',
    })

    const { result } = renderHook(() => useGenerativeUI(noteId))

    act(() => { result.current.retry(tabId, 'note body', 'Timeline', 'simple') })

    expect(submit).toHaveBeenCalledWith({ content: 'note body', direction: 'Timeline', style: 'simple' })
    const tab = useNotesStore.getState().notes[noteId]?.tabs.find((t) => t.id === tabId)
    expect(tab?.status).toBe('streaming')
  })
})
