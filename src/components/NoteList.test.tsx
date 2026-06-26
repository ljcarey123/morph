import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useNotesStore } from '@/store/useNotesStore'
import { NoteList } from './NoteList'

describe('NoteList', () => {
  beforeEach(() => {
    useNotesStore.setState({ notes: {}, activeNoteId: null, userApiKey: null })
    localStorage.clear()
  })

  it('renders one item per note', () => {
    useNotesStore.setState({
      notes: {
        a: {
          id: 'a',
          title: 'First',
          content: '',
          createdAt: 1,
          updatedAt: 1,
          tabs: [],
          activeTabId: null,
          suggestedOptions: [],
        },
        b: {
          id: 'b',
          title: 'Second',
          content: '',
          createdAt: 2,
          updatedAt: 2,
          tabs: [],
          activeTabId: null,
          suggestedOptions: [],
        },
      },
    })

    render(<NoteList />)

    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByText('Second')).toBeInTheDocument()
  })

  it('creates a new note when "+ New note" is clicked', async () => {
    const user = userEvent.setup()
    render(<NoteList />)

    await user.click(screen.getByRole('button', { name: '+ New note' }))

    expect(Object.keys(useNotesStore.getState().notes)).toHaveLength(1)
  })

  it('sets the active note when a title is clicked', async () => {
    useNotesStore.setState({
      notes: {
        a: {
          id: 'a',
          title: 'First',
          content: '',
          createdAt: 1,
          updatedAt: 1,
          tabs: [],
          activeTabId: null,
          suggestedOptions: [],
        },
      },
    })
    const user = userEvent.setup()
    render(<NoteList />)

    await user.click(screen.getByText('First'))

    expect(useNotesStore.getState().activeNoteId).toBe('a')
  })

  it('deletes a note when its delete button is clicked', async () => {
    useNotesStore.setState({
      notes: {
        a: {
          id: 'a',
          title: 'First',
          content: '',
          createdAt: 1,
          updatedAt: 1,
          tabs: [],
          activeTabId: null,
          suggestedOptions: [],
        },
      },
    })
    const user = userEvent.setup()
    render(<NoteList />)

    await user.click(screen.getByRole('button', { name: 'Delete First' }))

    expect(useNotesStore.getState().notes).toEqual({})
  })
})
