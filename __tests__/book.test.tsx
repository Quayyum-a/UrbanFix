import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native'
import React from 'react'
import Book from '@/app/book'
import * as api from '@/lib/api'
import { useSession } from '@/lib/session'
import type { DeviceBrand, DeviceModel, GradeOption, TechnicianMatch } from '@/lib/types'

jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  listBrands: jest.fn(), listModels: jest.fn(), gradeOptions: jest.fn(),
  findTechnicians: jest.fn(), createJob: jest.fn(), updateMyProfile: jest.fn(),
}))
const m = api as jest.Mocked<typeof api>
const router = (globalThis as any).__router

const BRANDS: DeviceBrand[] = [
  { device_type: 'smartphone', brand: 'iphone', label: 'iPhone', is_android: false, sort_order: 1 },
  { device_type: 'smartphone', brand: 'tecno', label: 'Tecno', is_android: true, sort_order: 3 },
  { device_type: 'smartphone', brand: 'other_android', label: 'Other Android', is_android: true, sort_order: 7 },
]
const MODELS: DeviceModel[] = [
  { id: 33, device_type: 'smartphone', brand: 'iphone', name: 'iPhone 11 Pro', hint: '3 cameras · 5.8″', sort_order: 329 },
  { id: 34, device_type: 'smartphone', brand: 'iphone', name: 'iPhone 11', hint: '2 cameras · 6.1″', sort_order: 328 },
  { id: 40, device_type: 'smartphone', brand: 'iphone', name: 'iPhone X', hint: '2 cameras · 5.8″', sort_order: 317 },
]
const g = (grade: GradeOption['grade'], label: string, part: number | null, market: string | null, days: number): GradeOption =>
  ({ grade, label, description: `${label} description`, warranty_days: days, market_label: market, part_kobo: part, price_updated_at: null })
const PRICED: GradeOption[] = [g('standard', 'Standard', 1_400_000, 'Incell', 7), g('high', 'High quality', 2_500_000, 'JK', 14), g('premium', 'Premium', 3_700_000, 'GX OLED', 14)]
const UNPRICED: GradeOption[] = PRICED.map((x) => ({ ...x, part_kobo: null, market_label: null }))
const TECH = (over: Partial<TechnicianMatch> = {}): TechnicianMatch => ({
  technician_id: 'tech-1', full_name: 'Emeka Okafor', shop_name: 'Emeka Phone Clinic', area: 'Ikeja',
  shop_address: 'Shop 14, Computer Village, Ikeja', bio: null, part_kobo: 3_700_000, service_charge_kobo: 850_000,
  total_kobo: 4_550_000, part_pending: false, rating: '4.8', reviews: 12, jobs_done: 30, used_before: false, ...over,
})

beforeEach(() => {
  ;(globalThis as any).__setParams({ device: 'smartphone' })
  useSession.setState({
    status: 'ready',
    profile: { id: 'c1', role: 'customer', full_name: 'Ada Obi', phone: '+2348031234567', area: 'Ikeja', address: null },
  })
  m.listBrands.mockResolvedValue(BRANDS)
  m.listModels.mockResolvedValue(MODELS)
  m.gradeOptions.mockResolvedValue(PRICED)
  m.findTechnicians.mockResolvedValue([TECH()])
  m.createJob.mockResolvedValue({ id: 'job-1' } as never)
  m.updateMyProfile.mockResolvedValue({} as never)
})

async function toConfirm(gradeId = 'grade-premium') {
  render(<Book />)
  fireEvent.press(await screen.findByTestId('brand-iphone'))
  fireEvent.press(await screen.findByTestId('model-40'))
  fireEvent.press(screen.getByTestId('problem-screen_replacement'))
  fireEvent.press(await screen.findByTestId(gradeId))
  fireEvent.press(await screen.findByTestId('tech-tech-1'))
  await screen.findByText('Confirm your request')
}

test('6 taps: brand → model → problem → quality → technician → request (no typing)', async () => {
  await toConfirm()
  expect(m.gradeOptions).toHaveBeenCalledWith(40, 'screen_replacement')
  expect(m.findTechnicians).toHaveBeenCalledWith('smartphone', 'screen_replacement', 40, 'premium')
  fireEvent.press(screen.getByTestId('request'))
  await waitFor(() => expect(m.createJob).toHaveBeenCalledWith(expect.objectContaining({
    technicianId: 'tech-1', deviceType: 'smartphone', brand: 'iphone', modelId: 40, modelText: null,
    category: 'screen_replacement', grade: 'premium', mode: 'drop_off',
  })))
  expect(router.replace).toHaveBeenCalledWith('/job/job-1')
})

test('customers see the part price per grade, then Part + Service charge — never the split', async () => {
  render(<Book />)
  fireEvent.press(await screen.findByTestId('brand-iphone'))
  fireEvent.press(await screen.findByTestId('model-40'))
  fireEvent.press(screen.getByTestId('problem-screen_replacement'))
  const premium = await screen.findByTestId('grade-premium')
  expect(within(premium).getByText('₦37,000')).toBeTruthy()
  expect(within(premium).getByText(/GX OLED/)).toBeTruthy()
  expect(within(premium).getByText('14-day warranty')).toBeTruthy()
  fireEvent.press(premium)
  fireEvent.press(await screen.findByTestId('tech-tech-1'))
  const b = await screen.findByTestId('breakdown')
  expect(within(b).getByText('Part (Premium · GX OLED)')).toBeTruthy()
  expect(within(b).getByText('₦37,000')).toBeTruthy()
  expect(within(b).getByText('Service charge')).toBeTruthy()
  expect(within(b).getByText('₦8,500')).toBeTruthy()
  expect(within(b).getByText('₦45,500')).toBeTruthy()
  expect(screen.queryByText(/UrbanFix fee|repair fee|commission/i)).toBeNull()
})

test('searching models filters the list', async () => {
  m.listModels.mockResolvedValue([...MODELS, ...Array.from({ length: 8 }, (_, i) => ({ ...MODELS[0]!, id: 100 + i, name: `iPhone 1${i} mini` }))])
  render(<Book />)
  fireEvent.press(await screen.findByTestId('brand-iphone'))
  fireEvent.changeText(await screen.findByTestId('model-search'), '11 pro')
  expect(screen.getByTestId('model-33')).toBeTruthy()
  expect(screen.queryByTestId('model-34')).toBeNull()
})

test('unlisted model: type the name; the part is priced after the technician checks it', async () => {
  m.findTechnicians.mockResolvedValue([TECH({ part_kobo: 0, total_kobo: 650_000, service_charge_kobo: 650_000, part_pending: true })])
  m.gradeOptions.mockResolvedValue(UNPRICED)
  render(<Book />)
  fireEvent.press(await screen.findByTestId('brand-other_android'))
  fireEvent.press(await screen.findByTestId('model-other'))
  expect(screen.getByTestId('model-text-continue')).toBeDisabled()
  fireEvent.changeText(screen.getByTestId('model-text'), 'Oppo A78')
  fireEvent.press(screen.getByTestId('model-text-continue'))
  fireEvent.press(screen.getByTestId('problem-screen_replacement'))
  expect(await screen.findByText(/confirmed after the technician checks/)).toBeTruthy()
  fireEvent.press(await screen.findByTestId('grade-high'))
  expect(m.gradeOptions).toHaveBeenCalledWith(null, 'screen_replacement')
  expect(m.findTechnicians).toHaveBeenLastCalledWith('smartphone', 'screen_replacement', null, 'high')
  fireEvent.press(await screen.findByTestId('tech-tech-1'))
  expect(await screen.findByText('Priced after check')).toBeTruthy()
  expect(screen.getByText('₦6,500 + part')).toBeTruthy()
  fireEvent.press(screen.getByTestId('request'))
  await waitFor(() => expect(m.createJob).toHaveBeenCalledWith(expect.objectContaining({ brand: 'other_android', modelId: null, modelText: 'Oppo A78', grade: 'high' })))
})

test('repairs without a part skip the quality step', async () => {
  m.findTechnicians.mockResolvedValue([TECH({ part_kobo: 0, service_charge_kobo: 650_000, total_kobo: 650_000 })])
  render(<Book />)
  fireEvent.press(await screen.findByTestId('brand-iphone'))
  fireEvent.press(await screen.findByTestId('model-40'))
  fireEvent.press(screen.getByTestId('problem-software_issues'))
  fireEvent.press(await screen.findByTestId('tech-tech-1'))
  await screen.findByText('Confirm your request')
  expect(m.gradeOptions).not.toHaveBeenCalled()
  expect(screen.queryByText(/^Part/)).toBeNull()
  fireEvent.press(screen.getByTestId('request'))
  await waitFor(() => expect(m.createJob).toHaveBeenCalledWith(expect.objectContaining({ category: 'software_issues', grade: null })))
})

test('home visit needs an address, then saves it to the profile', async () => {
  await toConfirm()
  fireEvent.press(screen.getByLabelText('Come to me'))
  fireEvent.press(screen.getByTestId('request'))
  expect(await screen.findByText(/at least 10 characters/)).toBeTruthy()
  expect(m.createJob).not.toHaveBeenCalled()
  fireEvent.changeText(screen.getByTestId('address'), '12 Allen Avenue, Ikeja')
  fireEvent.press(screen.getByTestId('request'))
  await waitFor(() => expect(m.createJob).toHaveBeenCalledWith(expect.objectContaining({ mode: 'visit', address: '12 Allen Avenue, Ikeja' })))
  expect(m.updateMyProfile).toHaveBeenCalledWith('Ada Obi', 'Ikeja', '12 Allen Avenue, Ikeja')
})

test('going back resets later choices', async () => {
  render(<Book />)
  fireEvent.press(await screen.findByTestId('brand-iphone'))
  fireEvent.press(await screen.findByTestId('model-40'))
  fireEvent.press(screen.getByTestId('problem-screen_replacement'))
  await screen.findByTestId('grade-premium')
  fireEvent.press(screen.getByText('Change problem'))
  fireEvent.press(screen.getByText('Change model'))
  fireEvent.press(screen.getByText('Change brand'))
  expect(await screen.findByTestId('brand-tecno')).toBeTruthy()
})

test('server refusals are shown and nothing navigates', async () => {
  m.createJob.mockRejectedValue({ code: 'P0001', message: 'You have 3 repairs waiting. Finish or cancel one first.' })
  await toConfirm()
  fireEvent.press(screen.getByTestId('request'))
  expect(await screen.findByText('You have 3 repairs waiting. Finish or cancel one first.')).toBeTruthy()
  expect(router.replace).not.toHaveBeenCalled()
})

test('no technicians available shows a helpful empty state', async () => {
  m.findTechnicians.mockResolvedValue([])
  render(<Book />)
  fireEvent.press(await screen.findByTestId('brand-iphone'))
  fireEvent.press(await screen.findByTestId('model-40'))
  fireEvent.press(screen.getByTestId('problem-diagnosis'))
  expect(await screen.findByText('No technicians available for this yet')).toBeTruthy()
})

test('an unknown device in the link falls back to phones; technicians are redirected', async () => {
  ;(globalThis as any).__setParams({ device: '<script>' })
  const first = render(<Book />)
  expect(await screen.findByTestId('brand-iphone')).toBeTruthy()
  expect(m.listBrands).toHaveBeenCalledWith('smartphone')
  first.unmount()
  act(() => { useSession.setState({ profile: { id: 't', role: 'technician', full_name: 'Emeka', phone: '+2348031234567', area: null, address: null } }) })
  render(<Book />)
  expect(screen.getByTestId('redirect')).toHaveTextContent('redirect:/technician')
})

test('nearest technicians first, with "Near you"; someone you used before stays on top', async () => {
  m.findTechnicians.mockResolvedValue([
    TECH({ technician_id: 'far', shop_name: 'Lekki Fix', area: 'Lekki' }),
    TECH({ technician_id: 'near', shop_name: 'Ikeja Fix', area: 'Ikeja' }),
    TECH({ technician_id: 'old', shop_name: 'Yaba Fix', area: 'Yaba', used_before: true }),
  ])
  render(<Book />)
  fireEvent.press(await screen.findByTestId('brand-iphone'))
  fireEvent.press(await screen.findByTestId('model-40'))
  fireEvent.press(screen.getByTestId('problem-screen_replacement'))
  fireEvent.press(await screen.findByTestId('grade-premium'))
  await screen.findByTestId('tech-near')
  const order = screen.getAllByTestId(/^tech-/).map((n) => n.props.testID)
  expect(order).toEqual(['tech-old', 'tech-near', 'tech-far'])
  expect(within(screen.getByTestId('tech-near')).getByText(/Near you/)).toBeTruthy()
  expect(within(screen.getByTestId('tech-far')).getByText(/km away/)).toBeTruthy()
})

test('loading steps show placeholders, never an empty screen', async () => {
  m.listBrands.mockReturnValue(new Promise(() => {}))
  render(<Book />)
  expect(screen.getByTestId('skeleton')).toBeTruthy()
})

describe('phone back button steps back through booking', () => {
  const back = () => act(() => { (globalThis as any).__pressBack() })
  const nav = (globalThis as any).__navigation

  test('from confirm all the way back, one step at a time, then out', async () => {
    await toConfirm()
    back(); expect(await screen.findByText('Choose a technician')).toBeTruthy()
    back(); expect(await screen.findByText('Choose part quality')).toBeTruthy()
    back(); expect(await screen.findByText("What's wrong?")).toBeTruthy()
    back(); expect(await screen.findByText('Which iPhone model?')).toBeTruthy()
    back(); expect(await screen.findByText("Tap your brand.")).toBeTruthy()
    expect(nav.goBack).not.toHaveBeenCalled()
    back(); expect(nav.goBack).toHaveBeenCalledTimes(1) // only now leave booking
    expect(router.replace).not.toHaveBeenCalled()
  })

  test('a repair without a part goes from technicians straight back to the problem list', async () => {
    m.findTechnicians.mockResolvedValue([TECH({ part_pending: false })])
    render(<Book />)
    fireEvent.press(await screen.findByTestId('brand-iphone'))
    fireEvent.press(await screen.findByTestId('model-40'))
    fireEvent.press(screen.getByTestId('problem-software_issues'))
    await screen.findByText('Choose a technician')
    back(); expect(await screen.findByText("What's wrong?")).toBeTruthy()
  })

  test('typing an unlisted model: back returns to the model list', async () => {
    render(<Book />)
    fireEvent.press(await screen.findByTestId('brand-tecno'))
    fireEvent.press(await screen.findByTestId('model-other'))
    await screen.findByText('Type your model')
    back(); expect(await screen.findByText(/Which Tecno model\?/)).toBeTruthy()
  })

  test('after sending the request, leaving is not blocked', async () => {
    await toConfirm()
    fireEvent.press(screen.getByTestId('request'))
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/job/job-1'))
    back()
    expect(nav.dispatch).toHaveBeenCalledWith({ type: 'GO_BACK' })
  })
})

describe('brand tiles', () => {
  test('every brand gets a badge; "Other" gets a device picture', async () => {
    render(<Book />)
    expect(await screen.findByTestId('brand-badge-iphone')).toBeTruthy()
    expect(within(screen.getByTestId('brand-badge-iphone')).getByText('iP')).toBeTruthy()
    expect(within(screen.getByTestId('brand-badge-tecno')).getByText('T')).toBeTruthy()
    expect(screen.getByTestId('brand-badge-other_android')).toBeTruthy()
  })

  test('initials', () => {
    const { brandInitials } = jest.requireActual('@/components/BrandBadge')
    expect(['iPhone', 'iPad', 'Samsung', 'HP', 'Redmi / Xiaomi', 'itel', 'Other / custom-built'].map(brandInitials))
      .toEqual(['iP', 'iP', 'S', 'HP', 'R', 'I', 'O'])
  })
})
