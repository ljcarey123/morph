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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm">
      <div className="w-96 rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_40px_rgba(0,0,0,0.12)]">
        <h2 className="mb-5 text-base font-semibold text-slate-800">Settings</h2>

        <label className="mb-1.5 block text-xs font-medium text-slate-500" htmlFor="api-key">
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
          className="mb-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
        />
        <p className="mb-5 text-xs leading-relaxed text-slate-400">
          Stored only in your browser, sent with each generation request, never persisted
          server-side.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-violet-500 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-violet-600 active:scale-[0.98]"
        >
          Done
        </button>
      </div>
    </div>
  )
}
