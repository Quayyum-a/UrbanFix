import { Db, expectFail, User } from './harness'

let db: Db
let admin: User, tech: User, customer: User
let jobId: string
beforeAll(async () => {
  db = await Db.fresh()
  admin = await db.admin()
  tech = await db.technician({ admin })
  customer = await db.customer()
  jobId = (await db.book(customer, tech)).id
})
afterAll(async () => { await db.close() })

test('customer, technician and admin can chat on a job; messages are trimmed', async () => {
  const m = await db.as(customer).one('send_message', [jobId, '   Is the screen in stock?  '])
  expect(m).toMatchObject({ body: 'Is the screen in stock?', sender_id: customer.id })
  await db.as(tech).rpc('send_message', [jobId, 'Yes, I have it'])
  await db.as(admin).rpc('send_message', [jobId, 'UrbanFix support here'])
  const rows = await db.as(customer).sql('SELECT body FROM public.messages WHERE job_id = $1 ORDER BY id', [jobId])
  expect(rows.map((r) => r.body)).toEqual(['Is the screen in stock?', 'Yes, I have it', 'UrbanFix support here'])
})

test('outsiders cannot send or read, and cannot spoof the sender', async () => {
  const stranger = await db.customer()
  await expectFail(db.as(stranger).rpc('send_message', [jobId, 'hi']), 'Repair not found')
  expect(await db.as(stranger).sql('SELECT * FROM public.messages')).toHaveLength(0)
  const m = await db.as(tech).one('send_message', [jobId, 'from tech'])
  expect(m.sender_id).toBe(tech.id)
})

test.each([
  ['', 'Type a message'],
  ['     ', 'Type a message'],
  ['x'.repeat(1001), 'too long'],
])('rejects message %p', async (body, msg) => {
  await expectFail(db.as(customer).rpc('send_message', [jobId, body]), msg)
})

test('unicode, emoji and newlines are kept as typed', async () => {
  const body = 'Ẹ káàsán 👋\nScreen don spoil'
  const m = await db.as(customer).one('send_message', [jobId, body])
  expect(m.body).toBe(body)
})

test('flood protection: 20 messages a minute per person', async () => {
  const c = await db.customer()
  const j = (await db.book(c, tech, { category: 'screen_replacement' })).id
  for (let i = 0; i < 20; i++) await db.as(c).rpc('send_message', [j, `msg ${i}`])
  await expectFail(db.as(c).rpc('send_message', [j, 'one more']), 'too fast')
  // The other side can still reply.
  await expect(db.as(tech).rpc('send_message', [j, 'I see you'])).resolves.toHaveLength(1)
})

test('chat closes when a request is cancelled', async () => {
  const c = await db.customer()
  const j = await db.book(c, tech)
  await db.as(c).rpc('cancel_job', [j.id, null])
  await expectFail(db.as(c).rpc('send_message', [j.id, 'hello']), 'closed')
})
