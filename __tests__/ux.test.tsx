// Red dots, tab badges, the pop-up note, and asking for location once.
import AsyncStorage from '@react-native-async-storage/async-storage'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native'
import * as Location from 'expo-location'
import React from 'react'
import CustomerHome, { LOCATION_ASKED_KEY } from '@/app/customer/index'
import CustomerLayout from '@/app/customer/_layout'
import Chat from '@/app/job/[id]/chat'
import { AccountScreen } from '@/components/AccountScreen'
import { JobItem } from '@/components/JobItem'
import { LiveUpdates } from '@/components/LiveUpdates'
import * as api from '@/lib/api'
import { useLive } from '@/lib/live'
import { useSession } from '@/lib/session'
import type { JobSummary, Profile } from '@/lib/types'

jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  myJobs: jest.fn(), myUnread: jest.fn(), markMessagesRead: jest.fn(() => Promise.resolve(null)),
  updateMyProfile: jest.fn(), listMessages: jest.fn(), sendMessage: jest.fn(),
}))
jest.mock('react-native-safe-area-context', () => {
  const R = jest.requireActual('react-native-safe-area-context')
  return { ...R, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }
})
jest.mock('expo-router/js-tabs', () => {
  const { Text } = jest.requireActual('react-native')
  const Tabs = ({ children }: { children: React.ReactNode }) => <>{children}</>
  Tabs.displayName = 'Tabs'
  const Screen = ({ name, options }: { name: string; options: { tabBarBadge?: string | number } }) =>
    <Text testID={`tab-${name}`}>{`${name}:${options.tabBarBadge ?? ''}`}</Text>
  Screen.displayName = 'Tabs.Screen'
  Tabs.Screen = Screen
  return { Tabs }
})
const m = api as jest.Mocked<typeof api>
const L = Location as jest.Mocked<typeof Location>
const router = (globalThis as any).__router

const me = (over: Partial<Profile> = {}): Profile =>
  ({ id: 'c1', role: 'customer', full_name: 'Ada Obi', phone: '+2348031234567', area: 'Ikeja', address: null, ...over })
const job = (over: Partial<JobSummary> = {}): JobSummary => ({
  id: 'job-1', code: 'UF-AB12CD', status: 'accepted', device_type: 'smartphone', category: 'screen_replacement', brand: 'iPhone',
  model: 'iPhone X', price_kobo: 4_550_000, payout_kobo: null, service_mode: 'drop_off', other_party: 'Emeka Phone Clinic',
  created_at: '2026-10-21T09:00:00Z', updated_at: '2026-10-21T09:00:00Z', ...over,
})

beforeEach(async () => {
  useSession.setState({ status: 'ready', profile: me() })
  m.myJobs.mockResolvedValue([])
  m.myUnread.mockResolvedValue([])
  await AsyncStorage.clear()
})

describe('unread messages', () => {
  test('a repair with unread messages shows a red dot and the count', () => {
    useLive.setState({ unread: { 'job-1': 3 } })
    render(<JobItem job={job()} role="customer" />)
    const dot = screen.getByTestId('unread-UF-AB12CD')
    expect(within(dot).getByText('3')).toBeTruthy()
    expect(within(dot).getByText('New messages')).toBeTruthy()
    expect(screen.getByLabelText(/3 new messages/)).toBeTruthy()
  })

  test('no unread: no dot', () => {
    render(<JobItem job={job()} role="customer" />)
    expect(screen.queryByTestId('unread-UF-AB12CD')).toBeNull()
  })

  test('the My repairs tab carries a red badge with the number of chats to read', () => {
    useLive.setState({ unread: { a: 1, b: 4 } })
    render(<CustomerLayout />)
    expect(screen.getByTestId('tab-repairs')).toHaveTextContent('repairs:2')
    expect(screen.getByTestId('tab-index')).toHaveTextContent('index:')
  })

  test('opening the chat marks it read and clears the dot', async () => {
    ;(globalThis as any).__setParams({ id: 'job-1' })
    useLive.setState({ role: 'customer', unread: { 'job-1': 2 } })
    m.listMessages.mockResolvedValue([{ id: 9, job_id: 'job-1', sender_id: 't1', body: 'Hi', created_at: '2026-10-21T09:00:00Z' }])
    render(<Chat />)
    await screen.findByText('Hi')
    expect(useLive.getState().unread['job-1']).toBeUndefined()
    expect(m.markMessagesRead).toHaveBeenCalledWith('job-1', null)
    expect(m.markMessagesRead).toHaveBeenCalledWith('job-1', 9)
  })
})

describe('pop-up note', () => {
  test('shows the latest event and opens the repair when tapped', async () => {
    render(<LiveUpdates />)
    act(() => { useLive.getState().showToast({ kind: 'new_order', jobId: 'job-7', title: 'New repair request', text: 'iPhone X. Tap to accept or decline.' }) })
    fireEvent.press(await screen.findByTestId('live-toast'))
    expect(router.push).toHaveBeenCalledWith('/job/job-7')
    expect(useLive.getState().toast).toBeNull()
  })

  test('a message note opens the chat; the X just closes it', async () => {
    render(<LiveUpdates />)
    act(() => { useLive.getState().showToast({ kind: 'message', jobId: 'job-2', title: 'New message from Emeka', text: 'Tap to open the chat.' }) })
    fireEvent.press(await screen.findByTestId('live-toast'))
    expect(router.push).toHaveBeenCalledWith('/job/job-2/chat')
    act(() => { useLive.getState().showToast({ kind: 'message', jobId: 'job-3', title: 'x', text: 'y' }) })
    fireEvent.press(await screen.findByTestId('live-toast-close'))
    expect(screen.queryByTestId('live-toast')).toBeNull()
    expect(router.push).toHaveBeenCalledTimes(1)
  })

  test('starts refreshing only once signed in', async () => {
    useSession.setState({ status: 'signed_out', profile: null })
    const { rerender } = render(<LiveUpdates />)
    expect(m.myJobs).not.toHaveBeenCalled()
    useSession.setState({ status: 'ready', profile: me() })
    rerender(<LiveUpdates />)
    await waitFor(() => expect(m.myJobs).toHaveBeenCalled())
  })
})

describe('location, asked once', () => {
  test('home asks for location only when the area is unknown, and "Not now" stops asking', async () => {
    useSession.setState({ status: 'ready', profile: me({ area: null }) })
    const view = render(<CustomerHome />)
    fireEvent.press(await screen.findByTestId('skip-location'))
    expect(screen.queryByTestId('location-picker')).toBeNull()
    await waitFor(async () => expect(await AsyncStorage.getItem(LOCATION_ASKED_KEY)).toBe('1'))
    view.unmount()
    render(<CustomerHome />)
    await screen.findByText(/what needs fixing/)
    await act(async () => {})
    expect(screen.queryByTestId('location-picker')).toBeNull()
  })

  test('known area: no prompt at all', async () => {
    render(<CustomerHome />)
    await act(async () => {})
    expect(screen.queryByTestId('location-picker')).toBeNull()
  })

  test('one tap on "Use my location" saves the area and fills the visit address', async () => {
    useSession.setState({ status: 'ready', profile: me({ area: null }) })
    L.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as never)
    L.getLastKnownPositionAsync.mockResolvedValue({ coords: { latitude: 6.6268, longitude: 3.3412 } } as never)
    L.reverseGeocodeAsync.mockResolvedValue([{ streetNumber: '7', street: 'Otigba Street', district: 'Ogba', city: 'Ikeja' }] as never)
    m.updateMyProfile.mockResolvedValue(me({ area: 'Ogba', address: '7 Otigba Street, Ogba, Ikeja' }))
    render(<CustomerHome />)
    fireEvent.press(await screen.findByTestId('use-location'))
    await waitFor(() => expect(m.updateMyProfile).toHaveBeenCalledWith('Ada Obi', 'Ogba', '7 Otigba Street, Ogba, Ikeja'))
    await waitFor(() => expect(screen.queryByTestId('location-picker')).toBeNull())
    expect(useSession.getState().profile?.area).toBe('Ogba')
  })

  test('location refused: falls back to picking an area', async () => {
    useSession.setState({ status: 'ready', profile: me({ area: null }) })
    L.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' } as never)
    m.updateMyProfile.mockResolvedValue(me({ area: 'Yaba' }))
    render(<CustomerHome />)
    fireEvent.press(await screen.findByTestId('use-location'))
    expect(await screen.findByText(/Location is off/)).toBeTruthy()
    fireEvent.press(within(screen.getByTestId('area-chips')).getByLabelText('Yaba'))
    await waitFor(() => expect(m.updateMyProfile).toHaveBeenCalledWith('Ada Obi', 'Yaba', null))
  })

  test('account shows the area without a list to pick from, and updates from location in one tap', async () => {
    L.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as never)
    L.getLastKnownPositionAsync.mockResolvedValue({ coords: { latitude: 6.5100, longitude: 3.3790 } } as never)
    L.reverseGeocodeAsync.mockResolvedValue([] as never)
    m.updateMyProfile.mockResolvedValue(me({ area: 'Yaba' }))
    render(<AccountScreen />)
    expect(screen.getByText('Area: Ikeja')).toBeTruthy()
    expect(screen.queryByTestId('area-chips')).toBeNull()
    expect(screen.queryByLabelText('Lekki')).toBeNull()
    fireEvent.press(screen.getByTestId('use-location'))
    await waitFor(() => expect(m.updateMyProfile).toHaveBeenCalledWith('Ada Obi', 'Yaba', null))
    expect(await screen.findByText('Saved.')).toBeTruthy()
  })
})

describe('customer home', () => {
  test('a repair waiting for payment (quoted) shows on Home', async () => {
    m.myJobs.mockResolvedValue([job({ status: 'quoted' })])
    render(<CustomerHome />)
    expect(await screen.findByTestId('job-UF-AB12CD')).toBeTruthy()
  })

  test('while repairs load, a placeholder shows instead of nothing', () => {
    m.myJobs.mockReturnValue(new Promise(() => {}))
    render(<CustomerHome />)
    expect(screen.getByTestId('skeleton')).toBeTruthy()
  })
})
