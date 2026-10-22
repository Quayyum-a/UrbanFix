import * as Location from 'expo-location'
import * as fc from 'fast-check'
import { AREAS } from '@/constants/catalog'
import { AREA_CENTRES, areaFromNames, detectArea, distanceKm, nearestArea, nearLabel } from '@/lib/location'

const L = Location as jest.Mocked<typeof Location>

describe('area matching', () => {
  test('every area we list has a centre', () => {
    for (const a of AREAS) expect(AREA_CENTRES[a]).toBeDefined()
  })

  test('each centre maps back to its own area', () => {
    for (const [a, [lat, lng]] of Object.entries(AREA_CENTRES)) expect(nearestArea(lat, lng)?.area).toBe(a)
  })

  test('outside Lagos (Abuja, Ibadan) is not covered', () => {
    expect(nearestArea(9.0765, 7.3986)).toBeNull()
    expect(nearestArea(7.3775, 3.947)).toBeNull()
  })

  test('nonsense coordinates are rejected, never thrown', () => {
    expect(nearestArea(NaN, 3.35)).toBeNull()
    expect(nearestArea(Infinity, -Infinity)).toBeNull()
    fc.assert(fc.property(fc.double(), fc.double(), (a, b) => { nearestArea(a, b) }))
  })

  test('names: the longer, more specific area wins', () => {
    expect(areaFromNames(['Ikeja GRA', 'Ikeja'])).toBe('Ikeja GRA')
    expect(areaFromNames(['Allen Avenue'])).toBe('Allen')
    expect(areaFromNames(['victoria island'])).toBe('Victoria Island')
    expect(areaFromNames([null, undefined, ''])).toBeNull()
    expect(areaFromNames(['Wuse 2'])).toBeNull()
  })

  test('distances and "near you" labels', () => {
    expect(distanceKm([6.6, 3.35], [6.6, 3.35])).toBe(0)
    expect(nearLabel('Ikeja', 'Ikeja')).toBe('Near you')
    expect(nearLabel('Ikeja', 'Lekki')).toMatch(/^About \d+ km away$/)
    expect(nearLabel(null, 'Ikeja')).toBeNull()
    expect(nearLabel('Ikeja', 'Somewhere else')).toBeNull()
  })
})

describe('detectArea', () => {
  const at = (latitude: number, longitude: number) => ({ coords: { latitude, longitude } }) as never

  test('permission refused: says so, no location calls', async () => {
    L.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' } as never)
    expect(await detectArea()).toEqual({ ok: false, reason: 'denied' })
    expect(L.getCurrentPositionAsync).not.toHaveBeenCalled()
  })

  test('uses the neighbourhood name and builds a street address', async () => {
    L.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as never)
    L.getLastKnownPositionAsync.mockResolvedValue(at(6.6268, 3.3412))
    L.reverseGeocodeAsync.mockResolvedValue([{ streetNumber: '7', street: 'Otigba Street', district: 'Ogba', city: 'Ikeja' }] as never)
    expect(await detectArea()).toEqual({ ok: true, area: 'Ogba', address: '7 Otigba Street, Ogba, Ikeja' })
  })

  test('without a useful name, falls back to the nearest area by position', async () => {
    L.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as never)
    L.getLastKnownPositionAsync.mockResolvedValue(null)
    L.getCurrentPositionAsync.mockResolvedValue(at(6.5005, 3.3532))
    L.reverseGeocodeAsync.mockRejectedValue(new Error('geocoder offline'))
    expect(await detectArea()).toEqual({ ok: true, area: 'Surulere', address: null })
  })

  test('the city being "Ikeja" does not override a more precise position', async () => {
    L.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as never)
    L.getLastKnownPositionAsync.mockResolvedValue(at(6.5720, 3.3660))
    L.reverseGeocodeAsync.mockResolvedValue([{ city: 'Ikeja', region: 'Lagos' }] as never)
    expect(await detectArea()).toMatchObject({ ok: true, area: 'Maryland' })
  })

  test('far away: outside our areas, naming the place', async () => {
    L.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as never)
    L.getLastKnownPositionAsync.mockResolvedValue(at(9.0765, 7.3986))
    L.reverseGeocodeAsync.mockResolvedValue([{ city: 'Abuja', region: 'FCT' }] as never)
    expect(await detectArea()).toEqual({ ok: false, reason: 'outside', nearby: 'Abuja' })
  })

  test('GPS that never answers gives up instead of spinning forever', async () => {
    jest.useFakeTimers()
    L.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as never)
    L.getLastKnownPositionAsync.mockResolvedValue(null)
    L.getCurrentPositionAsync.mockReturnValue(new Promise(() => {}))
    const p = detectArea()
    await jest.advanceTimersByTimeAsync(13_000)
    expect(await p).toEqual({ ok: false, reason: 'unavailable' })
    jest.useRealTimers()
  })

  test('location services crashing is handled', async () => {
    L.requestForegroundPermissionsAsync.mockRejectedValue(new Error('Location services are disabled'))
    expect(await detectArea()).toEqual({ ok: false, reason: 'unavailable' })
  })
})
