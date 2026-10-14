// Robots and double-taps: the same action fired many times at once must
// only take effect once, and limits can't be raced past.
import { Client } from 'pg'
import { Db, User } from './harness'

let db: Db
let admin: User, tech: User
let conns: Client[]
beforeAll(async () => {
  db = await Db.fresh()
  admin = await db.admin()
  tech = await db.technician({
    admin,
    services: [['smartphone', 'screen_replacement', 2_500_000], ['smartphone', 'battery_replacement', 1_500_000],
      ['laptop', 'screen_replacement', 8_000_000], ['tablet', 'screen_replacement', 3_000_000],
      ['laptop', 'battery_replacement', 3_000_000], ['tablet', 'battery_replacement', 2_000_000]],
  })
  conns = await Promise.all(Array.from({ length: 6 }, () => db.connection()))
})
afterAll(async () => { await db.close() })

async function race(fn: (c: Client, i: number) => Promise<unknown>) {
  return Promise.allSettled(conns.map((c, i) => fn(c, i)))
}
const ok = (r: PromiseSettledResult<unknown>[]) => r.filter((x) => x.status === 'fulfilled').length

test('admin double-tapping "confirm payment" confirms once', async () => {
  const c = await db.customer()
  const j = await db.book(c, tech)
  await db.as(tech).rpc('accept_job', [j.id])
  await db.as(c).rpc('submit_payment', [j.id, 'Ada transfer'])
  const results = await race((conn) => db.as(admin, conn).rpc('admin_confirm_payment', [j.id]))
  expect(ok(results)).toBe(1)
  const { rows } = await db.root.query("SELECT count(*)::int AS n FROM public.job_events WHERE job_id = $1 AND to_status = 'paid'", [j.id])
  expect(rows[0].n).toBe(1)
})

test('accept and decline fired together: exactly one wins', async () => {
  const c = await db.customer()
  const j = await db.book(c, tech)
  const results = await race((conn, i) =>
    db.as(tech, conn).rpc(i % 2 ? 'accept_job' : 'decline_job', i % 2 ? [j.id] : [j.id, null]))
  expect(ok(results)).toBe(1)
})

test('confirm completion vs raise dispute at the same time: exactly one wins', async () => {
  const c = await db.customer()
  const j = await db.readyJob(c, tech, admin)
  const results = await race((conn, i) =>
    db.as(c, conn).rpc(i % 2 ? 'confirm_completion' : 'raise_dispute', i % 2 ? [j.id] : [j.id, 'Something is wrong here']))
  expect(ok(results)).toBe(1)
})

test('payout marked paid only once under concurrent taps', async () => {
  const c = await db.customer()
  const j = await db.readyJob(c, tech, admin)
  await db.as(c).rpc('confirm_completion', [j.id])
  const results = await race((conn, i) => db.as(admin, conn).rpc('admin_mark_payout_paid', [j.id, `REF-${i}000`]))
  expect(ok(results)).toBe(1)
})

test('a bot firing 6 bookings at once still hits the 3-open-requests limit', async () => {
  const c = await db.customer()
  const combos = [['smartphone', 'screen_replacement'], ['smartphone', 'battery_replacement'], ['laptop', 'screen_replacement'],
    ['tablet', 'screen_replacement'], ['laptop', 'battery_replacement'], ['tablet', 'battery_replacement']]
  const results = await race((conn, i) => db.as(c, conn).rpc('create_job', [
    tech.id, combos[i]![0], combos[i]![1], null, null, null, 'drop_off', null]))
  expect(ok(results)).toBe(3)
})

test('a bot firing the same booking 6 times creates it once', async () => {
  const c = await db.customer()
  const results = await race((conn) => db.as(c, conn).rpc('create_job', [
    tech.id, 'smartphone', 'screen_replacement', null, null, null, 'drop_off', null]))
  expect(ok(results)).toBe(1)
})

test('double review submission stores one review', async () => {
  const c = await db.customer()
  const j = await db.readyJob(c, tech, admin)
  await db.as(c).rpc('confirm_completion', [j.id])
  const results = await race((conn) => db.as(c, conn).rpc('submit_review', [j.id, 5, null]))
  expect(ok(results)).toBe(1)
})
