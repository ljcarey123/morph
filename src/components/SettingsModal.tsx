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
    <div className="fixed inset-0 flex items-center justify-center bg-stone-950/70">
      <div className="w-96 rounded border border-stone-800 bg-stone-900 p-4">
        <h2 className="mb-3 text-sm font-medium text-stone-100">Settings</h2>

        <label className="mb-1 block text-xs text-stone-400" htmlFor="api-key">
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
          className="mb-4 w-full rounded border border-stone-800 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none"
        />
        <p className="mb-4 text-xs text-stone-500">
          Stored only in your browser, sent with each generation request, never persisted
          server-side.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded bg-amber-500 px-3 py-2 text-sm font-medium text-stone-950 hover:bg-amber-400"
        >
          Done
        </button>
      </div>
    </div>
  )
}
