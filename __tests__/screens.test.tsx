// Every screen renders with realistic data for the right role, and redirects
// the wrong role. Catches crashes that type-checking and bundling can't.
import { render, screen } from '@testing-library/react-native'
import React from 'react'
import * as api from '@/lib/api'
import { useSession } from '@/lib/session'
import type { Job, JobDetails, Profile, Role } from '@/lib/types'

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api')
  return {
    ...actual,
    myJobs: jest.fn(), getJob: jest.fn(), listBrands: jest.fn(), adminPriceBoard: jest.fn(), gradeOptions: jest.fn(), listModels: jest.fn(), getMyTechnician: jest.fn(), myEarnings: jest.fn(), listMessages: jest.fn(),
    adminJobs: jest.fn(), adminPendingTechnicians: jest.fn(), adminTechnicianDetails: jest.fn(), findTechnicians: jest.fn(),
  }
})
jest.mock('@/lib/photos', () => ({ signedUrls: jest.fn(() => Promise.resolve({})), pickPhoto: jest.fn(), uploadPhoto: jest.fn() }))
jest.mock('expo-router/js-tabs', () => {
  const { Text } = jest.requireActual('react-native')
  const Tabs = ({ children }: { children: React.ReactNode }) => <>{children}</>
  Tabs.displayName = 'Tabs'
  const Screen = ({ name }: { name: string }) => <Text>tab:{name}</Text>
  Screen.displayName = 'Tabs.Screen'
  Tabs.Screen = Screen
  return { Tabs }
})
const m = api as jest.Mocked<typeof api>

const profile = (role: Role): Profile => ({ id: `${role}-1`, role, full_name: 'Ada Obi', phone: '+2348031234567', area: 'Ikeja', address: null })
const asRole = (role: Role | null, status: 'ready' | 'needs_setup' | 'signed_out' = 'ready') =>
  useSession.setState({ status, profile: role ? profile(role) : null })

const job: Job = {
  id: 'job-1', code: 'UF-AB12CD', customer_id: 'customer-1', technician_id: 'technician-1', device_type: 'smartphone',
  category: 'screen_replacement', brand: 'iPhone', model: 'iPhone X', model_id: 40, issue_note: 'Dropped it', service_mode: 'visit',
  address: '12 Allen Avenue, Ikeja', price_kobo: 4_550_000, commission_kobo: 350_000, payout_kobo: 4_200_000, labour_kobo: 500_000,
  grade: 'premium', part_label: 'GX OLED', part_kobo: 3_700_000, part_pending: false, estimate_kobo: 4_550_000, price_confirmed: true,
  quoted_at: '2026-10-14T10:00:00Z', part_payout_status: 'due', warranty_days: 14, warranty_until: null, warranty_reason: null,
  warranty_claimed_at: null, warranty_notes: null, warranty_photos: [], warranty_done_at: null, is_repeat: false,
  status: 'in_repair', status_note: null, payment_reference: 'Ada Obi', payment_submitted_at: null, paid_at: null,
  intake_identifier: '490154203237518', intake_notes: 'Cracked', intake_photos: ['job-1/intake-1.jpg'], intake_at: '2026-10-14T10:00:00Z',
  repair_notes: null, parts_replaced: null, completion_photos: [], ready_at: null, completed_at: null, completed_by: null,
  dispute_reason: null, refund_reference: null, payout_status: 'not_due', created_at: '2026-10-14T09:00:00Z', updated_at: '2026-10-14T10:00:00Z',
}
const summary = { ...job, payout_kobo: job.payout_kobo ?? null, other_party: 'Emeka Phone Clinic' }
const details = (role: Role): JobDetails => ({
  job, viewer_role: role,
  breakdown: { part_kobo: 3_700_000, part_pending: false, part_label: 'GX OLED', grade: 'premium', grade_label: 'Premium', grade_description: null,
    service_charge_kobo: 850_000, total_kobo: 4_550_000, estimate_kobo: 4_550_000, price_confirmed: true, warranty_days: 14, warranty_until: null },
  customer: { name: 'Ada Obi', phone: '+2348031234567' },
  technician: { name: 'Emeka Okafor', shop_name: 'Emeka Phone Clinic', shop_address: 'Shop 14, Computer Village', area: 'Ikeja', phone: '+2348091234567' },
  events: [{ id: 1, actor_role: 'customer', from_status: null, to_status: 'requested', note: null, created_at: '2026-10-14T09:00:00Z' },
    { id: 2, actor_role: 'technician', from_status: 'paid', to_status: 'in_repair', note: null, created_at: '2026-10-14T10:00:00Z' }],
  review: null, payment_account: null, auto_release_hours: 72,
})
const techData = (status: 'draft' | 'approved' | 'pending') => ({
  tech: { id: 'technician-1', shop_name: 'Emeka Phone Clinic', shop_address: 'Shop 14, Computer Village, Ikeja', area: 'Ikeja', bio: null, status, status_reason: null, is_available: status === 'approved', submitted_at: null },
  priv: { id: 'technician-1', bank_name: 'GTBank', account_number: '0123456789', account_name: 'Emeka Okafor', nin: null, id_document_path: null },
  services: [{ technician_id: 'technician-1', device_type: 'smartphone', category: 'screen_replacement', price_kobo: 2_500_000, is_active: true }],
})

beforeEach(() => {
  ;(globalThis as any).__setParams({ id: 'job-1' })
  m.myJobs.mockResolvedValue([summary])
  m.getJob.mockImplementation(async () => details(useSession.getState().profile!.role))
  m.getMyTechnician.mockResolvedValue(techData('approved'))
  m.myEarnings.mockResolvedValue({ paid_kobo: 4_500_000, due_kobo: 2_250_000, in_escrow_kobo: 0, completed_jobs: 3, rating: 4.7, reviews: 3 })
  m.listMessages.mockResolvedValue([{ id: 1, job_id: 'job-1', sender_id: 'customer-1', body: 'When can you come?', created_at: '2026-10-14T09:30:00Z' }])
  m.adminJobs.mockResolvedValue([{ ...job, status: 'payment_submitted' }])
  m.adminPendingTechnicians.mockResolvedValue([{ ...techData('pending').tech, profiles: { full_name: 'Emeka Okafor', phone: '+2348091234567' } }])
  m.adminTechnicianDetails.mockResolvedValue({ technician: techData('pending').tech, profile: profile('technician'), private: { ...techData('pending').priv, nin: '12345678901', id_document_path: 'x/id.jpg' }, services: techData('pending').services })
})

// eslint-disable-next-line @typescript-eslint/no-require-imports
const load = (path: string) => require(`@/app/${path}`).default as React.ComponentType

describe('entry', () => {
  test('gate sends each state to the right place', () => {
    const Gate = load('index')
    for (const [role, status, to] of [[null, 'signed_out', '/sign-in'], [null, 'needs_setup', '/setup'], ['customer', 'ready', '/customer'],
      ['technician', 'ready', '/technician'], ['admin', 'ready', '/admin']] as const) {
      asRole(role, status)
      const { unmount } = render(<Gate />)
      expect(screen.getByTestId('redirect')).toHaveTextContent(`redirect:${to}`)
      unmount()
    }
  })
  test('version mismatch shows "Update needed" instead of prices', () => {
    const Gate = load('index')
    asRole('customer', 'app_outdated' as never)
    const { unmount } = render(<Gate />)
    expect(screen.getByText('Update needed')).toBeTruthy()
    expect(screen.getByText(/git pull/)).toBeTruthy()
    unmount()
    asRole('customer', 'db_outdated' as never)
    render(<Gate />)
    expect(screen.getByText(/database is missing an update/)).toBeTruthy()
  })
  test('other screens send outdated sessions back to the update screen (no redirect loop)', () => {
    asRole('customer', 'app_outdated' as never)
    render(React.createElement(load('customer/_layout')))
    expect(screen.getByTestId('redirect')).toHaveTextContent('redirect:/')
  })
  test('setup screen', () => {
    asRole(null, 'needs_setup')
    const Setup = load('setup')
    render(<Setup />)
    expect(screen.getByText('What brings you here?')).toBeTruthy()
  })
})

describe('customer screens', () => {
  beforeEach(() => asRole('customer'))
  test('layout has 3 tabs', () => {
    render(React.createElement(load('customer/_layout')))
    expect(screen.getByText('tab:index')).toBeTruthy()
    expect(screen.getByText('tab:repairs')).toBeTruthy()
  })
  test('home', async () => {
    render(React.createElement(load('customer/index')))
    expect(screen.getByText('Hi Ada, what needs fixing?')).toBeTruthy()
    expect(await screen.findByText('iPhone X')).toBeTruthy()
  })
  test('repairs', async () => {
    render(React.createElement(load('customer/repairs')))
    expect(await screen.findByText('iPhone X')).toBeTruthy()
  })
  test('account', () => {
    render(React.createElement(load('customer/account')))
    expect(screen.getByText('0803 123 4567')).toBeTruthy()
  })
  test('repair screen shows evidence and technician contact after payment', async () => {
    render(React.createElement(load('job/[id]/index')))
    expect(await screen.findByText('490154203237518')).toBeTruthy()
    expect(screen.getByText('0809 123 4567')).toBeTruthy()
  })
  test('chat', async () => {
    render(React.createElement(load('job/[id]/chat')))
    expect(await screen.findByText('When can you come?')).toBeTruthy()
  })
  test('cannot open technician or admin areas', () => {
    for (const p of ['technician/_layout', 'admin/_layout', 'technician-setup', 'admin-technician/[id]']) {
      const { unmount } = render(React.createElement(load(p)))
      expect(screen.getByTestId('redirect')).toHaveTextContent('redirect:/customer')
      unmount()
    }
  })
})

describe('technician screens', () => {
  beforeEach(() => asRole('technician'))
  test('jobs home (approved, online)', async () => {
    render(React.createElement(load('technician/index')))
    expect(await screen.findByText("You're online")).toBeTruthy()
    expect(await screen.findByText('iPhone X')).toBeTruthy()
  })
  test('jobs home (draft) prompts to finish setup', async () => {
    m.getMyTechnician.mockResolvedValue(techData('draft'))
    render(React.createElement(load('technician/index')))
    expect(await screen.findByText('Finish your profile to get jobs')).toBeTruthy()
    expect(screen.getByText('3 of 4 steps done')).toBeTruthy()
  })
  test('approved without bank details is asked to add them', async () => {
    const d = techData('approved')
    m.getMyTechnician.mockResolvedValue({ ...d, priv: { ...d.priv, bank_name: null, account_number: null, account_name: null } })
    render(React.createElement(load('technician/index')))
    expect(await screen.findByTestId('add-bank')).toBeTruthy()
  })
  test('approved with bank details: no prompt', async () => {
    render(React.createElement(load('technician/index')))
    await screen.findByText("You're online")
    expect(screen.queryByTestId('add-bank')).toBeNull()
  })
  test('setup lets an approved technician add bank details once, then locks them', async () => {
    const d = techData('approved')
    m.getMyTechnician.mockResolvedValue({ ...d, priv: { ...d.priv, bank_name: null, account_number: null, account_name: null } })
    const { unmount } = render(React.createElement(load('technician-setup')))
    expect(await screen.findByTestId('save-bank')).toBeTruthy()
    unmount()
    m.getMyTechnician.mockResolvedValue(d)
    render(React.createElement(load('technician-setup')))
    await screen.findByText('Get approved')
    expect(screen.queryByTestId('save-bank')).toBeNull()
  })
  test('setup', async () => {
    m.getMyTechnician.mockResolvedValue(techData('draft'))
    render(React.createElement(load('technician-setup')))
    expect(await screen.findByText('Get approved')).toBeTruthy()
  })
  test('earnings', async () => {
    render(React.createElement(load('technician/earnings')))
    expect(await screen.findByText('₦45,000')).toBeTruthy()
  })
  test('account', () => {
    render(React.createElement(load('technician/account')))
    expect(screen.getByText('Shop, prices, bank and ID')).toBeTruthy()
  })
  test('repair screen shows earnings, not the customer price', async () => {
    render(React.createElement(load('job/[id]/index')))
    expect(await screen.findByText('₦42,000')).toBeTruthy()
    expect(screen.getByText('you get')).toBeTruthy()
  })
  test('cannot book repairs', () => {
    render(React.createElement(load('book')))
    expect(screen.getByTestId('redirect')).toHaveTextContent('redirect:/technician')
  })
})

describe('admin screens', () => {
  beforeEach(() => asRole('admin'))
  test('to-do list', async () => {
    render(React.createElement(load('admin/index')))
    expect(await screen.findByText('Received ₦45,500. Confirm')).toBeTruthy()
  })
  test('technician review', async () => {
    ;(globalThis as any).__setParams({ id: 'technician-1' })
    render(React.createElement(load('admin-technician/[id]')))
    expect(await screen.findByText('12345678901')).toBeTruthy()
    expect(screen.getByTestId('approve')).toBeTruthy()
  })
  test('prices: shows models needing prices with Jiji reference', async () => {
    m.listBrands.mockResolvedValue([{ device_type: 'smartphone', brand: 'iphone', label: 'iPhone', is_android: false, sort_order: 1 }])
    m.adminPriceBoard.mockResolvedValue([
      { model_id: 40, model_name: 'iPhone XR', category: 'screen_replacement', category_label: 'Cracked or dead screen', grade: 'standard',
        grade_label: 'Standard', price_kobo: null, market_label: null, source: null, updated_at: null, stale: false, obs_count: 3,
        obs_low_kobo: 1_800_000, obs_median_kobo: 3_500_000, obs_high_kobo: 6_000_000, obs_url: 'https://jiji.ng/x', obs_date: '2026-10-21' },
    ])
    render(React.createElement(load('admin/prices')))
    expect(await screen.findByText('iPhone XR')).toBeTruthy()
    expect(screen.getByText('0 of 1 prices set · Jiji data available')).toBeTruthy()
  })
  test('account', () => {
    render(React.createElement(load('admin/account')))
    expect(screen.getByText('Admin')).toBeTruthy()
  })
})
