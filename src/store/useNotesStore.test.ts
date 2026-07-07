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

  it('updates the note title and bumps updatedAt', () => {
    const id = useNotesStore.getState().createNote()
    const createdAt = useNotesStore.getState().notes[id]?.updatedAt

    useNotesStore.getState().updateNoteTitle(id, 'My note')

    const note = useNotesStore.getState().notes[id]
    expect(note?.title).toBe('My note')
    expect(note?.updatedAt).toBeGreaterThanOrEqual(createdAt ?? 0)
  })

  it('does nothing when updating the title for a note that does not exist', () => {
    useNotesStore.getState().updateNoteTitle('missing-id', 'My note')

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

  it('adds a pending tab in streaming state and makes it active', () => {
    const id = useNotesStore.getState().createNote()

    const tabId = useNotesStore.getState().addPendingTab(id, 'Timeline')

    const note = useNotesStore.getState().notes[id]
    expect(note?.tabs).toHaveLength(1)
    expect(note?.tabs[0]).toMatchObject({
      id: tabId,
      title: 'Timeline',
      code: '',
      explanation: '',
      suggestedActions: [],
      direction: 'Timeline',
      status: 'streaming',
    })
    expect(note?.activeTabId).toBe(tabId)
  })

  it('does nothing when adding a pending tab to a note that does not exist', () => {
    useNotesStore.getState().addPendingTab('missing-id', 'Timeline')

    expect(useNotesStore.getState().notes).toEqual({})
  })

  it('patches a generated tab with the final result and marks it done', () => {
    const id = useNotesStore.getState().createNote()
    const tabId = useNotesStore.getState().addPendingTab(id, 'Timeline')

    useNotesStore.getState().patchGeneratedTab(id, tabId, {
      uiType: 'html_snippet',
      code: '<div></div>',
      explanation: 'because',
      suggestedActions: ['a', 'b'],
      status: 'done',
    })

    const note = useNotesStore.getState().notes[id]
    expect(note?.tabs[0]).toMatchObject({
      uiType: 'html_snippet',
      code: '<div></div>',
      explanation: 'because',
      suggestedActions: ['a', 'b'],
      status: 'done',
    })
  })

  it('does nothing when patching a tab on a note that does not exist', () => {
    useNotesStore.getState().patchGeneratedTab('missing-id', 'tab-id', { status: 'done' })

    expect(useNotesStore.getState().notes).toEqual({})
  })

  it('removes a tab and falls back to the previous tab when the active tab is removed', () => {
    const id = useNotesStore.getState().createNote()
    const firstTabId = useNotesStore.getState().addPendingTab(id, 'Timeline')
    const secondTabId = useNotesStore.getState().addPendingTab(id, 'Mind map')

    useNotesStore.getState().removeTab(id, secondTabId)

    const note = useNotesStore.getState().notes[id]
    expect(note?.tabs.map((tab) => tab.id)).toEqual([firstTabId])
    expect(note?.activeTabId).toBe(firstTabId)
  })

  it('clears activeTabId when the last remaining tab is removed', () => {
    const id = useNotesStore.getState().createNote()
    const tabId = useNotesStore.getState().addPendingTab(id, 'Timeline')

    useNotesStore.getState().removeTab(id, tabId)

    const note = useNotesStore.getState().notes[id]
    expect(note?.tabs).toEqual([])
    expect(note?.activeTabId).toBeNull()
  })

  it('does nothing when removing a tab from a note that does not exist', () => {
    useNotesStore.getState().removeTab('missing-id', 'tab-id')

    expect(useNotesStore.getState().notes).toEqual({})
  })

  it('switches the active tab for a note', () => {
    const id = useNotesStore.getState().createNote()
    useNotesStore.getState().addPendingTab(id, 'Timeline')
    useNotesStore.getState().addPendingTab(id, 'Mind map')
    const [firstTab] = useNotesStore.getState().notes[id]?.tabs ?? []

    useNotesStore.getState().setActiveTabId(id, firstTab?.id ?? '')

    expect(useNotesStore.getState().notes[id]?.activeTabId).toBe(firstTab?.id)
  })

  it('switches the active tab back to the note itself via null', () => {
    const id = useNotesStore.getState().createNote()
    const tabId = useNotesStore.getState().addPendingTab(id, 'Timeline')
    useNotesStore.getState().setActiveTabId(id, tabId)

    useNotesStore.getState().setActiveTabId(id, null)

    expect(useNotesStore.getState().notes[id]?.activeTabId).toBeNull()
  })

  it('does nothing when setting the active tab for a note that does not exist', () => {
    useNotesStore.getState().setActiveTabId('missing-id', 'tab-id')

    expect(useNotesStore.getState().notes).toEqual({})
  })

  it('sets the suggested options for a note', () => {
    const id = useNotesStore.getState().createNote()
    const options = [{ label: 'Comparison table', description: 'Side-by-side comparison.', mode: 'canvas' as const }]

    useNotesStore.getState().setSuggestedOptions(id, options)

    expect(useNotesStore.getState().notes[id]?.suggestedOptions).toEqual(options)
  })

  it('does nothing when setting suggested options for a note that does not exist', () => {
    useNotesStore.getState().setSuggestedOptions('missing-id', [])

    expect(useNotesStore.getState().notes).toEqual({})
  })
})
