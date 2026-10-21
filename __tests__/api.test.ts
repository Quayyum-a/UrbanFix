import * as api from '@/lib/api'
import { supabase } from '@/lib/supabase'

const rpc = supabase.rpc as jest.Mock
const auth = supabase.auth as unknown as Record<string, jest.Mock>

describe('friendlyError', () => {
  test.each([
    [{ code: 'P0001', message: 'Only the customer can do that.' }, 'Only the customer can do that.'],
    [new TypeError('Network request failed'), 'No internet connection. Check your data and try again.'],
    [{ name: 'AuthRetryableFetchError', message: '' }, 'No internet connection. Check your data and try again.'],
    [{ status: 429, message: 'Request rate limit reached' }, 'Too many attempts. Wait a minute and try again.'],
    [{ message: 'Invalid login credentials' }, 'Wrong PIN. Try again.'],
    [{ message: 'User already registered' }, 'This number already has an account. Enter your PIN instead.'],
    [{ message: 'JWT expired' }, 'Your session expired. Please sign in again.'],
    [{ message: 'permission denied for table jobs' }, "You don't have access to that."],
    [{ status: 422, code: 'email_provider_disabled', message: 'Email logins are disabled' },
      'Sign-in is blocked by a Supabase setting: turn on the Email provider in Authentication → Sign In / Providers (see the setup guide).'],
    [{ status: 400, code: 'email_provider_disabled', message: 'Email signups are disabled' },
      'Sign-in is blocked by a Supabase setting: turn on the Email provider in Authentication → Sign In / Providers (see the setup guide).'],
    [{ code: '23514', message: 'new row violates check constraint "payout_math"' }, 'Something went wrong. Please try again.'],
    [null, 'Something went wrong. Please try again.'],
  ])('%p', (err, msg) => expect(api.friendlyError(err)).toBe(msg))

  test('never leaks raw database errors', () => {
    expect(api.friendlyError({ code: '42P01', message: 'relation "public.secret" does not exist' })).not.toMatch(/relation|public/)
  })
})

describe('auth', () => {
  test('signs in with the normalized phone and derived password', async () => {
    auth.signInWithPassword!.mockResolvedValue({ error: null })
    await api.signIn('0803 123 4567', '482915')
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: '2348031234567@phone.urbanfix.app', password: 'uf1:482915:2348031234567' })
  })

  test('rejects an invalid number before calling the server', async () => {
    await expect(api.signIn('12345', '482915')).rejects.toThrow('valid Nigerian')
    expect(auth.signInWithPassword).not.toHaveBeenCalled()
  })

  test('explains the Supabase setting when sign-up returns no session', async () => {
    auth.signUp!.mockResolvedValue({ data: { session: null }, error: null })
    await expect(api.signUp('08031234567', '482915')).rejects.toThrow('Confirm email')
  })
})

describe('rpc calls', () => {
  test('strips NUL characters and trims text before sending', async () => {
    rpc.mockResolvedValue({ data: {}, error: null })
    await api.sendMessage('job-1', '  hi\u0000 there  ')
    expect(rpc).toHaveBeenCalledWith('send_message', { p_job_id: 'job-1', p_body: 'hi there' })
  })

  test('createJob never sends a price, and drops the address for drop-off', async () => {
    rpc.mockResolvedValue({ data: { id: 'j1' }, error: null })
    await api.createJob({ technicianId: 't1', deviceType: 'smartphone', brand: 'iphone', modelId: 7, modelText: 'ignored',
      category: 'screen_replacement', grade: 'premium', mode: 'drop_off', address: '12 Allen Avenue', issueNote: '  ' })
    const [, args] = rpc.mock.calls[0]!
    expect(args).toEqual({
      p_technician_id: 't1', p_device_type: 'smartphone', p_brand: 'iphone', p_model_id: 7, p_model_text: null,
      p_category: 'screen_replacement', p_grade: 'premium', p_issue_note: null, p_service_mode: 'drop_off', p_address: null,
    })
    expect(JSON.stringify(args)).not.toMatch(/price|kobo/)
  })

  test('unlisted model sends the typed name', async () => {
    rpc.mockResolvedValue({ data: { id: 'j1' }, error: null })
    await api.createJob({ technicianId: 't1', deviceType: 'smartphone', brand: 'other_android', modelId: null, modelText: ' Oppo  A78 ',
      category: 'screen_replacement', grade: 'standard', mode: 'visit', address: '12 Allen Avenue, Ikeja' })
    expect(rpc.mock.calls[0]![1]).toMatchObject({ p_model_id: null, p_model_text: 'Oppo A78', p_address: '12 Allen Avenue, Ikeja' })
  })

  test('recordIntake sends the technician\'s confirmation fields', async () => {
    rpc.mockResolvedValue({ data: { id: 'j1' }, error: null })
    await api.recordIntake('j1', { identifier: '490154203237518', notes: '', photos: ['j1/a.jpg'], modelId: 3, category: 'water_damage', grade: null, partKobo: 0 })
    expect(rpc).toHaveBeenCalledWith('record_intake', {
      p_job_id: 'j1', p_identifier: '490154203237518', p_notes: null, p_photos: ['j1/a.jpg'], p_model_id: 3, p_model_text: null,
      p_category: 'water_damage', p_grade: null, p_part_kobo: 0,
    })
  })

  test('errors from the server are thrown for the screen to show', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'This repair is paid, so that can\'t be done now.' } })
    await expect(api.cancelJob('j1')).rejects.toMatchObject({ code: 'P0001' })
  })
})
