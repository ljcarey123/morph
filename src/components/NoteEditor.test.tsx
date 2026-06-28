import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useNotesStore } from '@/store/useNotesStore'
import { NoteEditor } from './NoteEditor'

describe('NoteEditor', () => {
  beforeEach(() => {
    useNotesStore.setState({
      notes: {
        a: {
          id: 'a',
          title: 'First',
          content: 'hello',
          createdAt: 1,
          updatedAt: 1,
          tabs: [],
          activeTabId: null,
          suggestedOptions: [],
        },
      },
      activeNoteId: 'a',
      userApiKey: null,
    })
    localStorage.clear()
  })

  it('renders nothing when the note does not exist', () => {
    useNotesStore.setState({ activeNoteId: 'missing' })
    const { container } = render(<NoteEditor noteId="missing" />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders the note title and textarea content', () => {
    render(<NoteEditor noteId="a" />)

    expect(screen.getByDisplayValue('First')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Write your note…')).toHaveValue('hello')
  })

  it('updates the note title when edited', async () => {
    const user = userEvent.setup()
    render(<NoteEditor noteId="a" />)

    const titleInput = screen.getByDisplayValue('First')
    await user.clear(titleInput)
    await user.type(titleInput, 'Renamed')

    expect(useNotesStore.getState().notes.a?.title).toBe('Renamed')
  })

  it('resets an emptied title to Untitled note on blur', async () => {
    const user = userEvent.setup()
    render(<NoteEditor noteId="a" />)

    const titleInput = screen.getByDisplayValue('First')
    await user.clear(titleInput)
    await user.tab()

    expect(useNotesStore.getState().notes.a?.title).toBe('Untitled note')
  })

  it('updates note content when typing in the textarea', async () => {
    const user = userEvent.setup()
    render(<NoteEditor noteId="a" />)

    await user.type(screen.getByPlaceholderText('Write your note…'), '!')

    expect(useNotesStore.getState().notes.a?.content).toBe('hello!')
  })
})
