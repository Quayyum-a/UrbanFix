// Ask for the phone's location once and turn it into one of our areas
// (and a street address for home visits). Never throws: returns why it failed.
import * as Location from 'expo-location'
import { AREAS } from '@/constants/catalog'

/** Rough centre of each area we serve. */
export const AREA_CENTRES: Record<(typeof AREAS)[number], [number, number]> = {
  'Ikeja': [6.6018, 3.3515], 'Ikeja GRA': [6.5790, 3.3550], 'Allen': [6.6010, 3.3580], 'Opebi': [6.5960, 3.3660],
  'Alausa': [6.6170, 3.3590], 'Oregun': [6.6120, 3.3740], 'Ogba': [6.6270, 3.3410], 'Agidingbi': [6.6100, 3.3570],
  'Maryland': [6.5720, 3.3660], 'Ojodu': [6.6440, 3.3800], 'Agege': [6.6180, 3.3200], 'Oshodi': [6.5550, 3.3430],
  'Ketu': [6.5970, 3.3890], 'Magodo': [6.6200, 3.3940], 'Gbagada': [6.5540, 3.3880], 'Yaba': [6.5100, 3.3790],
  'Surulere': [6.5000, 3.3530], 'Lekki': [6.4470, 3.4730], 'Victoria Island': [6.4280, 3.4210], 'Ikoyi': [6.4520, 3.4350],
}

/** Further than this from every area centre: outside where we work today. */
export const MAX_AREA_KM = 12

export function distanceKm(a: [number, number], b: [number, number]): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b[0] - a[0])
  const dLng = rad(b[1] - a[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

/** A place name from the phone's map lookup that matches one of our areas, if any. */
export function areaFromNames(names: (string | null | undefined)[]): string | null {
  const text = names.filter(Boolean).join(' | ').toLowerCase()
  if (!text) return null
  // Longest names first so "Ikeja GRA" wins over "Ikeja".
  const sorted = [...AREAS].sort((a, b) => b.length - a.length)
  return sorted.find((a) => text.includes(a.toLowerCase())) ?? null
}

/** Nearest area to a point, or null if we don't cover it. */
export function nearestArea(lat: number, lng: number): { area: string; km: number } | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  let best: { area: string; km: number } | null = null
  for (const [area, centre] of Object.entries(AREA_CENTRES)) {
    const km = distanceKm([lat, lng], centre)
    if (!best || km < best.km) best = { area, km }
  }
  return best && best.km <= MAX_AREA_KM ? best : null
}

export type DetectResult =
  | { ok: true; area: string; address: string | null }
  | { ok: false; reason: 'denied' | 'outside' | 'unavailable'; nearby?: string | null }

function streetAddress(p: Location.LocationGeocodedAddress | undefined): string | null {
  if (!p) return null
  const street = [p.streetNumber, p.street].filter(Boolean).join(' ')
  const parts = [street || p.name, p.district ?? p.subregion, p.city].filter((x): x is string => !!x && x.trim().length > 1)
  const unique = parts.filter((x, i) => parts.indexOf(x) === i)
  const out = unique.join(', ').slice(0, 200)
  return out.length >= 8 ? out : null
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Location timed out')), ms)
    p.then((v) => { clearTimeout(t); resolve(v) }, (e) => { clearTimeout(t); reject(e) })
  })
}

export async function detectArea(): Promise<DetectResult> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync()
    if (perm.status !== 'granted') return { ok: false, reason: 'denied' }
    const pos = (await Location.getLastKnownPositionAsync({ maxAge: 10 * 60_000, requiredAccuracy: 2000 }))
      ?? (await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), 12_000))
    const { latitude, longitude } = pos.coords
    let place: Location.LocationGeocodedAddress | undefined
    try { place = (await Location.reverseGeocodeAsync({ latitude, longitude }))[0] } catch { place = undefined }
    // Neighbourhood names are most precise; "city" is often the whole LGA (e.g. Ikeja), so it comes last.
    const area = areaFromNames([place?.district, place?.name, place?.street])
      ?? nearestArea(latitude, longitude)?.area
      ?? areaFromNames([place?.subregion, place?.city])
    if (!area) return { ok: false, reason: 'outside', nearby: place?.city ?? place?.region ?? null }
    return { ok: true, area, address: streetAddress(place) }
  } catch {
    return { ok: false, reason: 'unavailable' }
  }
}

/** Distance between two of our areas (by their centres), or null if either is unknown. */
export function areaDistanceKm(a: string | null | undefined, b: string | null | undefined): number | null {
  const ca = a ? AREA_CENTRES[a as keyof typeof AREA_CENTRES] : undefined
  const cb = b ? AREA_CENTRES[b as keyof typeof AREA_CENTRES] : undefined
  return ca && cb ? distanceKm(ca, cb) : null
}

/** "Near you" / "about 4 km away" for a technician's area. */
export function nearLabel(mine: string | null | undefined, theirs: string | null | undefined): string | null {
  const km = areaDistanceKm(mine, theirs)
  if (km === null) return null
  return km < 2 ? 'Near you' : `About ${Math.round(km)} km away`
}
