// Live updates: what buzzes, what doesn't, and that nothing leaks between accounts.
import * as Haptics from 'expo-haptics'
import { Vibration } from 'react-native'
import * as api from '@/lib/api'
import { useLive, unreadChats } from '@/lib/live'
import { diffJobs } from '@/lib/liveEvents'
import { useSession } from '@/lib/session'
import type { JobStatus, JobSummary, Role } from '@/lib/types'

jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  myJobs: jest.fn(), myUnread: jest.fn(), markMessagesRead: jest.fn(() => Promise.resolve(null)),
}))
const m = api as jest.Mocked<typeof api>

const j = (id: string, status: JobStatus, over: Partial<JobSummary> = {}): JobSummary => ({
  id, code: `UF-${id}`, status, device_type: 'smartphone', category: 'screen_replacement', brand: 'iPhone', model: 'iPhone X',
  price_kobo: 1_000_000, payout_kobo: null, service_mode: 'drop_off', other_party: 'Emeka Phone Clinic',
  created_at: '2026-10-21T09:00:00Z', updated_at: '2026-10-21T09:00:00Z', ...over,
})

describe('diffJobs', () => {
  test('the first load never buzzes, even with requests waiting', () => {
    expect(diffJobs('technician', null, [j('a', 'requested')], null, { a: 3 })).toEqual([])
  })

  test('a technician gets a new-order alert for a new request only', () => {
    const ev = diffJobs('technician', { a: 'accepted' }, [j('a', 'accepted'), j('b', 'requested')], {}, {})
    expect(ev).toEqual([expect.objectContaining({ kind: 'new_order', jobId: 'b', title: 'New repair request' })])
    // A brand-new job that is already past "requested" (e.g. created and cancelled between refreshes) is not an order.
    expect(diffJobs('technician', {}, [j('c', 'cancelled')], {}, {})).toEqual([])
  })

  test('customers do not get "new order" alerts for repairs they booked themselves', () => {
    expect(diffJobs('customer', {}, [j('a', 'requested')], {}, {})).toEqual([])
  })

  test.each<[Role, JobStatus, JobStatus, RegExp]>([
    ['customer', 'requested', 'accepted', /accepted/i],
    ['customer', 'accepted', 'quoted', /price is ready/i],
    ['customer', 'payment_submitted', 'in_repair', /repair has started/i],
    ['customer', 'in_repair', 'awaiting_confirmation', /ready/i],
    ['customer', 'awaiting_confirmation', 'completed', /complete/i],
    ['technician', 'quoted', 'payment_submitted', /paid/i],
    ['technician', 'payment_submitted', 'in_repair', /start the repair/i],
    ['technician', 'awaiting_confirmation', 'completed', /payout/i],
    ['technician', 'completed', 'warranty', /warranty/i],
  ])('%s: %s -> %s is a milestone', (role, from, to, text) => {
    const ev = diffJobs(role, { a: from }, [j('a', to)], {}, {})
    expect(ev).toHaveLength(1)
    expect(ev[0]).toMatchObject({ kind: 'milestone', jobId: 'a' })
    expect(ev[0]!.text).toMatch(text)
    expect(ev[0]!.title).toContain('iPhone X')
  })

  test('steps the person did themselves have no milestone text (e.g. customer paying)', () => {
    expect(diffJobs('customer', { a: 'quoted' }, [j('a', 'payment_submitted')], {}, {})).toEqual([])
    expect(diffJobs('technician', { a: 'requested' }, [j('a', 'accepted')], {}, {})).toEqual([])
  })

  test('a new message alerts once per increase, naming who wrote', () => {
    const ev = diffJobs('customer', { a: 'accepted' }, [j('a', 'accepted')], { a: 1 }, { a: 2 })
    expect(ev).toEqual([expect.objectContaining({ kind: 'message', title: 'New message from Emeka Phone Clinic' })])
    expect(diffJobs('customer', { a: 'accepted' }, [j('a', 'accepted')], { a: 2 }, { a: 2 })).toEqual([])
    expect(diffJobs('customer', { a: 'accepted' }, [j('a', 'accepted')], { a: 2 }, { a: 0 })).toEqual([])
  })

  test('new orders come before milestones and messages', () => {
    const ev = diffJobs('technician', { a: 'in_repair', c: 'accepted' },
      [j('a', 'in_repair'), j('b', 'requested'), j('c', 'cancelled')], { a: 0 }, { a: 1 })
    expect(ev.map((e) => e.kind)).toEqual(['new_order', 'milestone', 'message'])
  })
})

describe('live store', () => {
  const vibrate = jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {})
  beforeEach(() => {
    useSession.setState({ status: 'ready', profile: { id: 't1', role: 'technician', full_name: 'Tobi', phone: '+2348031234567', area: 'Ikeja', address: null } })
    useLive.getState().reset()
    m.myUnread.mockResolvedValue([])
  })

  test('buzzes and shows a note when a new order arrives, not on the first load', async () => {
    m.myJobs.mockResolvedValueOnce([j('a', 'accepted')])
    await useLive.getState().load()
    expect(Haptics.notificationAsync).not.toHaveBeenCalled()
    expect(useLive.getState().toast).toBeNull()

    m.myJobs.mockResolvedValueOnce([j('b', 'requested'), j('a', 'accepted')])
    await useLive.getState().load()
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1)
    expect(useLive.getState().toast).toMatchObject({ kind: 'new_order', jobId: 'b' })
    expect(useLive.getState().jobs).toHaveLength(2)

    // Same data again: no repeat buzz.
    m.myJobs.mockResolvedValueOnce([j('b', 'requested'), j('a', 'accepted')])
    await useLive.getState().load()
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1)
    void vibrate
  })

  test('a change you made yourself (noted from the job screen) does not buzz', async () => {
    m.myJobs.mockResolvedValueOnce([j('a', 'requested')])
    await useLive.getState().load()
    useLive.getState().noteStatus('a', 'accepted')
    expect(useLive.getState().jobs![0]!.status).toBe('accepted')
    m.myJobs.mockResolvedValueOnce([j('a', 'accepted')])
    await useLive.getState().load()
    expect(Haptics.notificationAsync).not.toHaveBeenCalled()
  })

  test('unread counts feed the red dots; opening the chat clears them and tells the server', async () => {
    m.myJobs.mockResolvedValue([j('a', 'accepted'), j('b', 'in_repair')])
    m.myUnread.mockResolvedValueOnce([{ job_id: 'a', unread: 2, last_message_at: '2026-10-21T10:00:00Z' }])
    await useLive.getState().load()
    expect(useLive.getState().unread).toEqual({ a: 2 })
    expect(unreadChats(useLive.getState().unread)).toBe(1)
    useLive.getState().markRead('a', 55)
    expect(useLive.getState().unread).toEqual({})
    expect(m.markMessagesRead).toHaveBeenCalledWith('a', 55)
    // Server agrees on the next refresh: no "new message" buzz for what you just read.
    m.myUnread.mockResolvedValueOnce([])
    await useLive.getState().load()
    expect(useLive.getState().toast).toBeNull()
  })

  test('a database without the unread update still loads repairs (no dots)', async () => {
    m.myJobs.mockResolvedValueOnce([j('a', 'accepted')])
    m.myUnread.mockRejectedValueOnce(new Error('function my_unread does not exist'))
    await useLive.getState().load()
    expect(useLive.getState().jobs).toHaveLength(1)
    expect(useLive.getState().unread).toEqual({})
    expect(useLive.getState().error).toBeNull()
  })

  test('a network error keeps the last list on screen and shows the error', async () => {
    m.myJobs.mockResolvedValueOnce([j('a', 'accepted')])
    await useLive.getState().load()
    m.myJobs.mockRejectedValueOnce(new Error('Network request failed'))
    await useLive.getState().load()
    expect(useLive.getState().jobs).toHaveLength(1)
    expect(useLive.getState().error).toBeTruthy()
  })

  test('tapping refresh while a refresh is running does not send a second request', async () => {
    let release!: (v: JobSummary[]) => void
    m.myJobs.mockReturnValueOnce(new Promise((r) => { release = r }))
    const a = useLive.getState().load()
    const b = useLive.getState().load(true)
    expect(useLive.getState().refreshing).toBe(true)
    release([j('a', 'accepted')])
    await Promise.all([a, b])
    expect(m.myJobs).toHaveBeenCalledTimes(1)
    expect(useLive.getState().refreshing).toBe(false)
  })

  test("a slow reply for the previous account is thrown away after switching accounts", async () => {
    let release!: (v: JobSummary[]) => void
    m.myJobs.mockReturnValueOnce(new Promise((r) => { release = r }))
    const p = useLive.getState().load()
    useLive.getState().setRole('customer')
    release([j('secret', 'requested')])
    await p
    expect(useLive.getState().jobs).toBeNull()
  })

  test('signed out: nothing loads', async () => {
    useSession.setState({ status: 'signed_out', profile: null })
    await useLive.getState().load()
    expect(m.myJobs).not.toHaveBeenCalled()
  })

  test('admins skip my_jobs and only load unread chats', async () => {
    useSession.setState({ status: 'ready', profile: { id: 'x', role: 'admin', full_name: 'Admin', phone: '+2348031234567', area: null, address: null } })
    m.myUnread.mockResolvedValueOnce([{ job_id: 'z', unread: 1, last_message_at: '2026-10-21T10:00:00Z' }])
    await useLive.getState().load()
    expect(m.myJobs).not.toHaveBeenCalled()
    expect(useLive.getState().unread).toEqual({ z: 1 })
  })
})
