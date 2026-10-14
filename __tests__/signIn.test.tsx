import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import React from 'react'
import SignIn from '@/app/sign-in'
import * as api from '@/lib/api'
import { useSession } from '@/lib/session'

jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  phoneRegistered: jest.fn(),
  signIn: jest.fn(),
  signUp: jest.fn(),
}))
const m = api as jest.Mocked<typeof api>

const typePin = (pin: string) => { for (const d of pin) fireEvent.press(screen.getByTestId(`pin-${d}`)) }

async function toPinStep(registered: boolean) {
  m.phoneRegistered.mockResolvedValue(registered)
  render(<SignIn />)
  fireEvent.changeText(screen.getByTestId('phone'), '0803 123 4567')
  fireEvent.press(screen.getByTestId('continue'))
  await screen.findByText(registered ? 'Enter your PIN' : 'Create a 6-digit PIN')
}

beforeEach(() => { useSession.setState({ status: 'signed_out', profile: null, session: null }) })

test('continue is disabled until the phone number is valid', () => {
  render(<SignIn />)
  expect(screen.getByTestId('continue')).toBeDisabled()
  fireEvent.changeText(screen.getByTestId('phone'), '0803 123')
  expect(screen.getByTestId('continue')).toBeDisabled()
  fireEvent.changeText(screen.getByTestId('phone'), '08031234567')
  expect(screen.getByTestId('continue')).toBeEnabled()
})

test('letters and symbols typed into the phone box are ignored', () => {
  render(<SignIn />)
  fireEvent.changeText(screen.getByTestId('phone'), "0803abc;'123 4567")
  expect(screen.getByTestId('phone').props.value).toBe('0803123 4567')
})

test('returning user: PIN submits automatically on the 6th digit', async () => {
  m.signIn.mockResolvedValue(undefined)
  await toPinStep(true)
  typePin('48291')
  expect(m.signIn).not.toHaveBeenCalled()
  typePin('5')
  await waitFor(() => expect(m.signIn).toHaveBeenCalledWith('+2348031234567', '482915'))
})

test('new user: weak PIN refused, mismatch restarts, matching PINs sign up', async () => {
  m.signUp.mockResolvedValue(undefined)
  await toPinStep(false)
  typePin('123456')
  expect(await screen.findByText("Don't use a sequence like 123456.")).toBeTruthy()
  typePin('482915')
  await screen.findByText('Enter the PIN again')
  typePin('482916')
  expect(await screen.findByText("The PINs didn't match. Create your PIN again.")).toBeTruthy()
  expect(m.signUp).not.toHaveBeenCalled()
  typePin('482915')
  await screen.findByText('Enter the PIN again')
  typePin('482915')
  await waitFor(() => expect(m.signUp).toHaveBeenCalledWith('+2348031234567', '482915'))
})

test('wrong PIN 5 times locks the keypad for a minute', async () => {
  m.signIn.mockRejectedValue({ message: 'Invalid login credentials' })
  await toPinStep(true)
  for (let i = 1; i <= 5; i++) {
    typePin('482915')
    await waitFor(() => expect(m.signIn).toHaveBeenCalledTimes(i))
  }
  expect(await screen.findByText(/Too many wrong PINs/)).toBeTruthy()
  typePin('482915')
  await act(async () => {})
  expect(m.signIn).toHaveBeenCalledTimes(5)
})

test('network errors are shown in plain language', async () => {
  m.phoneRegistered.mockRejectedValue(new TypeError('Network request failed'))
  render(<SignIn />)
  fireEvent.changeText(screen.getByTestId('phone'), '08031234567')
  fireEvent.press(screen.getByTestId('continue'))
  expect(await screen.findByText('No internet connection. Check your data and try again.')).toBeTruthy()
})

test('already signed in goes straight to the right home', () => {
  useSession.setState({ status: 'ready', profile: { id: 'u', role: 'technician', full_name: 'Emeka', phone: '+2348031234567', area: null, address: null } })
  render(<SignIn />)
  expect(screen.getByTestId('redirect')).toHaveTextContent('redirect:/technician')
})
