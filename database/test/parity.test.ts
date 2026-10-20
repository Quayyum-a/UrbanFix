// The app validates input instantly (lib/validation.ts) and the database
// validates it for real (urbanfix.sql). These must agree, or users get told
// "ok" by the app and then rejected by the server (or vice versa).
import * as fc from 'fast-check'
import { REPAIRS } from '../../constants/catalog'
import { deviceIdProblem, luhnOk, nameProblem, normalizePhone, phoneToEmail } from '../../lib/validation'
import { Db } from './harness'

let db: Db
beforeAll(async () => { db = await Db.fresh() })
afterAll(async () => { await db.close() })

const noNul = (s: string) => !s.includes('\u0000')
const sqlOne = async (sql: string, params: unknown[]) => (await db.root.query(sql, params)).rows[0]

test('phone normalization matches the database on random input', async () => {
  const digit = fc.constantFrom(...'0123456789'.split(''))
  const nigerian = fc.tuple(
    fc.constantFrom('0', '+234', '234', '', '+234 ', '0 '),
    fc.constantFrom('70', '80', '81', '90', '91', '60', '71', '89'),
    fc.array(digit, { minLength: 6, maxLength: 10 }).map((a) => a.join('')),
    fc.constantFrom('', ' ', '-'),
  ).map(([p, a, rest, sep]) => `${p}${a}${sep}${rest}`)
  await fc.assert(fc.asyncProperty(fc.oneof(nigerian, fc.string({ maxLength: 20 }).filter(noNul)), async (input) => {
    const { v } = await sqlOne('SELECT public._normalize_phone($1) AS v', [input])
    expect(normalizePhone(input)).toBe(v)
  }), { numRuns: 1000 })
})

test('the account email the app signs up with is the one the database reads the phone from', async () => {
  const phone = '+2348031234567'
  const { v } = await sqlOne('SELECT public._phone_from_email($1) AS v', [phoneToEmail(phone)])
  expect(v).toBe(phone)
})

test('name rules match the database, including Yoruba and Igbo names', async () => {
  const samples = ["Adé-Bọ́lá Johnson", 'Chukwuemeka', "O'Neil", 'Ngozi Ụ́chè', 'A', 'J. R', '..', "''", 'Ada 2', 'Ada😀', '  Ada  Obi ']
  const alphabet = fc.constantFrom(...'aZéọ́ Ụ́-\'.1😀×'.split(''))
  await fc.assert(fc.asyncProperty(fc.oneof(fc.constantFrom(...samples), fc.array(alphabet, { maxLength: 12 }).map((a) => a.join(''))), async (raw) => {
    const { v } = await sqlOne('SELECT public._valid_name(public._clean($1)) AS v', [raw])
    expect(nameProblem(raw) === null).toBe(v === true)
  }), { numRuns: 800 })
})

test('IMEI/serial rules match the database', async () => {
  const digits15 = fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 15, maxLength: 15 }).map((a) => a.join(''))
  const withCheck = fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 14, maxLength: 14 }).map((a) => {
    const base = a.join('')
    for (let c = 0; c < 10; c++) if (luhnOk(base + c)) return base + c
    return base + '0'
  })
  const serial = fc.array(fc.constantFrom(...'ABC123xyz- ;'.split('')), { minLength: 0, maxLength: 34 }).map((a) => a.join(''))
  await fc.assert(fc.asyncProperty(fc.oneof(digits15, withCheck, serial), async (raw) => {
    let serverOk = true
    try { await db.root.query('SELECT public._normalize_identifier($1)', [raw]) } catch { serverOk = false }
    expect(deviceIdProblem(raw) === null).toBe(serverOk)
  }), { numRuns: 800 })
})

test('the repair catalog in the app is exactly what the database accepts', async () => {
  const { rows } = await db.root.query('SELECT device_type, category, label FROM public.repair_options ORDER BY device_type, sort_order')
  const fromDb = rows.map((r) => `${r.device_type}:${r.category}:${r.label}`).sort()
  const fromApp = Object.entries(REPAIRS).flatMap(([d, list]) => list.map((r) => `${d}:${r.category}:${r.label}`)).sort()
  expect(fromApp).toEqual(fromDb)
})
