import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useNotesStore } from '@/store/useNotesStore'
import { ArtifactComposer } from './ArtifactComposer'

function mockFetchSequence(action: 'create' | 'edit') {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url === '/api/classify-intent') {
        return Promise.resolve(new Response(JSON.stringify({ action }), { status: 200 }))
      }
      if (url === '/api/suggest-options') {
        return Promise.resolve(new Response(JSON.stringify({ options: [] }), { status: 200 }))
      }
      throw new Error(`unexpected fetch url: ${url}`)
    }),
  )
}

describe('ArtifactComposer', () => {
  beforeEach(() => {
    useNotesStore.setState({
      notes: {
        a: {
          id: 'a',
          title: 'First',
          content: 'hello world',
          createdAt: 1,
          updatedAt: 1,
          tabs: [],
          activeTabId: null,
          suggestedOptions: [{ label: 'Timeline', description: 'A chronological view.' }],
        },
      },
      activeNoteId: 'a',
      userApiKey: 'test-key',
    })
    localStorage.clear()
    mockFetchSequence('create')
  })

  it('renders nothing when the note does not exist', () => {
    const { container } = render(
      <ArtifactComposer
        noteId="missing"
        generate={vi.fn()}
        editTab={vi.fn()}
        isLoading={false}
        error={undefined}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('fills the input without submitting when a suggestion chip is clicked', async () => {
    const generate = vi.fn()
    const user = userEvent.setup()
    render(
      <ArtifactComposer
        noteId="a"
        generate={generate}
        editTab={vi.fn()}
        isLoading={false}
        error={undefined}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Timeline' }))

    expect(screen.getByPlaceholderText(/Describe a new view/)).toHaveValue('Timeline')
    expect(generate).not.toHaveBeenCalled()
  })

  it('classifies and generates a new artifact when there is no active tab', async () => {
    const generate = vi.fn()
    const editTab = vi.fn()
    const user = userEvent.setup()
    render(
      <ArtifactComposer
        noteId="a"
        generate={generate}
        editTab={editTab}
        isLoading={false}
        error={undefined}
      />,
    )

    await user.type(screen.getByPlaceholderText(/Describe a new view/), 'Build a timeline')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => {
      expect(generate).toHaveBeenCalledWith('hello world', 'Build a timeline')
    })
    expect(editTab).not.toHaveBeenCalled()
  })

  it('routes to editTab when classified as an edit and a tab is active', async () => {
    mockFetchSequence('edit')
    const existingNote = useNotesStore.getState().notes.a
    if (!existingNote) throw new Error('expected note to exist')
    useNotesStore.setState({
      notes: {
        a: {
          ...existingNote,
          tabs: [
            {
              id: 'tab-1',
              title: 'Timeline',
              uiType: 'html_snippet',
              code: '<div></div>',
              explanation: '',
              suggestedActions: [],
              direction: 'Timeline',
              createdAt: 1,
              status: 'done',
            },
          ],
          activeTabId: 'tab-1',
        },
      },
    })
    const generate = vi.fn()
    const editTab = vi.fn()
    const user = userEvent.setup()
    render(
      <ArtifactComposer
        noteId="a"
        generate={generate}
        editTab={editTab}
        isLoading={false}
        error={undefined}
      />,
    )

    await user.type(screen.getByPlaceholderText(/Describe a new view/), 'Make it blue')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => {
      expect(editTab).toHaveBeenCalledWith('tab-1', 'hello world', 'Make it blue', '<div></div>')
    })
    expect(generate).not.toHaveBeenCalled()
  })

  it('falls back to generate when classified as an edit but no tab is active', async () => {
    mockFetchSequence('edit')
    const generate = vi.fn()
    const editTab = vi.fn()
    const user = userEvent.setup()
    render(
      <ArtifactComposer
        noteId="a"
        generate={generate}
        editTab={editTab}
        isLoading={false}
        error={undefined}
      />,
    )

    await user.type(screen.getByPlaceholderText(/Describe a new view/), 'Make it blue')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => {
      expect(generate).toHaveBeenCalledWith('hello world', 'Make it blue')
    })
    expect(editTab).not.toHaveBeenCalled()
  })

  it('submits when Enter is pressed', async () => {
    const generate = vi.fn()
    const user = userEvent.setup()
    render(
      <ArtifactComposer
        noteId="a"
        generate={generate}
        editTab={vi.fn()}
        isLoading={false}
        error={undefined}
      />,
    )

    await user.type(screen.getByPlaceholderText(/Describe a new view/), 'Build a timeline{Enter}')

    await waitFor(() => {
      expect(generate).toHaveBeenCalledWith('hello world', 'Build a timeline')
    })
  })

  it('shows the error message when present', () => {
    render(
      <ArtifactComposer
        noteId="a"
        generate={vi.fn()}
        editTab={vi.fn()}
        isLoading={false}
        error={new Error('boom')}
      />,
    )

    expect(screen.getByText('boom')).toBeInTheDocument()
  })
})
