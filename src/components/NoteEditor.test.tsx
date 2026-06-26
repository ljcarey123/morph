import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useNotesStore } from '@/store/useNotesStore'
import { GeneratedUIPanel } from '@/components/GeneratedUIPanel'
import { NoteEditor } from './NoteEditor'

vi.mock('@/components/GeneratedUIPanel', () => ({
  GeneratedUIPanel: vi.fn(() => null),
}))

const mockedGeneratedUIPanel = vi.mocked(GeneratedUIPanel)

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
    mockedGeneratedUIPanel.mockClear()
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

  it('disables Generate when the note has no content', () => {
    useNotesStore.setState({
      notes: {
        a: {
          id: 'a',
          title: 'First',
          content: '   ',
          createdAt: 1,
          updatedAt: 1,
          tabs: [],
          activeTabId: null,
          suggestedOptions: [],
        },
      },
    })
    render(<NoteEditor noteId="a" />)

    expect(screen.getByRole('button', { name: 'Generate' })).toBeDisabled()
  })

  it('opens the generated UI panel when Generate is clicked', async () => {
    const user = userEvent.setup()
    render(<NoteEditor noteId="a" />)

    expect(mockedGeneratedUIPanel.mock.calls.at(-1)?.[0]).toMatchObject({ isOpen: false })

    await user.click(screen.getByRole('button', { name: 'Generate' }))

    expect(mockedGeneratedUIPanel.mock.calls.at(-1)?.[0]).toMatchObject({ isOpen: true })
  })

  it('updates note content when typing in the textarea', async () => {
    const user = userEvent.setup()
    render(<NoteEditor noteId="a" />)

    await user.type(screen.getByPlaceholderText('Write your note…'), '!')

    expect(useNotesStore.getState().notes.a?.content).toBe('hello!')
  })
})
