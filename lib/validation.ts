// Client-side checks for instant feedback. They mirror the database rules in
// database/urbanfix.sql, which remain the real enforcement.

/** Remove characters Postgres can't store and trim/collapse whitespace. */
export function clean(input: string | null | undefined): string {
  return (input ?? '').replace(/\u0000/g, '').replace(/\s+/g, ' ').trim()
}

// ---------- phone ----------
/** Returns +234XXXXXXXXXX for a valid Nigerian mobile number, else null. */
export function normalizePhone(input: string): string | null {
  let d = (input ?? '').replace(/[^0-9]/g, '')
  if (/^0[789][01]\d{8}$/.test(d)) d = '234' + d.slice(1)
  else if (/^[789][01]\d{8}$/.test(d)) d = '234' + d
  return /^234[789][01]\d{8}$/.test(d) ? '+' + d : null
}

/** "+2348031234567" -> "0803 123 4567" */
export function displayPhone(e164: string | null | undefined): string {
  if (!e164) return ''
  const local = '0' + e164.replace(/^\+234/, '')
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`
}

/** Supabase Auth account email for a phone (the app never shows this). */
export function phoneToEmail(e164: string): string {
  return `${e164.replace(/^\+/, '')}@phone.urbanfix.app`
}

// ---------- PIN ----------
export const PIN_LENGTH = 6

const WEAK_PINS = new Set(['123456', '654321', '123123', '121212', '112233', '000000', '111111', '696969', '123321', '102030', '100200'])

/** Returns an error message, or null if the PIN is acceptable. */
export function pinProblem(pin: string): string | null {
  if (!new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)) return `Your PIN must be ${PIN_LENGTH} digits.`
  if (/^(\d)\1+$/.test(pin)) return "Don't use the same digit for every number."
  const digits = pin.split('').map(Number)
  const steps = digits.slice(1).map((d, i) => d - digits[i]!)
  if (steps.every((s) => s === 1) || steps.every((s) => s === -1)) return "Don't use a sequence like 123456."
  if (WEAK_PINS.has(pin)) return 'That PIN is too easy to guess. Pick another.'
  return null
}

/**
 * The Supabase Auth password derived from the PIN. Supabase requires 6+ characters
 * and stores only a bcrypt hash; including the phone means equal PINs don't share
 * a password.
 */
export function pinToPassword(pin: string, e164: string): string {
  return `uf1:${pin}:${e164.replace(/^\+/, '')}`
}

// ---------- names, addresses ----------
const LETTER = 'A-Za-zÀ-ÖØ-öø-ɏḀ-ỿ'
const NAME_RE = new RegExp(`^[${LETTER}][${LETTER}̀-ͯ .'-]*$`)
const TWO_LETTERS = new RegExp(`[${LETTER}].*[${LETTER}]`)

export function nameProblem(raw: string): string | null {
  const v = clean(raw)
  if (v.length < 2 || v.length > 80 || !NAME_RE.test(v) || !TWO_LETTERS.test(v)) {
    return 'Enter your name (letters only, at least 2).'
  }
  return null
}

export function addressProblem(raw: string, { required = true } = {}): string | null {
  const v = clean(raw)
  if (!v) return required ? 'Enter the address (at least 10 characters).' : null
  if (v.length < 10) return 'Add more detail, like street and landmark (at least 10 characters).'
  if (v.length > 200) return 'Keep the address under 200 characters.'
  return null
}

// ---------- technician details ----------
export function accountNumberProblem(raw: string): string | null {
  const v = (raw ?? '').replace(/\s/g, '')
  if (!/^\d{10}$/.test(v)) return 'Account number must be 10 digits.'
  if (/^(\d)\1+$/.test(v)) return 'Enter your real account number.'
  return null
}

export function ninProblem(raw: string): string | null {
  const v = (raw ?? '').replace(/\s/g, '')
  if (!/^\d{11}$/.test(v)) return 'NIN must be 11 digits.'
  if (/^(\d)\1+$/.test(v)) return 'Enter your real NIN.'
  return null
}

export function luhnOk(digits: string): boolean {
  let sum = 0
  let dbl = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i])
    if (dbl) { n *= 2; if (n > 9) n -= 9 }
    sum += n
    dbl = !dbl
  }
  return sum % 10 === 0
}

/** IMEI (15 digits with valid checksum) or a 4-30 character serial number. */
export function deviceIdProblem(raw: string): string | null {
  const v = (raw ?? '').replace(/\s/g, '').toUpperCase()
  if (!/^[A-Z0-9-]{4,30}$/.test(v)) return 'Enter the IMEI or serial number (4 to 30 letters or digits).'
  if (/^\d{15}$/.test(v) && !luhnOk(v)) return "That IMEI doesn't look right. Dial *#06# on the phone to check it."
  if (/^(.)\1+$/.test(v)) return 'Enter the real IMEI or serial number.'
  return null
}

// ---------- money ----------
export const MIN_PRICE_KOBO = 50_000
export const MAX_PRICE_KOBO = 500_000_000

/** "25,000" or "₦25000" -> 2500000 kobo. Whole naira only. */
export function parseNairaToKobo(input: string): number | null {
  const v = (input ?? '').replace(/[₦,\s]/g, '')
  if (!/^\d{1,9}$/.test(v)) return null
  return Number(v) * 100
}

export function priceProblem(input: string): string | null {
  const k = parseNairaToKobo(input)
  if (k === null) return 'Enter a price in naira, like 15000.'
  if (k < MIN_PRICE_KOBO || k > MAX_PRICE_KOBO) return 'Price must be between ₦500 and ₦5,000,000.'
  return null
}

/** Kobo → "₦25,000". A missing or invalid amount shows "—", never a misleading ₦0. */
export function formatNaira(kobo: number | string | null | undefined): string {
  if (kobo === null || kobo === undefined || kobo === '') return '—'
  const v = Number(kobo)
  if (!Number.isFinite(v)) return '—'
  const n = Math.round(v / 100)
  return (n < 0 ? '-₦' : '₦') + Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function textProblem(raw: string, { min = 0, max, field }: { min?: number; max: number; field: string }): string | null {
  const v = clean(raw)
  if (v.length < min) return min <= 1 ? `Enter ${field}.` : `${field[0]!.toUpperCase()}${field.slice(1)} needs at least ${min} characters.`
  if (v.length > max) return `Keep ${field} under ${max} characters.`
  return null
}
