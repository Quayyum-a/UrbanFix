import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import React from 'react'
import { Alert, Pressable, Text } from 'react-native'
import { JobActions } from '@/components/JobActions'
import * as api from '@/lib/api'
import { useSession } from '@/lib/session'
import type { Job, JobDetails, JobStatus, Role } from '@/lib/types'

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api')
  const fns = ['submitPayment', 'confirmCompletion', 'raiseDispute', 'submitReview', 'cancelJob', 'acceptJob', 'declineJob',
    'recordIntake', 'markReady', 'adminConfirmPayment', 'adminRejectPayment', 'adminResolveDispute', 'adminMarkPayoutPaid', 'adminTechnicianDetails']
  return { ...actual, ...Object.fromEntries(fns.map((f) => [f, jest.fn(() => Promise.resolve({}))])) }
})
// Photo upload needs a camera; replace the picker with a button that "adds" a photo.
jest.mock('@/components/PhotoPicker', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable: P, Text: T } = require('react-native')
  return {
    PhotoPicker: ({ value, onChange, prefix }: { value: string[]; onChange: (v: string[]) => void; prefix: string }) =>
      <P testID={`fake-photo-${prefix}`} onPress={() => onChange([...value, `job-1/${prefix}-${value.length}.jpg`])}><T>{value.length} photos</T></P>,
  }
})
void Pressable; void Text

const m = api as jest.Mocked<typeof api>
const alertSpy = jest.spyOn(Alert, 'alert')
/** Press the button with this label in the most recent Alert. */
const pressAlert = async (label: string) => {
  const buttons = alertSpy.mock.calls.at(-1)![2] as { text: string; onPress?: () => void }[]
  await act(async () => { buttons.find((b) => b.text === label)!.onPress!() })
}

function details(role: Role, status: JobStatus, over: Partial<Job> = {}, extra: Partial<JobDetails> = {}): JobDetails {
  return {
    job: {
      id: 'job-1', code: 'UF-AB12CD', customer_id: 'c1', technician_id: 't1', device_type: 'smartphone', category: 'screen_replacement',
      brand: 'Samsung', model: 'A54', issue_note: null, service_mode: 'drop_off', address: null, price_kobo: 2_500_000, commission_kobo: 250_000,
      payout_kobo: 2_250_000, is_repeat: false, status, status_note: null, payment_reference: 'Ada Obi GTB', payment_submitted_at: null, paid_at: null,
      intake_identifier: null, intake_notes: null, intake_photos: [], intake_at: null, repair_notes: null, parts_replaced: null, completion_photos: [],
      ready_at: null, completed_at: null, completed_by: null, dispute_reason: 'Screen flickers', refund_reference: null, payout_status: 'not_due',
      created_at: '', updated_at: '', ...over,
    },
    viewer_role: role,
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
})

describe('customer', () => {
  test('pay: shows UrbanFix account and sends the payer name', async () => {
    render(<JobActions d={details('customer', 'accepted')} onChanged={onChanged} />)
    expect(screen.getByText('0123456789')).toBeTruthy()
    expect(screen.getByText('UF-AB12CD')).toBeTruthy()
    fireEvent.press(screen.getByTestId('paid'))
    await waitFor(() => expect(m.submitPayment).toHaveBeenCalledWith('job-1', 'Ada Obi'))
    expect(onChanged).toHaveBeenCalled()
  })

  test('pay button is disabled when the payer name is cleared', () => {
    render(<JobActions d={details('customer', 'accepted')} onChanged={onChanged} />)
    fireEvent.changeText(screen.getByLabelText('Name on the account you paid from'), ' ')
    expect(screen.getByTestId('paid')).toBeDisabled()
  })

  test('server errors stay on screen and nothing refreshes', async () => {
    m.submitPayment.mockRejectedValueOnce({ code: 'P0001', message: "This repair is cancelled, so that can't be done now." })
    render(<JobActions d={details('customer', 'accepted')} onChanged={onChanged} />)
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
    render(<JobActions d={details('customer', 'paid')} onChanged={onChanged} />)
    fireEvent.press(screen.getByTestId('dispute'))
    fireEvent.changeText(screen.getByTestId('dispute-reason'), 'bad')
    expect(screen.getByTestId('dispute-send')).toBeDisabled()
    fireEvent.changeText(screen.getByTestId('dispute-reason'), 'Technician never showed up')
    fireEvent.press(screen.getByTestId('dispute-send'))
    await waitFor(() => expect(m.raiseDispute).toHaveBeenCalledWith('job-1', 'Technician never showed up'))
  })

  test('rating: tap a star, then submit', async () => {
    render(<JobActions d={details('customer', 'completed')} onChanged={onChanged} />)
    expect(screen.queryByTestId('submit-review')).toBeNull()
    fireEvent.press(screen.getByLabelText('4 stars'))
    fireEvent.press(screen.getByTestId('submit-review'))
    await waitFor(() => expect(m.submitReview).toHaveBeenCalledWith('job-1', 4, ''))
  })

  test('nothing to do once reviewed, or while waiting on others', () => {
    const { toJSON } = render(<JobActions d={details('customer', 'completed', {}, { review: { job_id: 'job-1', rating: 5, comment: null, created_at: '' } })} onChanged={onChanged} />)
    expect(toJSON()).toBeNull()
  })

  test('cancel asks first', async () => {
    render(<JobActions d={details('customer', 'requested')} onChanged={onChanged} />)
    fireEvent.press(screen.getByTestId('cancel'))
    await pressAlert('Cancel request')
    await waitFor(() => expect(m.cancelJob).toHaveBeenCalledWith('job-1', null))
  })
})

describe('technician', () => {
  test('accept shows what they earn, after fees', async () => {
    render(<JobActions d={details('technician', 'requested')} onChanged={onChanged} />)
    fireEvent.press(screen.getByText('Accept · you earn ₦22,500'))
    await waitFor(() => expect(m.acceptJob).toHaveBeenCalledWith('job-1'))
  })

  test('intake: requires a valid IMEI and at least one photo before saving', async () => {
    render(<JobActions d={details('technician', 'paid')} onChanged={onChanged} />)
    fireEvent.press(screen.getByTestId('save-intake'))
    expect(await screen.findByText(/Enter the IMEI or serial number/)).toBeTruthy()
    fireEvent.changeText(screen.getByTestId('imei'), '490154203237519')
    expect(await screen.findByText(/That IMEI doesn't look right/)).toBeTruthy()
    fireEvent.changeText(screen.getByTestId('imei'), '490154203237518')
    fireEvent.press(screen.getByTestId('save-intake'))
    expect(await screen.findByText('Add at least one photo of the device.')).toBeTruthy()
    fireEvent.press(screen.getByTestId('fake-photo-intake'))
    fireEvent.press(screen.getByTestId('save-intake'))
    await waitFor(() => expect(m.recordIntake).toHaveBeenCalledWith('job-1', '490154203237518', '', ['job-1/intake-0.jpg']))
  })

  test('finish repair: needs a description and photos', async () => {
    render(<JobActions d={details('technician', 'in_repair')} onChanged={onChanged} />)
    fireEvent.press(screen.getByTestId('mark-ready'))
    expect(m.markReady).not.toHaveBeenCalled()
    fireEvent.changeText(screen.getByTestId('fix-notes'), 'Replaced screen')
    fireEvent.press(screen.getByTestId('fake-photo-done'))
    fireEvent.press(screen.getByTestId('mark-ready'))
    await waitFor(() => expect(m.markReady).toHaveBeenCalledWith('job-1', 'Replaced screen', '', ['job-1/done-0.jpg']))
  })

  test('technicians never see the escrow bank account or a pay button', () => {
    render(<JobActions d={details('technician', 'accepted')} onChanged={onChanged} />)
    expect(screen.queryByText('0123456789')).toBeNull()
    expect(screen.queryByTestId('paid')).toBeNull()
  })
})

describe('admin', () => {
  test('confirm payment in one tap', async () => {
    render(<JobActions d={details('admin', 'payment_submitted')} onChanged={onChanged} />)
    expect(screen.getByText('Ada Obi GTB')).toBeTruthy()
    fireEvent.press(screen.getByTestId('admin-confirm'))
    await waitFor(() => expect(m.adminConfirmPayment).toHaveBeenCalledWith('job-1'))
  })

  test('refund needs a note and a reference', async () => {
    render(<JobActions d={details('admin', 'disputed')} onChanged={onChanged} />)
    fireEvent.press(screen.getByLabelText('Refund customer'))
    const btn = () => screen.getByText('Mark ₦25,000 refunded')
    fireEvent.press(btn())
    expect(m.adminResolveDispute).not.toHaveBeenCalled()
    fireEvent.changeText(screen.getByLabelText('Explain the decision (both sides see this)'), 'Repair failed twice')
    fireEvent.changeText(screen.getByLabelText('Refund transfer reference'), 'GTB-RF-1')
    fireEvent.press(btn())
    await waitFor(() => expect(m.adminResolveDispute).toHaveBeenCalledWith('job-1', 'refund', 'Repair failed twice', 'GTB-RF-1'))
  })
})
