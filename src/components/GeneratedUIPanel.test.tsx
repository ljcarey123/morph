import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  const editTab = vi.fn()
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
          suggestedOptions: [
            { label: 'Comparison table', description: 'Side-by-side comparison.' },
            { label: 'Flowchart', description: 'A step-by-step flow.' },
          ],
        },
      },
      activeNoteId: 'a',
      userApiKey: 'test-key',
    })
    localStorage.clear()

    generate.mockReset()
    retry.mockReset()
    editTab.mockReset()
    fetchOptions.mockReset()
    mockedUseGenerativeUI.mockReturnValue({
      partialUI: undefined,
      generate,
      retry,
      editTab,
      isLoading: false,
      error: undefined,
    })
    mockedUseSuggestOptions.mockReturnValue({
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

  it('shows cached suggestions and the active tab without re-fetching', () => {
    render(<GeneratedUIPanel noteId="a" isOpen onClose={vi.fn()} />)

    expect(screen.getAllByText('Timeline').length).toBeGreaterThan(0)
    expect(screen.getByText('Comparison table')).toBeInTheDocument()
    expect(screen.getByText('Flowchart')).toBeInTheDocument()
    expect(fetchOptions).not.toHaveBeenCalled()
  })

  it('fetches suggestions when the note has none cached yet', async () => {
    const note = useNotesStore.getState().notes.a
    if (!note) throw new Error('expected note a to exist')
    useNotesStore.setState({
      notes: { a: { ...note, suggestedOptions: [] } },
    })
    fetchOptions.mockResolvedValue([{ label: 'New idea', description: 'desc' }])

    render(<GeneratedUIPanel noteId="a" isOpen onClose={vi.fn()} />)

    await waitFor(() => {
      expect(fetchOptions).toHaveBeenCalledWith('note body')
    })
    await waitFor(() => {
      expect(screen.getByText('New idea')).toBeInTheDocument()
    })
    expect(useNotesStore.getState().notes.a?.suggestedOptions).toEqual([
      { label: 'New idea', description: 'desc' },
    ])
  })

  it('regenerates suggestions when the regenerate button is clicked, even if cached', async () => {
    fetchOptions.mockResolvedValue([{ label: 'Fresh idea', description: 'desc' }])
    const user = userEvent.setup()
    render(<GeneratedUIPanel noteId="a" isOpen onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Regenerate suggestions' }))

    expect(fetchOptions).toHaveBeenCalledWith('note body')
    await waitFor(() => {
      expect(screen.getByText('Fresh idea')).toBeInTheDocument()
    })
  })

  it('shows a loading spinner while suggestions are loading', () => {
    mockedUseSuggestOptions.mockReturnValue({ fetchOptions, isLoading: true, error: undefined })

    render(<GeneratedUIPanel noteId="a" isOpen onClose={vi.fn()} />)

    expect(screen.getByText('Thinking…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Regenerate suggestions' })).toBeDisabled()
  })

  it('shows a loading spinner in the canvas before any content has streamed in', () => {
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
      partialUI: undefined,
      generate,
      retry,
      editTab,
      isLoading: true,
      error: undefined,
    })

    render(<GeneratedUIPanel noteId="a" isOpen onClose={vi.fn()} />)

    expect(screen.getByText('Generating…')).toBeInTheDocument()
  })

  it('resizes the history rail when the divider is dragged', () => {
    render(<GeneratedUIPanel noteId="a" isOpen onClose={vi.fn()} />)

    const divider = screen.getByRole('separator', { name: 'Resize history rail' })
    const railContainer = divider.parentElement
    if (!railContainer) throw new Error('expected rail container')
    vi.spyOn(railContainer, 'getBoundingClientRect').mockReturnValue({
      left: 0,
    } as DOMRect)
    const rail = divider.previousElementSibling
    if (!rail) throw new Error('expected rail element')

    fireEvent.pointerDown(divider)
    fireEvent.pointerMove(document, { clientX: 420 })

    expect(rail).toHaveStyle({ width: '420px' })
  })

  it('hides the explanation and suggested actions until Details is expanded', async () => {
    const user = userEvent.setup()
    render(<GeneratedUIPanel noteId="a" isOpen onClose={vi.fn()} />)

    expect(screen.queryByText('first explanation')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Details/ }))

    expect(screen.getByText('first explanation')).toBeInTheDocument()
    expect(screen.getByText('expand')).toBeInTheDocument()
  })

  it('edits the active tab in place when a suggested action pill is clicked', async () => {
    const user = userEvent.setup()
    render(<GeneratedUIPanel noteId="a" isOpen onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /Details/ }))
    await user.click(screen.getByRole('button', { name: 'expand' }))

    expect(editTab).toHaveBeenCalledWith('tab-1', 'note body', 'expand', '<div>one</div>')
    expect(generate).not.toHaveBeenCalled()
    expect(useNotesStore.getState().notes.a?.tabs).toHaveLength(1)
  })

  it('edits the active tab in place when the free-text tweak box is submitted', async () => {
    const user = userEvent.setup()
    render(<GeneratedUIPanel noteId="a" isOpen onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /Details/ }))
    await user.type(screen.getByPlaceholderText('Tweak this view…'), 'Make it blue')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    expect(editTab).toHaveBeenCalledWith('tab-1', 'note body', 'Make it blue', '<div>one</div>')
    expect(useNotesStore.getState().notes.a?.tabs).toHaveLength(1)
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
      editTab,
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
              mode: 'edit',
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

    expect(retry).toHaveBeenCalledWith('tab-2', 'note body', 'Mind map', '<div>one</div>', 'edit')
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
