// Migration 002: technicians added directly by an admin from the SQL editor.
import { pinProblem } from '../../lib/validation'
import { Db, DENIED, expectFail, User } from './harness'

let db: Db
beforeAll(async () => { db = await Db.fresh() })
afterAll(async () => { await db.close() })

const SERVICES = JSON.stringify([['smartphone', 'screen_replacement', 35000], ['laptop', 'diagnosis', 5000]])
const ADDRESS = '7 Otigba Street, Computer Village, Ikeja'

async function add(phone: string, name: string, services = SERVICES, bank: (string | null)[] = [null, null, null]) {
  const { rows } = await db.root.query(
    'SELECT public.admin_add_trusted_technician($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9) AS r',
    [phone, name, name, ADDRESS, 'Ikeja', services, ...bank])
  return rows[0].r
}
const userFor = async (phone: string): Promise<User> => {
  const email = `${phone.slice(1)}@phone.urbanfix.app`
  const { rows } = await db.root.query('SELECT id FROM auth.users WHERE email = $1', [email])
  return { id: rows[0].id, phone, email }
}

test('creates a sign-in account, approved and online, visible to customers with the right prices', async () => {
  const r = await add('08149736017', 'Oluwatobi')
  expect(r).toMatchObject({ name: 'Oluwatobi', phone: '+2348149736017', repairs_listed: 2 })
  expect(r.pin).toMatch(/^\d{6}$/)

  // The PIN works with the password scheme the app uses to sign in.
  const { rows: [auth] } = await db.root.query(
    `SELECT extensions.crypt($1, encrypted_password) = encrypted_password AS ok, aud, role, email_confirmed_at IS NOT NULL AS confirmed,
            confirmation_token, recovery_token, email_change, email_change_token_new
       FROM auth.users WHERE email = '2348149736017@phone.urbanfix.app'`, [`uf1:${r.pin}:2348149736017`])
  expect(auth).toEqual({ ok: true, aud: 'authenticated', role: 'authenticated', confirmed: true,
    confirmation_token: '', recovery_token: '', email_change: '', email_change_token_new: '' })
  const { rows: ident } = await db.root.query(
    "SELECT provider, email FROM auth.identities WHERE email = '2348149736017@phone.urbanfix.app'")
  expect(ident).toEqual([{ provider: 'email', email: '2348149736017@phone.urbanfix.app' }])

  const customer = await db.customer()
  const found = await db.as(customer).rpc('find_technicians', ['smartphone', 'screen_replacement', null, 'standard'])
  // Their price is now the repair fee (₦35,000 here); parts are added from the price list.
  expect(found.map((f) => [f.full_name, f.shop_address, f.service_charge_kobo])).toEqual([['Oluwatobi', ADDRESS, 3_500_000 + 150_000]])

  // And can be booked straight away.
  const tech = await userFor('+2348149736017')
  const job = await db.book(customer, tech)
  expect(job).toMatchObject({ status: 'requested', part_kobo: 3_700_000, labour_kobo: 3_500_000, commission_kobo: 350_000 })
})

test('three technicians can share one address; each is unique by phone number', async () => {
  await add('+2349064450715', 'Odion')
  await add('+2349114262315', 'Yunus')
  const c = await db.customer()
  const names = (await db.as(c).rpc('find_technicians', ['laptop', 'diagnosis', null, null])).map((r) => r.full_name).sort()
  expect(names).toEqual(['Odion', 'Oluwatobi', 'Yunus'])
})

test('running it again updates details and prices without creating a second account or changing the PIN', async () => {
  const before = await db.root.query("SELECT encrypted_password FROM auth.users WHERE email = '2349064450715@phone.urbanfix.app'")
  const r = await add('09064450715', 'Odion', JSON.stringify([['smartphone', 'screen_replacement', 40000]]))
  expect(r.pin).toMatch(/existing account/)
  const after = await db.root.query("SELECT encrypted_password FROM auth.users WHERE email = '2349064450715@phone.urbanfix.app'")
  expect(after.rows).toEqual(before.rows)
  const { rows } = await db.root.query(
    "SELECT s.category, s.price_kobo FROM public.services s JOIN public.profiles p ON p.id = s.technician_id WHERE p.phone = '+2349064450715' ORDER BY 1")
  expect(rows).toEqual([{ category: 'diagnosis', price_kobo: 500_000 }, { category: 'screen_replacement', price_kobo: 4_000_000 }])
})

test('reuses an account the technician already created in the app, keeping their PIN', async () => {
  const u = await db.authUser()
  await db.as(u).rpc('complete_signup', ['technician', 'Tunde Bello', 'Ikeja', null])
  const r = await add(u.phone, 'Tunde Bello')
  expect(r.pin).toMatch(/existing account/)
  const [t] = await db.as(u).sql('SELECT status, is_available FROM public.technicians')
  expect(t).toEqual({ status: 'approved', is_available: true })
})

test('refuses numbers that belong to a customer or admin', async () => {
  const c = await db.customer()
  await expectFail(add(c.phone, 'Some Body'), 'already registered as a customer')
  const a = await db.admin()
  await expectFail(add(a.phone, 'Some Body'), 'already registered as a admin')
})

test.each([
  [['123', 'Oluwatobi'], 'Invalid Nigerian phone'],
  [['08031110000', 'X'], 'Invalid name'],
  [['08031110000', 'Oluwatobi', '[]'], 'at least one repair'],
  [['08031110000', 'Oluwatobi', '{"a":1}'], 'at least one repair'],
  [['08031110000', 'Oluwatobi', '[["smartphone","fly",5000]]'], 'Unknown repair'],
  [['08031110000', 'Oluwatobi', '[["smartphone","diagnosis","3000"]]'], 'must be a number'],
  [['08031110000', 'Oluwatobi', '[["smartphone","diagnosis",100]]'], 'between 500'],
  [['08031110000', 'Oluwatobi', '[["smartphone","diagnosis",3000.5]]'], 'whole naira'],
  [['08031110000', 'Oluwatobi', '[["smartphone","diagnosis"]]'], 'must look like'],
])('validates input %p', async (args, msg) => {
  await expectFail(add(...(args as [string, string, string?])), msg)
  // Nothing half-created on failure.
  const { rows } = await db.root.query("SELECT count(*)::int AS n FROM auth.users WHERE email = '2348031110000@phone.urbanfix.app'")
  expect(rows[0].n).toBe(0)
})

test('bank details: optional, validated, and the technician can add them once later in the app', async () => {
  await expectFail(add('08031110001', 'Musa Ali', SERVICES, ['GTBank', '123', 'Musa Ali']), '10 digits')
  const r = await add('08031110001', 'Musa Ali')
  expect(r.bank_details).toMatch(/not yet/)
  const t = await userFor('+2348031110001')
  await db.as(t).rpc('save_payout_details', ['GTBank', '0123456789', 'Musa Ali'])
  await expectFail(db.as(t).rpc('save_payout_details', ['Kuda', '9988776655', 'Someone Else']), 'contact UrbanFix support')

  const r2 = await add('08031110002', 'Bayo Kola', SERVICES, ['Access Bank', '0011223344', 'Bayo Kola'])
  expect(r2.bank_details).toBe('saved')
  const t2 = await userFor('+2348031110002')
  await expectFail(db.as(t2).rpc('save_payout_details', ['Kuda', '9988776655', 'Someone Else']), 'contact UrbanFix support')
})

test('only callable from the SQL editor, never from the app', async () => {
  for (const u of [await db.customer(), await db.admin(), null]) {
    await expectFail(db.as(u).sql(
      "SELECT public.admin_add_trusted_technician('08031110009', 'Hacker Man', 'Hack', '1 Fake Street, Ikeja Lagos', 'Ikeja', '[[\"smartphone\",\"diagnosis\",500]]'::jsonb)"),
      DENIED)
    await expectFail(db.as(u).sql('SELECT public._random_pin()'), DENIED)
  }
})

test('random PINs never fail the app\'s weak-PIN rules', async () => {
  const { rows } = await db.root.query('SELECT public._random_pin() AS p FROM generate_series(1, 2000)')
  for (const { p } of rows) expect(pinProblem(p)).toBeNull()
})
