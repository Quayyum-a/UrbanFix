import { APP_BUILD } from '@/lib/appVersion'
import { useSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'

const from = supabase.from as jest.Mock

function settingsReturns(row: object | null, error: object | null = null) {
  from.mockImplementation((table: string) => {
    const q: any = {}
    q.select = () => q
    q.eq = () => q
    q.maybeSingle = () => Promise.resolve(table === 'settings' ? { data: row, error } : { data: { id: 'u1', role: 'customer' }, error: null })
    return q
  })
}

beforeEach(() => {
  ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
  useSession.setState({ session: { user: { id: 'u1' } } as never, status: 'loading', profile: null })
})

test('matching versions load the profile', async () => {
  settingsReturns({ pricing_version: 3, min_app_build: APP_BUILD })
  await useSession.getState().refresh()
  expect(useSession.getState().status).toBe('ready')
})

test('old database (before migration 003) is caught before any price is shown', async () => {
  settingsReturns({ pricing_version: 1 })
  await useSession.getState().refresh()
  expect(useSession.getState().status).toBe('db_outdated')
})

test('database requiring a newer app build asks for an app update', async () => {
  settingsReturns({ pricing_version: 3, min_app_build: APP_BUILD + 1 })
  await useSession.getState().refresh()
  expect(useSession.getState().status).toBe('app_outdated')
})

test('network failure is an error, not a version problem', async () => {
  settingsReturns(null, { message: 'Network request failed' })
  await useSession.getState().refresh()
  expect(useSession.getState().status).toBe('error')
})
