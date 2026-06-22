import { useNotesStore } from '@/store/useNotesStore'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const userApiKey = useNotesStore((state) => state.userApiKey)
  const setApiKey = useNotesStore((state) => state.setApiKey)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60">
      <div className="w-96 rounded border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="mb-3 text-sm font-medium text-zinc-100">Settings</h2>

        <label className="mb-1 block text-xs text-zinc-400" htmlFor="api-key">
          Gemini API key
        </label>
        <input
          id="api-key"
          type="password"
          value={userApiKey ?? ''}
          onChange={(event) => {
            setApiKey(event.target.value || null)
          }}
          placeholder="Paste your API key"
          className="mb-4 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
        />
        <p className="mb-4 text-xs text-zinc-500">
          Stored only in your browser, sent with each generation request, never persisted
          server-side.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded bg-violet-600 px-3 py-2 text-sm font-medium text-white"
        >
          Done
        </button>
      </div>
    </div>
  )
}
