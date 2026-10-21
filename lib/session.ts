import type { Session } from '@supabase/supabase-js'
import { create } from 'zustand'
import { getMyProfile } from './api'
import { versionProblem } from './appVersion'
import { isConfigured, supabase } from './supabase'
import type { Profile } from './types'

type Status = 'loading' | 'not_configured' | 'signed_out' | 'needs_setup' | 'ready' | 'error' | 'app_outdated' | 'db_outdated'

interface SessionState {
  status: Status
  session: Session | null
  profile: Profile | null
  error: string | null
  init: () => () => void
  refresh: () => Promise<void>
  setProfile: (p: Profile) => void
}

export const useSession = create<SessionState>((set, get) => ({
  status: 'loading',
  session: null,
  profile: null,
  error: null,

  refresh: async () => {
    const { session } = get()
    if (!session) {
      set({ status: 'signed_out', profile: null })
      return
    }
    try {
      // App and database must agree on how prices work, or amounts would be wrong.
      const { data: cfg, error: cfgError } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle()
      if (cfgError && !/permission|jwt/i.test(cfgError.message)) throw cfgError
      const problem = versionProblem(cfg as { pricing_version?: number; min_app_build?: number } | null)
      if (problem) { set({ status: problem, error: null }); return }
      const profile = await getMyProfile()
      set({ profile, status: profile ? 'ready' : 'needs_setup', error: null })
    } catch (e) {
      set({ status: 'error', error: (e as Error).message })
    }
  },

  setProfile: (p) => set({ profile: p, status: 'ready' }),

  init: () => {
    if (!isConfigured) {
      set({ status: 'not_configured' })
      return () => {}
    }
    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session })
      void get().refresh()
    })
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const prev = get().session
      set({ session })
      // Only reload the profile when the signed-in user actually changes.
      if (event === 'SIGNED_OUT' || session?.user.id !== prev?.user.id) void get().refresh()
    })
    return () => data.subscription.unsubscribe()
  },
}))

/** Where a signed-in person belongs. */
export function homeFor(status: Status, profile: Profile | null): string {
  if (status === 'app_outdated' || status === 'db_outdated' || status === 'error' || status === 'loading' || status === 'not_configured') return '/'
  if (status === 'signed_out') return '/sign-in'
  if (status === 'needs_setup') return '/setup'
  if (profile?.role === 'technician') return '/technician'
  if (profile?.role === 'admin') return '/admin'
  return '/customer'
}
