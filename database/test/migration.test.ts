// Migrations must be safe to run twice and must not overwrite prices or fees set later.
import fs from 'fs'
import path from 'path'
import { Client } from 'pg'
import { Db } from './harness'

let db: Db
beforeAll(async () => { db = await Db.fresh() })
afterAll(async () => { await db.close() })

const file = (n: string) => fs.readFileSync(path.join(__dirname, '..', 'migrations', n), 'utf8')

test('running every migration again changes nothing you set', async () => {
  const admin = await db.admin()
  const tech = await db.technician({ admin })
  await db.as(tech).rpc('save_service', ['smartphone', 'screen_replacement', 1_200_000, true])
  const x = await db.modelId('iPhone X')
  await db.as(admin).rpc('admin_set_part_price', [x, 'screen_replacement', 'standard', 1_600_000, 'Incell'])
  // Wording edited by the team after 005 must survive a re-run.
  await db.root.query("UPDATE public.part_grade_texts SET description = 'Our own battery wording.' WHERE device_type = '' AND category = 'battery_replacement' AND grade = 'high'")
  await db.root.query("UPDATE public.part_grades SET description = 'Our own fallback.' WHERE grade = 'premium'")
  const before = await db.root.query('SELECT count(*)::int AS n FROM public.device_models')

  for (const f of fs.readdirSync(path.join(__dirname, '..', 'migrations')).filter((n) => n.endsWith('.sql')).sort()) {
    await db.root.query(file(f))
  }

  const fee = await db.root.query('SELECT price_kobo FROM public.services WHERE technician_id = $1 AND category = $2', [tech.id, 'screen_replacement'])
  expect(fee.rows[0].price_kobo).toBe(1_200_000)
  const price = await db.root.query("SELECT price_kobo, source FROM public.part_prices WHERE model_id = $1 AND category = 'screen_replacement' AND grade = 'standard'", [x])
  expect(price.rows[0]).toEqual({ price_kobo: 1_600_000, source: 'admin' })
  const kept = await db.root.query("SELECT description FROM public.part_grade_texts WHERE device_type = '' AND category = 'battery_replacement' AND grade = 'high'")
  expect(kept.rows[0].description).toBe('Our own battery wording.')
  const fb = await db.root.query("SELECT description FROM public.part_grades WHERE grade = 'premium'")
  expect(fb.rows[0].description).toBe('Our own fallback.')
  const texts = await db.root.query('SELECT count(*)::int AS n FROM public.part_grade_texts')
  expect(texts.rows[0].n).toBeGreaterThan(30)
  const after = await db.root.query('SELECT count(*)::int AS n FROM public.device_models')
  expect(after.rows[0].n).toBe(before.rows[0].n)
})

test('existing technicians\' old full prices become the suggested repair fee once', async () => {
  // Simulate a database that only had urbanfix.sql + 002 applied, with an old-style full price.
  const { rows } = await db.root.query("SELECT pricing_version FROM public.settings WHERE id = 1")
  expect(rows[0].pricing_version).toBe(3)
  const { rows: ro } = await db.root.query("SELECT suggested_labour_kobo FROM public.repair_options WHERE device_type = 'smartphone' AND category = 'screen_replacement'")
  expect(ro[0].suggested_labour_kobo).toBe(500_000)
})

test('every seeded price is consistent: Standard ≤ High quality ≤ Premium', async () => {
  const { rows } = await db.root.query(`
    SELECT m.name, p.category, array_agg(p.price_kobo ORDER BY g.sort_order) AS prices
    FROM public.part_prices p JOIN public.device_models m ON m.id = p.model_id JOIN public.part_grades g ON g.grade = p.grade
    GROUP BY 1, 2`)
  for (const r of rows) {
    const sorted = [...r.prices].sort((a: number, b: number) => a - b)
    expect([r.name, r.category, r.prices]).toEqual([r.name, r.category, sorted])
  }
})

test('on a live database with only 002 applied, 003 converts old full prices and keeps open jobs working', async () => {
  // Build a database the way yours is now: urbanfix.sql + 002, no 003.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { STATE_FILE } = require('./constants')
  const { port } = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
  const name = `live_${Date.now()}`
  const admin = new Client({ host: 'localhost', port, user: 'postgres', password: 'postgres', database: 'postgres' })
  await admin.connect(); await admin.query(`CREATE DATABASE ${name}`); await admin.end()
  const root = new Client({ host: 'localhost', port, user: 'postgres', password: 'postgres', database: name })
  await root.connect()
  const live = new Db(name, port, root)
  try {
    await root.query(fs.readFileSync(path.join(__dirname, 'supabase-shim.sql'), 'utf8'))
    await root.query(fs.readFileSync(path.join(__dirname, '..', 'urbanfix.sql'), 'utf8'))
    await root.query(file('002_trusted_technicians.sql'))
    const { rows: [r] } = await root.query(`SELECT public.admin_add_trusted_technician('08149736017', 'Oluwatobi', 'Oluwatobi',
      '7 Otigba Street, Computer Village, Ikeja', 'Ikeja', '[["smartphone","screen_replacement",35000],["laptop","diagnosis",5000]]') AS r`)
    expect(r.r.repairs_listed).toBe(2)
    // An old-style open booking (full price, no part split).
    const { rows: [t] } = await root.query("SELECT id FROM public.profiles WHERE phone = '+2348149736017'")
    const cust = await live.authUser()
    await live.as(cust).rpc('complete_signup', ['customer', 'Ada Obi', 'Ikeja', null])
    const oldJob = await live.as(cust).one('create_job', [t.id, 'smartphone', 'screen_replacement', 'Apple', 'iPhone X', null, 'drop_off', null])
    expect(oldJob.price_kobo).toBe(3_500_000)

    await root.query(file('003_model_pricing.sql'))

    const { rows: svc } = await root.query('SELECT device_type, category, price_kobo FROM public.services WHERE technician_id = $1 ORDER BY 1', [t.id])
    expect(svc).toEqual([{ device_type: 'laptop', category: 'diagnosis', price_kobo: 300_000 },
      { device_type: 'smartphone', category: 'screen_replacement', price_kobo: 500_000 }])
    // The old job keeps its price and now goes through the check-and-quote step.
    const { rows: [j] } = await root.query('SELECT price_kobo, labour_kobo, part_kobo, status FROM public.jobs WHERE id = $1', [oldJob.id])
    expect(j).toEqual({ price_kobo: 3_500_000, labour_kobo: 3_150_000, part_kobo: 0, status: 'requested' })
    const tech = { id: t.id, phone: '+2348149736017', email: '' }
    await live.as(tech).rpc('accept_job', [oldJob.id])
    const q = await live.quote(tech, oldJob.id, { model: 'iPhone X', grade: 'premium' })
    expect(q).toMatchObject({ status: 'quoted', part_kobo: 3_700_000 })
  } finally {
    await live.close()
  }
})

test('this app build matches the database version (no "update needed" screen, no wrong prices)', async () => {
  const { versionProblem } = jest.requireActual('../../lib/appVersion')
  const { rows: [cfg] } = await db.root.query('SELECT pricing_version, min_app_build FROM public.settings WHERE id = 1')
  expect(versionProblem(cfg)).toBeNull()
})

test('a database without migration 003/004 is detected as outdated', async () => {
  const { versionProblem } = jest.requireActual('../../lib/appVersion')
  expect(versionProblem({ pricing_version: 1 })).toBe('db_outdated')
  expect(versionProblem({ pricing_version: 3 })).toBe('db_outdated')
  expect(versionProblem(null)).toBe('db_outdated')
  expect(versionProblem({ pricing_version: 3, min_app_build: 99 })).toBe('app_outdated')
})
