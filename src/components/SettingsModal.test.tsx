import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useNotesStore } from '@/store/useNotesStore'
import { SettingsModal } from './SettingsModal'

describe('SettingsModal', () => {
  beforeEach(() => {
    useNotesStore.setState({ notes: {}, activeNoteId: null, userApiKey: null })
    localStorage.clear()
  })

  it('renders nothing when closed', () => {
    render(<SettingsModal isOpen={false} onClose={vi.fn()} />)

    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
  })

  it('renders the api key input when open', () => {
    render(<SettingsModal isOpen onClose={vi.fn()} />)

    expect(screen.getByLabelText('Gemini API key')).toBeInTheDocument()
  })

  it('writes typed input to the store', async () => {
    const user = userEvent.setup()
    render(<SettingsModal isOpen onClose={vi.fn()} />)

    await user.type(screen.getByLabelText('Gemini API key'), 'secret-key')

    expect(useNotesStore.getState().userApiKey).toBe('secret-key')
  })

  it('calls onClose when Done is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<SettingsModal isOpen onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(onClose).toHaveBeenCalledOnce()
  })
})
