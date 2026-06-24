import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useNotesStore } from '@/store/useNotesStore'
import { useGenerativeUI } from '@/hooks/useGenerativeUI'
import { useSuggestOptions } from '@/hooks/useSuggestOptions'
import { GeneratedUIPanel } from './GeneratedUIPanel'

vi.mock('@/hooks/useGenerativeUI', () => ({
  useGenerativeUI: vi.fn(),
}))

vi.mock('@/hooks/useSuggestOptions', () => ({
  useSuggestOptions: vi.fn(),
}))

const mockedUseGenerativeUI = vi.mocked(useGenerativeUI)
const mockedUseSuggestOptions = vi.mocked(useSuggestOptions)

describe('GeneratedUIPanel', () => {
  const generate = vi.fn()
  const retry = vi.fn()
  const fetchOptions = vi.fn()

  beforeEach(() => {
    useNotesStore.setState({
      notes: {
        a: {
          id: 'a',
          title: 'First',
          content: 'note body',
          createdAt: 1,
          updatedAt: 1,
          tabs: [
            {
              id: 'tab-1',
              title: 'Timeline',
              uiType: 'html_snippet',
              code: '<div>one</div>',
              explanation: 'first explanation',
              suggestedActions: ['expand'],
              direction: 'Timeline',
              createdAt: 1,
              status: 'done',
            },
          ],
          activeTabId: 'tab-1',
        },
      },
      activeNoteId: 'a',
      userApiKey: 'test-key',
    })
    localStorage.clear()

    generate.mockReset()
    retry.mockReset()
    fetchOptions.mockReset()
    mockedUseGenerativeUI.mockReturnValue({
      partialUI: undefined,
      generate,
      retry,
      isLoading: false,
      error: undefined,
    })
    mockedUseSuggestOptions.mockReturnValue({
      options: [
        { label: 'Comparison table', description: 'Side-by-side comparison.' },
        { label: 'Flowchart', description: 'A step-by-step flow.' },
      ],
      fetchOptions,
      isLoading: false,
      error: undefined,
    })
  })

  it('renders the backdrop hidden and non-interactive when closed', () => {
    const { container } = render(<GeneratedUIPanel noteId="a" isOpen={false} onClose={vi.fn()} />)

    const backdrop = container.firstChild
    expect(backdrop).toHaveAttribute('aria-hidden', 'true')
    expect(backdrop).toHaveClass('pointer-events-none', 'opacity-0')
  })

  it('fetches suggestions and shows the active tab in the history rail', async () => {
    render(<GeneratedUIPanel noteId="a" isOpen onClose={vi.fn()} />)

    await waitFor(() => {
      expect(fetchOptions).toHaveBeenCalledWith('note body')
    })
    expect(screen.getAllByText('Timeline').length).toBeGreaterThan(0)
    expect(screen.getByText('Comparison table')).toBeInTheDocument()
    expect(screen.getByText('Flowchart')).toBeInTheDocument()
  })

  it('hides the explanation and suggested actions until Details is expanded', async () => {
    const user = userEvent.setup()
    render(<GeneratedUIPanel noteId="a" isOpen onClose={vi.fn()} />)

    expect(screen.queryByText('first explanation')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Details/ }))

    expect(screen.getByText('first explanation')).toBeInTheDocument()
    expect(screen.getByText('expand')).toBeInTheDocument()
  })

  it('switches the active tab when a history row is clicked', async () => {
    const note = useNotesStore.getState().notes.a
    if (!note) throw new Error('expected note a to exist')
    useNotesStore.setState({
      notes: {
        a: {
          ...note,
          tabs: [
            ...note.tabs,
            {
              id: 'tab-2',
              title: 'Mind map',
              uiType: 'svg_diagram',
              code: '<svg>two</svg>',
              explanation: 'second explanation',
              suggestedActions: [],
              direction: 'Mind map',
              createdAt: 2,
              status: 'done',
            },
          ],
        },
      },
    })
    const user = userEvent.setup()
    render(<GeneratedUIPanel noteId="a" isOpen onClose={vi.fn()} />)

    const tabButton = screen.getByText('Mind map').closest('button')
    if (!tabButton) throw new Error('expected tab button')
    await user.click(tabButton)

    expect(useNotesStore.getState().notes.a?.activeTabId).toBe('tab-2')
  })

  it('shows a streaming tab with a loading indicator and lets you click it to view it', async () => {
    const note = useNotesStore.getState().notes.a
    if (!note) throw new Error('expected note a to exist')
    useNotesStore.setState({
      notes: {
        a: {
          ...note,
          tabs: [
            ...note.tabs,
            {
              id: 'tab-2',
              title: 'Mind map',
              code: '',
              explanation: '',
              suggestedActions: [],
              direction: 'Mind map',
              createdAt: 2,
              status: 'streaming',
            },
          ],
          activeTabId: 'tab-2',
        },
      },
    })
    mockedUseGenerativeUI.mockReturnValue({
      partialUI: { code: '<p>partial</p>' },
      generate,
      retry,
      isLoading: true,
      error: undefined,
    })
    const user = userEvent.setup()
    render(<GeneratedUIPanel noteId="a" isOpen onClose={vi.fn()} />)

    const streamingRow = screen
      .getAllByText('Mind map')
      .map((el) => el.closest('button'))
      .find((button): button is HTMLButtonElement => button !== null)
    if (!streamingRow) throw new Error('expected streaming tab button')
    expect(streamingRow.querySelector('.animate-pulse')).toBeInTheDocument()

    await user.click(streamingRow)

    expect(useNotesStore.getState().notes.a?.activeTabId).toBe('tab-2')
  })

  it('deletes a tab when its delete button is clicked', async () => {
    const user = userEvent.setup()
    render(<GeneratedUIPanel noteId="a" isOpen onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Delete Timeline' }))

    expect(useNotesStore.getState().notes.a?.tabs).toHaveLength(0)
  })

  it('shows a retry button for a failed tab and retries with the original request', async () => {
    const note = useNotesStore.getState().notes.a
    if (!note) throw new Error('expected note a to exist')
    useNotesStore.setState({
      notes: {
        a: {
          ...note,
          tabs: [
            ...note.tabs,
            {
              id: 'tab-2',
              title: 'Mind map',
              code: '',
              explanation: 'Missing x-user-api-key header',
              suggestedActions: [],
              direction: 'Mind map',
              previousCode: '<div>one</div>',
              createdAt: 2,
              status: 'error',
            },
          ],
          activeTabId: 'tab-2',
        },
      },
    })
    const user = userEvent.setup()
    render(<GeneratedUIPanel noteId="a" isOpen onClose={vi.fn()} />)

    expect(screen.getByText('Missing x-user-api-key header')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(retry).toHaveBeenCalledWith('tab-2', 'note body', 'Mind map', '<div>one</div>')
  })

  it('calls generate with the note content, direction, and active tab code when a suggestion is picked', async () => {
    const user = userEvent.setup()
    render(<GeneratedUIPanel noteId="a" isOpen onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Comparison table' }))

    expect(generate).toHaveBeenCalledWith('note body', 'Comparison table', '<div>one</div>')
  })

  it('calls generate with free text when typed and submitted', async () => {
    const user = userEvent.setup()
    render(<GeneratedUIPanel noteId="a" isOpen onClose={vi.fn()} />)

    await user.type(screen.getByPlaceholderText('Or describe what you want…'), 'Make it blue')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(generate).toHaveBeenCalledWith('note body', 'Make it blue', '<div>one</div>')
  })

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<GeneratedUIPanel noteId="a" isOpen onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalled()
  })
})
