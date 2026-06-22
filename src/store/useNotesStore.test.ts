import { beforeEach, describe, expect, it } from 'vitest'
import { useNotesStore } from './useNotesStore'

describe('useNotesStore', () => {
  beforeEach(() => {
    useNotesStore.setState({ notes: {}, activeNoteId: null, userApiKey: null })
    localStorage.clear()
  })

  it('creates a note, makes it active, and returns its id', () => {
    const id = useNotesStore.getState().createNote()

    const state = useNotesStore.getState()
    expect(state.notes[id]).toMatchObject({ id, title: 'Untitled note', content: '' })
    expect(state.activeNoteId).toBe(id)
  })

  it('updates note content and bumps updatedAt', () => {
    const id = useNotesStore.getState().createNote()
    const createdAt = useNotesStore.getState().notes[id]?.updatedAt

    useNotesStore.getState().updateNoteContent(id, 'hello world')

    const note = useNotesStore.getState().notes[id]
    expect(note?.content).toBe('hello world')
    expect(note?.updatedAt).toBeGreaterThanOrEqual(createdAt ?? 0)
  })

  it('does nothing when updating content for a note that does not exist', () => {
    useNotesStore.getState().updateNoteContent('missing-id', 'hello')

    expect(useNotesStore.getState().notes).toEqual({})
  })

  it('deletes a note and clears activeNoteId if it was the active one', () => {
    const id = useNotesStore.getState().createNote()

    useNotesStore.getState().deleteNote(id)

    const state = useNotesStore.getState()
    expect(state.notes[id]).toBeUndefined()
    expect(state.activeNoteId).toBeNull()
  })

  it('deletes a note without touching activeNoteId when a different note is active', () => {
    const firstId = useNotesStore.getState().createNote()
    const secondId = useNotesStore.getState().createNote()
    useNotesStore.getState().setActiveNoteId(firstId)

    useNotesStore.getState().deleteNote(secondId)

    const state = useNotesStore.getState()
    expect(state.notes[secondId]).toBeUndefined()
    expect(state.activeNoteId).toBe(firstId)
  })

  it('sets and clears the user API key', () => {
    useNotesStore.getState().setApiKey('test-key')
    expect(useNotesStore.getState().userApiKey).toBe('test-key')

    useNotesStore.getState().setApiKey(null)
    expect(useNotesStore.getState().userApiKey).toBeNull()
  })

  it('appends a generated tab to the matching note and makes it active', () => {
    const id = useNotesStore.getState().createNote()

    useNotesStore.getState().addGeneratedTab(id, {
      title: 'Timeline',
      uiType: 'html_snippet',
      code: '<div></div>',
      explanation: 'because',
      suggestedActions: ['a', 'b'],
      direction: 'Timeline',
    })

    const note = useNotesStore.getState().notes[id]
    expect(note?.tabs).toHaveLength(1)
    expect(note?.tabs[0]).toMatchObject({
      title: 'Timeline',
      uiType: 'html_snippet',
      code: '<div></div>',
      explanation: 'because',
      suggestedActions: ['a', 'b'],
      direction: 'Timeline',
    })
    expect(note?.activeTabId).toBe(note?.tabs[0]?.id)
  })

  it('does nothing when adding a generated tab to a note that does not exist', () => {
    useNotesStore.getState().addGeneratedTab('missing-id', {
      title: 'Timeline',
      uiType: 'html_snippet',
      code: '<div></div>',
      explanation: 'because',
      suggestedActions: [],
      direction: 'Timeline',
    })

    expect(useNotesStore.getState().notes).toEqual({})
  })

  it('switches the active tab for a note', () => {
    const id = useNotesStore.getState().createNote()
    useNotesStore.getState().addGeneratedTab(id, {
      title: 'Timeline',
      uiType: 'html_snippet',
      code: '<div></div>',
      explanation: 'because',
      suggestedActions: [],
      direction: 'Timeline',
    })
    useNotesStore.getState().addGeneratedTab(id, {
      title: 'Mind map',
      uiType: 'svg_diagram',
      code: '<svg></svg>',
      explanation: 'because',
      suggestedActions: [],
      direction: 'Mind map',
    })
    const [firstTab] = useNotesStore.getState().notes[id]?.tabs ?? []

    useNotesStore.getState().setActiveTabId(id, firstTab?.id ?? '')

    expect(useNotesStore.getState().notes[id]?.activeTabId).toBe(firstTab?.id)
  })

  it('does nothing when setting the active tab for a note that does not exist', () => {
    useNotesStore.getState().setActiveTabId('missing-id', 'tab-id')

    expect(useNotesStore.getState().notes).toEqual({})
  })
})
