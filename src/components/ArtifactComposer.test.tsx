import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useNotesStore } from '@/store/useNotesStore'
import { ArtifactComposer } from './ArtifactComposer'
import type { ClassifyIntent } from '@/schemas/classifyIntent'

const STATIC_INTENT: ClassifyIntent = { action: 'create', mode: 'static' }
const DYNAMIC_INTENT: ClassifyIntent = { action: 'create', mode: 'dynamic' }

function mockSuggestOptions() {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
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
    mockSuggestOptions()
  })

  it('renders nothing when the note does not exist', () => {
    const { container } = render(
      <ArtifactComposer
        noteId="missing"
        generate={vi.fn()}
        generateDynamic={vi.fn()}
        fetchAction={vi.fn().mockResolvedValue(STATIC_INTENT)}
        isLoading={false}
        isClassifying={false}
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
        generateDynamic={vi.fn()}
        fetchAction={vi.fn().mockResolvedValue(STATIC_INTENT)}
        isLoading={false}
        isClassifying={false}
        error={undefined}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Timeline' }))

    expect(screen.getByPlaceholderText(/Describe a new view/)).toHaveValue('Timeline')
    expect(generate).not.toHaveBeenCalled()
  })

  it('classifies and calls generate for a static artifact', async () => {
    const generate = vi.fn()
    const user = userEvent.setup()
    render(
      <ArtifactComposer
        noteId="a"
        generate={generate}
        generateDynamic={vi.fn()}
        fetchAction={vi.fn().mockResolvedValue(STATIC_INTENT)}
        isLoading={false}
        isClassifying={false}
        error={undefined}
      />,
    )

    await user.type(screen.getByPlaceholderText(/Describe a new view/), 'Build a timeline')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => {
      expect(generate).toHaveBeenCalledWith('hello world', 'Build a timeline')
    })
  })

  it('calls generateDynamic when classified as dynamic', async () => {
    const generateDynamic = vi.fn().mockResolvedValue(undefined)
    const generate = vi.fn()
    const user = userEvent.setup()
    render(
      <ArtifactComposer
        noteId="a"
        generate={generate}
        generateDynamic={generateDynamic}
        fetchAction={vi.fn().mockResolvedValue(DYNAMIC_INTENT)}
        isLoading={false}
        isClassifying={false}
        error={undefined}
      />,
    )

    await user.type(screen.getByPlaceholderText(/Describe a new view/), 'Show me a tabbed dashboard')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => {
      expect(generateDynamic).toHaveBeenCalledWith('hello world', 'Show me a tabbed dashboard')
    })
    expect(generate).not.toHaveBeenCalled()
  })

  it('falls back to static generate when fetchAction returns undefined', async () => {
    const generate = vi.fn()
    const user = userEvent.setup()
    render(
      <ArtifactComposer
        noteId="a"
        generate={generate}
        generateDynamic={vi.fn()}
        fetchAction={vi.fn().mockResolvedValue(undefined)}
        isLoading={false}
        isClassifying={false}
        error={undefined}
      />,
    )

    await user.type(screen.getByPlaceholderText(/Describe a new view/), 'Make a chart')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => {
      expect(generate).toHaveBeenCalledWith('hello world', 'Make a chart')
    })
  })

  it('submits when Enter is pressed', async () => {
    const generate = vi.fn()
    const user = userEvent.setup()
    render(
      <ArtifactComposer
        noteId="a"
        generate={generate}
        generateDynamic={vi.fn()}
        fetchAction={vi.fn().mockResolvedValue(STATIC_INTENT)}
        isLoading={false}
        isClassifying={false}
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
        generateDynamic={vi.fn()}
        fetchAction={vi.fn().mockResolvedValue(STATIC_INTENT)}
        isLoading={false}
        isClassifying={false}
        error={new Error('boom')}
      />,
    )

    expect(screen.getByText('boom')).toBeInTheDocument()
  })
})
