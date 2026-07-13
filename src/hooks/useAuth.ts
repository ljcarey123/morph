import { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useNotesStore } from '@/store/useNotesStore'
import { notesDb } from '@/lib/notesDb'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const hydrateFromSupabase = useNotesStore((state) => state.hydrateFromSupabase)
  const clearNotes = useNotesStore((state) => state.clearNotes)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setIsLoading(false)
    }).catch(() => {
      setIsLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      const hadSession = session !== null
      const hasSession = newSession !== null
      setSession(newSession)
      setUser(newSession?.user ?? null)

      if (!hadSession && hasSession) {
        // Signed in — load notes from Supabase
        notesDb.loadAll().then(({ notes, noteOrder }) => {
          hydrateFromSupabase(notes, noteOrder)
        }).catch(console.error)
      } else if (hadSession && !hasSession) {
        // Signed out — clear local state
        clearNotes()
      }
    })

    return () => { subscription.unsubscribe() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    user,
    session,
    isLoading,
    signInWithMagicLink: (email: string) =>
      supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } }),
    signOut: () => supabase.auth.signOut(),
  }
}
