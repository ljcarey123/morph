import { type FormEvent, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, isLoading, signInWithMagicLink, signInWithGoogle } = useAuth()
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

  const handleGoogle = async () => {
    setError(null)
    const { error: err } = await signInWithGoogle()
    if (err) setError(err.message)
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

            <div className="my-4 flex items-center gap-3">
              <hr className="flex-1 border-slate-100" />
              <span className="text-xs text-slate-400">or</span>
              <hr className="flex-1 border-slate-100" />
            </div>

            <button
              type="button"
              onClick={() => { void handleGoogle() }}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <GoogleIcon />
              Continue with Google
            </button>
          </>
        )}

        {error ? (
          <p className="mt-4 text-center text-xs text-red-500">{error}</p>
        ) : null}
      </div>
    </div>
  )
}
