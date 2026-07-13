import { type FormEvent, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, isLoading, signInWithMagicLink } = useAuth()
  const [email, setEmail] = useState('')
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f0eef8]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-300 border-t-violet-600" />
      </div>
    )
  }

  if (session) return <>{children}</>

  const handleMagicLink = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setIsSending(true)
    setError(null)
    const { error: err } = await signInWithMagicLink(email.trim())
    setIsSending(false)
    if (err) {
      setError(err.message)
    } else {
      setMagicLinkSent(true)
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-[#f0eef8]">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-[0_4px_24px_rgba(0,0,0,0.07)]">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-slate-800">Morph</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to access your notes</p>
        </div>

        {magicLinkSent ? (
          <div className="rounded-xl bg-violet-50 p-4 text-center">
            <p className="text-sm font-medium text-violet-700">Check your email</p>
            <p className="mt-1 text-xs text-violet-500">
              We sent a sign-in link to <strong>{email}</strong>
            </p>
            <button
              type="button"
              onClick={() => { setMagicLinkSent(false) }}
              className="mt-3 text-xs text-slate-400 underline hover:text-slate-600"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={(e) => { void handleMagicLink(e) }} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value) }}
                placeholder="you@example.com"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
              <button
                type="submit"
                disabled={isSending || !email.trim()}
                className="w-full rounded-xl bg-violet-500 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSending ? 'Sending…' : 'Send magic link'}
              </button>
            </form>

          </>
        )}

        {error ? (
          <p className="mt-4 text-center text-xs text-red-500">{error}</p>
        ) : null}
      </div>
    </div>
  )
}
