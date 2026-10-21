import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native'
import React from 'react'
import { Alert } from 'react-native'
import { JobActions } from '@/components/JobActions'
import * as api from '@/lib/api'
import { useSession } from '@/lib/session'
import type { GradeOption, Job, JobDetails, JobStatus, Role } from '@/lib/types'

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api')
  const fns = ['submitPayment', 'declineQuote', 'confirmCompletion', 'raiseDispute', 'claimWarranty', 'submitReview', 'cancelJob',
    'acceptJob', 'declineJob', 'recordIntake', 'markReady', 'adminConfirmPayment', 'adminRejectPayment', 'adminResolveDispute',
    'adminMarkPayoutPaid', 'adminMarkPartPayoutPaid', 'adminTechnicianDetails', 'getMyTechnician', 'gradeOptions', 'listModels']
  return { ...actual, ...Object.fromEntries(fns.map((f) => [f, jest.fn(() => Promise.resolve({}))])) }
})
jest.mock('@/lib/pricing', () => {
  const fees = jest.requireActual('@/lib/fees')
  return { ...fees, getFeeSettings: jest.fn(() => Promise.resolve(fees.DEFAULT_FEES)) }
})
// Photo upload needs a camera; replace the picker with a button that "adds" a photo.
jest.mock('@/components/PhotoPicker', () => {
  const { Pressable: P, Text: T } = jest.requireActual('react-native')
  return {
    PhotoPicker: ({ value, onChange, prefix }: { value: string[]; onChange: (v: string[]) => void; prefix: string }) =>
      <P testID={`fake-photo-${prefix}`} onPress={() => onChange([...value, `job-1/${prefix}-${value.length}.jpg`])}><T>{value.length} photos</T></P>,
  }
})

const m = api as jest.Mocked<typeof api>
const alertSpy = jest.spyOn(Alert, 'alert')
const pressAlert = async (label: string) => {
  const buttons = alertSpy.mock.calls.at(-1)![2] as { text: string; onPress?: () => void }[]
  await act(async () => { buttons.find((b) => b.text === label)!.onPress!() })
}

const GRADES: GradeOption[] = [
  { grade: 'standard', label: 'Standard', description: '', warranty_days: 7, market_label: 'Incell', part_kobo: 1_400_000, price_updated_at: null },
  { grade: 'high', label: 'High quality', description: '', warranty_days: 14, market_label: 'JK', part_kobo: 2_500_000, price_updated_at: null },
  { grade: 'premium', label: 'Premium', description: '', warranty_days: 14, market_label: 'GX OLED', part_kobo: 3_700_000, price_updated_at: null },
]

function details(role: Role, status: JobStatus, over: Partial<Job> = {}, extra: Partial<JobDetails> = {}): JobDetails {
  const job: Job = {
    id: 'job-1', code: 'UF-AB12CD', customer_id: 'c1', technician_id: 't1', device_type: 'smartphone', category: 'screen_replacement',
    brand: 'iPhone', model: 'iPhone X', model_id: 40, issue_note: null, service_mode: 'drop_off', address: null,
    grade: 'premium', part_label: 'GX OLED', part_kobo: 3_700_000, part_pending: false, estimate_kobo: 4_550_000, price_confirmed: status !== 'requested' && status !== 'accepted',
    quoted_at: null, warranty_days: 14, warranty_until: null, warranty_reason: null, warranty_claimed_at: null, warranty_notes: null,
    warranty_photos: [], warranty_done_at: null, price_kobo: 4_550_000, is_repeat: false, status, status_note: null,
    payment_reference: 'Ada Obi GTB', payment_submitted_at: null, paid_at: null, intake_identifier: null, intake_notes: null, intake_photos: [],
    intake_at: null, repair_notes: null, parts_replaced: null, completion_photos: [], ready_at: null, completed_at: null, completed_by: null,
    dispute_reason: 'Screen flickers', refund_reference: null, created_at: '', updated_at: '',
    ...(role === 'customer' ? {} : { labour_kobo: 500_000, payout_kobo: 4_200_000, payout_status: 'not_due', part_payout_status: 'not_due' }),
    ...(role === 'admin' ? { commission_kobo: 350_000 } : {}),
    ...over,
  }
  return {
    job, viewer_role: role,
    breakdown: { part_kobo: job.part_kobo, part_pending: job.part_pending, part_label: job.part_label, grade: job.grade, grade_label: 'Premium',
      grade_description: null, service_charge_kobo: 850_000, total_kobo: job.price_kobo, estimate_kobo: job.estimate_kobo,
      price_confirmed: job.price_confirmed, warranty_days: 14, warranty_until: job.warranty_until },
    customer: { name: 'Ada Obi', phone: null },
    technician: { name: 'Emeka Okafor', shop_name: 'Emeka Phone Clinic', shop_address: null, area: 'Ikeja', phone: null },
    events: [], review: null,
    payment_account: role === 'technician' ? null : { bank_name: 'GTBank', account_number: '0123456789', account_name: 'UrbanFix Escrow', support_phone: null },
    auto_release_hours: 72,
    ...extra,
  }
}

const onChanged = jest.fn()
beforeEach(() => {
  useSession.setState({ status: 'ready', profile: { id: 'c1', role: 'customer', full_name: 'Ada Obi', phone: '+2348031234567', area: null, address: null } })
  m.gradeOptions.mockResolvedValue(GRADES)
  m.getMyTechnician.mockResolvedValue({ tech: {} as never, priv: null, services: [
    { technician_id: 't1', device_type: 'smartphone', category: 'screen_replacement', price_kobo: 500_000, is_active: true },
    { technician_id: 't1', device_type: 'smartphone', category: 'water_damage', price_kobo: 800_000, is_active: true },
  ] })
  m.listModels.mockResolvedValue([])
})

describe('customer', () => {
  test('nothing to pay before the technician confirms the price', () => {
    render(<JobActions d={details('customer', 'accepted')} onChanged={onChanged} />)
    expect(screen.queryByTestId('paid')).toBeNull()
    expect(screen.getByTestId('cancel')).toBeTruthy()
  })

  test('confirmed price: Part + Service charge, the estimate it replaced, and the UrbanFix account', async () => {
    render(<JobActions d={details('customer', 'quoted', { price_kobo: 9_600_000, part_kobo: 8_500_000 }, {})} onChanged={onChanged} />)
    const b = screen.getByTestId('breakdown')
    expect(within(b).getByText('Service charge')).toBeTruthy()
    expect(within(b).getByText(/Estimate at booking was ₦45,500/)).toBeTruthy()
    expect(screen.queryByText(/repair fee|UrbanFix fee/i)).toBeNull()
    expect(screen.getByText('0123456789')).toBeTruthy()
    fireEvent.press(screen.getByTestId('paid'))
    await waitFor(() => expect(m.submitPayment).toHaveBeenCalledWith('job-1', 'Ada Obi'))
    expect(onChanged).toHaveBeenCalled()
  })

  test('can decline the price', async () => {
    render(<JobActions d={details('customer', 'quoted')} onChanged={onChanged} />)
    fireEvent.press(screen.getByTestId('decline-quote'))
    fireEvent.press(screen.getByTestId('decline-quote-send'))
    await waitFor(() => expect(m.declineQuote).toHaveBeenCalledWith('job-1', ''))
  })

  test('pay is disabled without a payer name; server errors stay on screen', async () => {
    m.submitPayment.mockRejectedValueOnce({ code: 'P0001', message: "This repair is cancelled, so that can't be done now." })
    render(<JobActions d={details('customer', 'quoted')} onChanged={onChanged} />)
    fireEvent.changeText(screen.getByLabelText('Name on the account you paid from'), ' ')
    expect(screen.getByTestId('paid')).toBeDisabled()
    fireEvent.changeText(screen.getByLabelText('Name on the account you paid from'), 'Ada Obi')
    fireEvent.press(screen.getByTestId('paid'))
    expect(await screen.findByText("This repair is cancelled, so that can't be done now.")).toBeTruthy()
    expect(onChanged).not.toHaveBeenCalled()
  })

  test('confirm asks before releasing money', async () => {
    render(<JobActions d={details('customer', 'awaiting_confirmation')} onChanged={onChanged} />)
    fireEvent.press(screen.getByTestId('confirm'))
    expect(m.confirmCompletion).not.toHaveBeenCalled()
    await pressAlert('Release payment')
    await waitFor(() => expect(m.confirmCompletion).toHaveBeenCalledWith('job-1'))
  })

  test('report a problem needs a real description', async () => {
    render(<JobActions d={details('customer', 'in_repair')} onChanged={onChanged} />)
    fireEvent.press(screen.getByTestId('dispute'))
    fireEvent.changeText(screen.getByTestId('dispute-reason'), 'bad')
    expect(screen.getByTestId('dispute-send')).toBeDisabled()
    fireEvent.changeText(screen.getByTestId('dispute-reason'), 'Technician never showed up')
    fireEvent.press(screen.getByTestId('dispute-send'))
    await waitFor(() => expect(m.raiseDispute).toHaveBeenCalledWith('job-1', 'Technician never showed up'))
  })

  test('warranty: offered while open, needs a reason', async () => {
    const until = new Date(Date.now() + 5 * 86400_000).toISOString()
    render(<JobActions d={details('customer', 'completed', { warranty_until: until })} onChanged={onChanged} />)
    fireEvent.press(screen.getByTestId('claim-warranty'))
    expect(screen.getByTestId('warranty-send')).toBeDisabled()
    fireEvent.changeText(screen.getByTestId('warranty-reason'), 'Touch stopped working again')
    fireEvent.press(screen.getByTestId('warranty-send'))
    await waitFor(() => expect(m.claimWarranty).toHaveBeenCalledWith('job-1', 'Touch stopped working again'))
  })

  test('no warranty button once expired or used', () => {
    const past = new Date(Date.now() - 86400_000).toISOString()
    const { unmount } = render(<JobActions d={details('customer', 'completed', { warranty_until: past })} onChanged={onChanged} />)
    expect(screen.queryByTestId('claim-warranty')).toBeNull()
    unmount()
    const future = new Date(Date.now() + 86400_000).toISOString()
    render(<JobActions d={details('customer', 'completed', { warranty_until: future, warranty_claimed_at: past })} onChanged={onChanged} />)
    expect(screen.queryByTestId('claim-warranty')).toBeNull()
  })

  test('rating: tap a star, then submit', async () => {
    render(<JobActions d={details('customer', 'completed')} onChanged={onChanged} />)
    fireEvent.press(screen.getByLabelText('4 stars'))
    fireEvent.press(screen.getByTestId('submit-review'))
    await waitFor(() => expect(m.submitReview).toHaveBeenCalledWith('job-1', 4, ''))
  })
})

describe('technician', () => {
  beforeEach(() => useSession.setState({ profile: { id: 't1', role: 'technician', full_name: 'Emeka', phone: '+2348091234567', area: null, address: null } }))

  test('accept shows what they get', async () => {
    render(<JobActions d={details('technician', 'requested')} onChanged={onChanged} />)
    fireEvent.press(screen.getByText('Accept · you earn about ₦42,000'))
    await waitFor(() => expect(m.acceptJob).toHaveBeenCalledWith('job-1'))
  })

  test('quote: listed price is used, IMEI and photo required, confirmation shows the customer total', async () => {
    render(<JobActions d={details('technician', 'accepted')} onChanged={onChanged} />)
    await waitFor(() => expect(m.gradeOptions).toHaveBeenCalledWith(40, 'screen_replacement'))
    fireEvent.press(screen.getByTestId('save-intake'))
    expect(await screen.findByText(/Enter the IMEI or serial number/)).toBeTruthy()
    fireEvent.changeText(screen.getByTestId('imei'), '490154203237518')
    fireEvent.press(screen.getByTestId('save-intake'))
    expect(await screen.findByText('Add at least one photo of the device.')).toBeTruthy()
    fireEvent.press(screen.getByTestId('fake-photo-intake'))
    // Customer total: ₦37,000 part + ₦5,000 fee + ₦3,500 UrbanFix = ₦45,500
    expect(screen.getByText('₦45,500')).toBeTruthy()
    fireEvent.press(screen.getByTestId('save-intake'))
    expect(alertSpy.mock.calls.at(-1)![1]).toMatch(/₦45,500/)
    await pressAlert('Send price')
    await waitFor(() => expect(m.recordIntake).toHaveBeenCalledWith('job-1', expect.objectContaining({
      identifier: '490154203237518', photos: ['job-1/intake-0.jpg'], modelId: 40, category: 'screen_replacement', grade: 'premium', partKobo: null,
    })))
  })

  test('quote: changing quality re-prices from the list', async () => {
    render(<JobActions d={details('technician', 'accepted')} onChanged={onChanged} />)
    await screen.findByText('Standard · ₦14,000')
    fireEvent.press(screen.getByLabelText('Standard · ₦14,000'))
    // ₦14,000 + ₦5,000 + ₦2,500
    expect(screen.getByText('₦21,500')).toBeTruthy()
  })

  test('quote: unlisted part needs a typed price', async () => {
    m.gradeOptions.mockResolvedValue(GRADES.map((g) => ({ ...g, part_kobo: null })))
    render(<JobActions d={details('technician', 'accepted', { model_id: null, model: 'Oppo A78', part_pending: true, part_kobo: 0 })} onChanged={onChanged} />)
    fireEvent.changeText(screen.getByTestId('imei'), '490154203237518')
    fireEvent.press(screen.getByTestId('fake-photo-intake'))
    fireEvent.press(await screen.findByTestId('save-intake'))
    expect(await screen.findByText('Enter the part price in naira.')).toBeTruthy()
    fireEvent.changeText(screen.getByTestId('part-price'), '60000')
    fireEvent.press(screen.getByTestId('save-intake'))
    await pressAlert('Send price')
    await waitFor(() => expect(m.recordIntake).toHaveBeenCalledWith('job-1', expect.objectContaining({ modelId: null, modelText: 'Oppo A78', partKobo: 6_000_000 })))
  })

  test('finish repair: description and photos required; reminds the grade paid for', async () => {
    render(<JobActions d={details('technician', 'in_repair')} onChanged={onChanged} />)
    expect(screen.getByText(/The customer paid for: Premium \(GX OLED\)/)).toBeTruthy()
    fireEvent.press(screen.getByTestId('mark-ready'))
    expect(m.markReady).not.toHaveBeenCalled()
    fireEvent.changeText(screen.getByTestId('fix-notes'), 'Replaced screen')
    fireEvent.press(screen.getByTestId('fake-photo-done'))
    fireEvent.press(screen.getByTestId('mark-ready'))
    await waitFor(() => expect(m.markReady).toHaveBeenCalledWith('job-1', 'Replaced screen', '', ['job-1/done-0.jpg']))
  })

  test('warranty fix shows the customer\'s complaint', () => {
    render(<JobActions d={details('technician', 'warranty', { warranty_reason: 'Touch dead on left' })} onChanged={onChanged} />)
    expect(screen.getByText('Fix it under warranty')).toBeTruthy()
    expect(screen.getByText(/Touch dead on left/)).toBeTruthy()
  })

  test('technicians never see the escrow bank account or a pay button', () => {
    render(<JobActions d={details('technician', 'quoted')} onChanged={onChanged} />)
    expect(screen.queryByText('0123456789')).toBeNull()
    expect(screen.queryByTestId('paid')).toBeNull()
  })
})

describe('admin', () => {
  test('confirm payment in one tap', async () => {
    render(<JobActions d={details('admin', 'payment_submitted')} onChanged={onChanged} />)
    fireEvent.press(screen.getByTestId('admin-confirm'))
    await waitFor(() => expect(m.adminConfirmPayment).toHaveBeenCalledWith('job-1'))
  })

  test('part money and repair fee are paid separately', async () => {
    m.adminTechnicianDetails.mockResolvedValue({ technician: {} as never, profile: {} as never, services: [],
      private: { id: 't1', bank_name: 'GTBank', account_number: '0123456789', account_name: 'Emeka Okafor', nin: null, id_document_path: null } })
    const { unmount } = render(<JobActions d={details('admin', 'in_repair', { part_payout_status: 'due' })} onChanged={onChanged} />)
    expect(await screen.findByText('Send part money ₦37,000')).toBeTruthy()
    fireEvent.changeText(screen.getByLabelText('Transfer reference'), 'GTB-P-1')
    fireEvent.press(screen.getByText('Mark as sent'))
    await waitFor(() => expect(m.adminMarkPartPayoutPaid).toHaveBeenCalledWith('job-1', 'GTB-P-1'))
    unmount()
    render(<JobActions d={details('admin', 'completed', { payout_status: 'due', part_payout_status: 'paid' })} onChanged={onChanged} />)
    expect(await screen.findByText('Send repair fee ₦5,000')).toBeTruthy()
  })

  test('refund needs a note and a reference, and warns if part money already went out', async () => {
    render(<JobActions d={details('admin', 'disputed', { part_payout_status: 'paid' })} onChanged={onChanged} />)
    expect(screen.getByText(/already sent to the technician/)).toBeTruthy()
    fireEvent.press(screen.getByLabelText('Refund customer'))
    fireEvent.press(screen.getByText('Mark ₦45,500 refunded'))
    expect(m.adminResolveDispute).not.toHaveBeenCalled()
    fireEvent.changeText(screen.getByLabelText('Explain the decision (both sides see this)'), 'Repair failed twice')
    fireEvent.changeText(screen.getByLabelText('Refund transfer reference'), 'GTB-RF-1')
    fireEvent.press(screen.getByText('Mark ₦45,500 refunded'))
    await waitFor(() => expect(m.adminResolveDispute).toHaveBeenCalledWith('job-1', 'refund', 'Repair failed twice', 'GTB-RF-1'))
  })
})
