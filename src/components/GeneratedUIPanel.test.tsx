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
    fetchOptions.mockReset()
    mockedUseGenerativeUI.mockReturnValue({
      partialUI: undefined,
      generate,
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

  it('fetches suggestions and renders the active tab when opened', async () => {
    render(<GeneratedUIPanel noteId="a" isOpen onClose={vi.fn()} />)

    await waitFor(() => {
      expect(fetchOptions).toHaveBeenCalledWith('note body')
    })
    expect(screen.getByText('Timeline')).toBeInTheDocument()
    expect(screen.getByText('first explanation')).toBeInTheDocument()
    expect(screen.getByText('Comparison table')).toBeInTheDocument()
    expect(screen.getByText('Flowchart')).toBeInTheDocument()
  })

  it('switches the active tab when a tab button is clicked', async () => {
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
            },
          ],
        },
      },
    })
    const user = userEvent.setup()
    render(<GeneratedUIPanel noteId="a" isOpen onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Mind map' }))

    expect(useNotesStore.getState().notes.a?.activeTabId).toBe('tab-2')
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
