import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import React from 'react'
import Book from '@/app/book'
import * as api from '@/lib/api'
import { useSession } from '@/lib/session'
import type { TechnicianMatch } from '@/lib/types'

jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  findTechnicians: jest.fn(),
  createJob: jest.fn(),
  updateMyProfile: jest.fn(),
}))
const m = api as jest.Mocked<typeof api>
const router = (globalThis as any).__router

const TECH: TechnicianMatch = {
  technician_id: 'tech-1', full_name: 'Emeka Okafor', shop_name: 'Emeka Phone Clinic', area: 'Ikeja',
  shop_address: 'Shop 14, Computer Village, Ikeja', bio: null, price_kobo: 2_500_000, rating: '4.8', reviews: 12, jobs_done: 30, used_before: false,
}

beforeEach(() => {
  ;(globalThis as any).__setParams({ device: 'smartphone' })
  useSession.setState({
    status: 'ready',
    profile: { id: 'c1', role: 'customer', full_name: 'Ada Obi', phone: '+2348031234567', area: 'Ikeja', address: null },
  })
  m.findTechnicians.mockResolvedValue([TECH])
  m.createJob.mockResolvedValue({ id: 'job-1' } as never)
  m.updateMyProfile.mockResolvedValue({} as never)
})

async function toConfirm() {
  render(<Book />)
  fireEvent.press(screen.getByTestId('problem-screen_replacement'))
  await waitFor(() => expect(m.findTechnicians).toHaveBeenCalledWith('smartphone', 'screen_replacement'))
  fireEvent.press(await screen.findByTestId('tech-tech-1'))
  await screen.findByText('Confirm your request')
}

test('4 taps from device to request for drop-off (no typing needed)', async () => {
  await toConfirm()
  expect(screen.getByText('Request repair · ₦25,000')).toBeTruthy()
  fireEvent.press(screen.getByTestId('request'))
  await waitFor(() => expect(m.createJob).toHaveBeenCalledWith(expect.objectContaining({
    technicianId: 'tech-1', deviceType: 'smartphone', category: 'screen_replacement', mode: 'drop_off',
  })))
  expect(router.replace).toHaveBeenCalledWith('/job/job-1')
})

test('home visit needs an address before it can be requested, then saves it to the profile', async () => {
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

test('server refusals (e.g. too many open requests) are shown and nothing navigates', async () => {
  m.createJob.mockRejectedValue({ code: 'P0001', message: 'You have 3 repairs waiting. Finish or cancel one first.' })
  await toConfirm()
  fireEvent.press(screen.getByTestId('request'))
  expect(await screen.findByText('You have 3 repairs waiting. Finish or cancel one first.')).toBeTruthy()
  expect(router.replace).not.toHaveBeenCalled()
})

test('no technicians available shows a helpful empty state', async () => {
  m.findTechnicians.mockResolvedValue([])
  render(<Book />)
  fireEvent.press(screen.getByTestId('problem-water_damage'))
  expect(await screen.findByText('No technicians available for this yet')).toBeTruthy()
})

test('an unknown device in the link falls back to phone repairs', () => {
  ;(globalThis as any).__setParams({ device: '<script>' })
  render(<Book />)
  expect(screen.getByTestId('problem-screen_replacement')).toBeTruthy()
})

test('technicians cannot open the booking screen', () => {
  useSession.setState({ profile: { id: 't', role: 'technician', full_name: 'Emeka', phone: '+2348031234567', area: null, address: null } })
  render(<Book />)
  expect(screen.getByTestId('redirect')).toHaveTextContent('redirect:/technician')
})
