import { useEffect, useState } from 'react'
import { AuthContext } from './auth-context.js'
import { supabase } from '../lib/supabase.js'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase) return undefined

    let isMounted = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isMounted) {
        setSession(nextSession)
        setLoading(false)
        setError('')
      }
    })

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!isMounted) return

      setSession(data.session)
      setError(sessionError?.message ?? '')
      setLoading(false)
    }).catch((sessionError) => {
      if (!isMounted) return

      setError(sessionError.message || 'Unable to restore your sign-in session.')
      setLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, error }}>
      {children}
    </AuthContext.Provider>
  )
}
