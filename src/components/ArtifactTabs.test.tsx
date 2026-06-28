import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useNotesStore } from '@/store/useNotesStore'
import { ArtifactTabs } from './ArtifactTabs'

describe('ArtifactTabs', () => {
  beforeEach(() => {
    useNotesStore.setState({
      notes: {
        a: {
          id: 'a',
          title: 'First',
          content: 'hello',
          createdAt: 1,
          updatedAt: 1,
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
    const { container } = render(<ArtifactTabs noteId="missing" />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders the pinned Note tab plus one tab per artifact', () => {
    render(<ArtifactTabs noteId="a" />)

    expect(screen.getByRole('button', { name: 'Note' })).toBeInTheDocument()
    expect(screen.getByText('Timeline')).toBeInTheDocument()
    expect(screen.getByText('Mind map')).toBeInTheDocument()
  })

  it('switches the active tab to an artifact when clicked', async () => {
    const user = userEvent.setup()
    render(<ArtifactTabs noteId="a" />)

    await user.click(screen.getByText('Timeline'))

    expect(useNotesStore.getState().notes.a?.activeTabId).toBe('tab-1')
  })

  it('switches back to the note when the Note tab is clicked', async () => {
    const existingNote = useNotesStore.getState().notes.a
    if (!existingNote) throw new Error('expected note to exist')
    useNotesStore.setState({
      notes: {
        ...useNotesStore.getState().notes,
        a: { ...existingNote, activeTabId: 'tab-1' },
      },
    })
    const user = userEvent.setup()
    render(<ArtifactTabs noteId="a" />)

    await user.click(screen.getByRole('button', { name: 'Note' }))

    expect(useNotesStore.getState().notes.a?.activeTabId).toBeNull()
  })

  it('removes a tab when its delete button is clicked', async () => {
    const user = userEvent.setup()
    render(<ArtifactTabs noteId="a" />)

    await user.click(screen.getByRole('button', { name: 'Delete Timeline' }))

    expect(useNotesStore.getState().notes.a?.tabs.map((tab) => tab.id)).toEqual(['tab-2'])
  })
})
