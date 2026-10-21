import * as fc from 'fast-check'
import {
  accountNumberProblem, addressProblem, clean, deviceIdProblem, displayPhone, formatNaira, luhnOk, nameProblem,
  ninProblem, normalizePhone, parseNairaToKobo, phoneToEmail, pinProblem, pinToPassword, priceProblem,
} from '@/lib/validation'

describe('phone numbers', () => {
  test.each([
    ['08031234567', '+2348031234567'], ['0803 123 4567', '+2348031234567'], ['+234 803 123 4567', '+2348031234567'],
    ['2348031234567', '+2348031234567'], ['8031234567', '+2348031234567'], ['07012345678', '+2347012345678'],
    ['09012345678', '+2349012345678'], ['08112345678', '+2348112345678'], ['(0803) 123-4567', '+2348031234567'],
  ])('%s -> %s', (input, out) => expect(normalizePhone(input)).toBe(out))

  test.each(['', '0803123456', '080312345678', '06012345678', '+14155550123', 'hello', '0000000000', '+234 0803 123 4567'])(
    'rejects %p', (input) => expect(normalizePhone(input)).toBeNull())

  test('any valid number round-trips through display formatting', () => {
    fc.assert(fc.property(
      fc.constantFrom('70', '80', '81', '90', '91'), fc.integer({ min: 0, max: 99_999_999 }),
      (prefix, n) => {
        const local = `0${prefix}${String(n).padStart(8, '0')}`
        const e164 = normalizePhone(local)!
        expect(e164).toMatch(/^\+234\d{10}$/)
        expect(normalizePhone(displayPhone(e164))).toBe(e164)
        expect(phoneToEmail(e164)).toBe(`${e164.slice(1)}@phone.urbanfix.app`)
      }))
  })
})

describe('PIN', () => {
  test.each(['123456', '654321', '111111', '000000', '234567', '987654', '123123', '12345', '1234567', 'abcdef', '12 456', ''])(
    'rejects weak or malformed PIN %p', (pin) => expect(pinProblem(pin)).not.toBeNull())
  test.each(['482915', '730264', '102938', '550281'])('accepts %p', (pin) => expect(pinProblem(pin)).toBeNull())

  test('password differs per phone for the same PIN and meets Supabase minimum length', () => {
    const a = pinToPassword('482915', '+2348031234567')
    const b = pinToPassword('482915', '+2348031234568')
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThanOrEqual(6)
  })
})

describe('names and text', () => {
  test.each(['Ada Obi', "Ngozi O'Neil", 'Adé-Bọ́lá Johnson', 'Chukwuemeka Jr.'])('accepts %p', (n) => expect(nameProblem(n)).toBeNull())
  test.each(['', 'A', '12', 'Ada 2', '<b>Ada</b>', 'Ada😀', 'x'.repeat(81), "''", '. .'])('rejects %p', (n) => expect(nameProblem(n)).not.toBeNull())
  test('clean removes NUL characters and collapses whitespace', () => {
    expect(clean('  a\u0000b \n\t c  ')).toBe('ab c')
    expect(clean(null)).toBe('')
  })
  test('address needs real detail', () => {
    expect(addressProblem('')).not.toBeNull()
    expect(addressProblem('', { required: false })).toBeNull()
    expect(addressProblem('Ikeja')).not.toBeNull()
    expect(addressProblem('12 Allen Avenue, Ikeja')).toBeNull()
    expect(addressProblem('x'.repeat(201))).not.toBeNull()
  })
})

describe('bank, NIN and device identifiers', () => {
  test('account numbers', () => {
    expect(accountNumberProblem('0123456789')).toBeNull()
    expect(accountNumberProblem('012 345 6789')).toBeNull()
    for (const bad of ['', '123', '01234567890', '000000000a', '0000000000']) expect(accountNumberProblem(bad)).not.toBeNull()
  })
  test('NIN', () => {
    expect(ninProblem('12345678901')).toBeNull()
    for (const bad of ['', '1234567890', '123456789012', '1111111111a', '11111111111']) expect(ninProblem(bad)).not.toBeNull()
  })
  test('IMEI must pass Luhn; serials accepted', () => {
    expect(deviceIdProblem('490154203237518')).toBeNull()
    expect(deviceIdProblem('4901 5420 3237 518')).toBeNull()
    expect(deviceIdProblem('490154203237519')).toMatch(/IMEI/)
    expect(deviceIdProblem('000000000000000')).not.toBeNull()
    expect(deviceIdProblem('C02X-1234abcd')).toBeNull()
    expect(deviceIdProblem('abc')).not.toBeNull()
    expect(deviceIdProblem("1234'; DROP")).not.toBeNull()
  })
  test('every 14-digit IMEI body has exactly one valid check digit', () => {
    fc.assert(fc.property(fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 14, maxLength: 14 }), (body) => {
      const valid = Array.from({ length: 10 }, (_, d) => luhnOk(body.join('') + d)).filter(Boolean)
      expect(valid).toHaveLength(1)
    }))
  })
})

describe('money', () => {
  test.each([['25000', 2_500_000], ['25,000', 2_500_000], ['₦ 25,000', 2_500_000], ['500', 50_000]])('%s -> %d kobo', (i, k) => {
    expect(parseNairaToKobo(i)).toBe(k)
  })
  test.each(['', 'abc', '25.50', '-500', '1e5', '9999999999'])('rejects %p', (i) => expect(parseNairaToKobo(i)).toBeNull())
  test('price range', () => {
    expect(priceProblem('499')).not.toBeNull()
    expect(priceProblem('500')).toBeNull()
    expect(priceProblem('5000000')).toBeNull()
    expect(priceProblem('5000001')).not.toBeNull()
  })
  test('formatting', () => {
    expect(formatNaira(2_500_000)).toBe('₦25,000')
    expect(formatNaira(0)).toBe('₦0')
    expect(formatNaira('150000000')).toBe('₦1,500,000')
    expect(formatNaira(null)).toBe('—')
    expect(formatNaira(undefined)).toBe('—')
    expect(formatNaira('abc')).toBe('—')
    expect(formatNaira(NaN)).toBe('—')
    expect(formatNaira(-250_000)).toBe('-₦2,500')
  })
})

describe('deviceName', () => {
  const { deviceName } = jest.requireActual('@/constants/catalog')
  test.each([
    ['iPhone', 'iPhone X', 'smartphone', 'iPhone X'],
    ['Samsung', 'Galaxy A54', 'smartphone', 'Samsung Galaxy A54'],
    ['Redmi / Xiaomi', 'Redmi Note 13', 'smartphone', 'Redmi Note 13'],
    ['Other Android', 'Oppo A78', 'smartphone', 'Oppo A78'],
    ['HP', 'Pavilion', 'laptop', 'HP Pavilion'],
    [null, null, 'laptop', 'Laptop'],
    ['Tecno', null, 'smartphone', 'Tecno'],
  ])('%p + %p', (b, m, d, out) => expect(deviceName(b, m, d)).toBe(out))
})
