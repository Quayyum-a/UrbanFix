import { Db } from './harness'

let db: Db
beforeAll(async () => { db = await Db.fresh() })
afterAll(async () => { await db.close() })

test('schema loads and the full happy path works', async () => {
  const admin = await db.admin()
  const tech = await db.technician({ admin })
  const customer = await db.customer()
  const job = await db.readyJob(customer, tech, admin)
  expect(job.status).toBe('awaiting_confirmation')
})
