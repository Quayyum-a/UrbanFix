import fc from 'fast-check'
import { Db, expectFail, randomPhone, User } from './harness'

let db: Db
beforeAll(async () => { db = await Db.fresh() })
afterAll(async () => { await db.close() })

describe('phone_registered', () => {
  test('accepts every common way of writing a Nigerian number', async () => {
    const u = await db.authUser('+2348031234567')
    for (const input of ['08031234567', '+2348031234567', '2348031234567', '8031234567', '0803 123 4567', '+234 (803) 123-4567']) {
      await expect(db.as(null).one('phone_registered', [input])).resolves.toBe(true)
    }
    expect(u.id).toBeTruthy()
    await expect(db.as(null).one('phone_registered', ['08031234568'])).resolves.toBe(false)
  })

  test.each(['', '123', '0601234567', '06012345678', '+14155551234', '0803123456', '080312345678', 'abc', '+234 803 123 45678'])(
    'rejects %p', async (input) => {
      await expectFail(db.as(null).rpc('phone_registered', [input]), 'valid Nigerian mobile')
    })
})

describe('complete_signup', () => {
  test('creates a customer, taking the phone from the account (not from input)', async () => {
    const u = await db.authUser()
    const p = await db.as(u).one('complete_signup', ['customer', '  Ada   Obi ', 'Ikeja', '12 Allen Avenue, Ikeja'])
    expect(p).toMatchObject({ id: u.id, role: 'customer', full_name: 'Ada Obi', phone: u.phone })
  })

  test('creates a technician with a draft profile', async () => {
    const u = await db.authUser()
    await db.as(u).rpc('complete_signup', ['technician', 'Emeka Okafor', 'Ikeja', null])
    const t = await db.as(u).sql('SELECT status, is_available FROM public.technicians')
    expect(t).toEqual([{ status: 'draft', is_available: false }])
  })

  test('nobody can sign up as admin', async () => {
    const u = await db.authUser()
    await expectFail(db.as(u).rpc('complete_signup', ['admin', 'Sneaky Admin', null, null]), 'Choose whether')
    await expectFail(db.as(u).rpc('complete_signup', ['ADMIN', 'Sneaky Admin', null, null]), 'Choose whether')
  })

  test('cannot set up the same account twice (e.g. to switch role)', async () => {
    const u = await db.authUser()
    await db.as(u).rpc('complete_signup', ['customer', 'Ada Obi', null, null])
    await expectFail(db.as(u).rpc('complete_signup', ['technician', 'Ada Obi', null, null]), 'already set up')
  })

  test('accounts not created through phone sign-in are refused', async () => {
    const { rows } = await db.root.query("INSERT INTO auth.users (email) VALUES ('hacker@example.com') RETURNING id")
    const u: User = { id: rows[0].id, phone: '', email: 'hacker@example.com' }
    await expectFail(db.as(u).rpc('complete_signup', ['customer', 'Hacker Man', null, null]), 'not created with a phone')
  })

  test.each([
    ['', 'Enter your name'],
    ['A', 'Enter your name'],
    ['12345', 'Enter your name'],
    ['<script>alert(1)</script>', 'Enter your name'],
    ['Ada 😀', 'Enter your name'],
    ['x'.repeat(81), 'Enter your name'],
  ])('rejects name %p', async (name, msg) => {
    const u = await db.authUser()
    await expectFail(db.as(u).rpc('complete_signup', ['customer', name, null, null]), msg)
  })

  test('accepts real names with apostrophes, hyphens and accents', async () => {
    for (const name of ["Ngozi O'Neil", 'Adé-Bọ́lá Johnson', 'Chukwuemeka Jr.']) {
      const u = await db.authUser()
      await expect(db.as(u).rpc('complete_signup', ['customer', name, null, null])).resolves.toHaveLength(1)
    }
  })

  test('validates address and area length', async () => {
    const u = await db.authUser()
    await expectFail(db.as(u).rpc('complete_signup', ['customer', 'Ada Obi', null, 'short']), 'Address should be')
    await expectFail(db.as(u).rpc('complete_signup', ['customer', 'Ada Obi', 'I', null]), 'Area should be')
    await expectFail(db.as(u).rpc('complete_signup', ['customer', 'Ada Obi', null, 'x'.repeat(201)]), 'Address should be')
  })

  test('any input either succeeds or fails with a friendly message (fuzz)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ maxLength: 120 }).filter((s) => !s.includes('\u0000')),
        fc.option(fc.string({ maxLength: 250 }).filter((s) => !s.includes('\u0000'))),
        async (name, address) => {
          const u = await db.authUser(randomPhone())
          try {
            await db.as(u).rpc('complete_signup', ['customer', name, null, address])
          } catch (e: any) {
            expect(e.code).toBe('P0001') // our own validation message, never a raw DB error
          }
        }),
      { numRuns: 150 },
    )
  })
})

describe('update_my_profile', () => {
  test('updates own profile only, with validation', async () => {
    const u = await db.customer()
    const p = await db.as(u).one('update_my_profile', ['Ada Obi-Okeke', 'Surulere', '5 Bode Thomas Street, Surulere'])
    expect(p).toMatchObject({ full_name: 'Ada Obi-Okeke', area: 'Surulere' })
    await expectFail(db.as(u).rpc('update_my_profile', ['', null, null]), 'Enter your name')
    const fresh = await db.authUser()
    await expectFail(db.as(fresh).rpc('update_my_profile', ['Ada Obi', null, null]), 'Finish setting up')
  })

  test('cannot change own role or phone through any function', async () => {
    const u = await db.customer()
    await db.as(u).rpc('update_my_profile', ['Ada Obi', null, null])
    const [p] = await db.as(u).sql('SELECT role, phone FROM public.profiles')
    expect(p).toEqual({ role: 'customer', phone: u.phone })
  })
})

describe('make_admin', () => {
  test('promotes an existing account; only runnable from the SQL editor', async () => {
    const u = await db.customer()
    await expectFail(db.as(u).sql('SELECT public.make_admin($1)', [u.phone]), /permission denied/)
    await db.root.query('SELECT public.make_admin($1)', [u.phone.replace('+234', '0')])
    const [p] = await db.as(u).sql('SELECT role FROM public.profiles WHERE id = $1', [u.id])
    expect(p.role).toBe('admin')
  })

  test('explains when the phone has not signed up yet', async () => {
    await expectFail(db.root.query('SELECT public.make_admin($1)', ['08099999999']), 'Sign up in the app first')
  })
})

test('test database matches Supabase text handling (UTF-8)', async () => {
  const { rows } = await db.root.query('SHOW server_encoding')
  expect(rows[0].server_encoding).toBe('UTF8')
})
