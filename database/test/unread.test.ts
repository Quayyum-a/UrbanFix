// Red-dot counts: only other people's messages, only your own repairs, never backwards.
import { Db, expectFail, User } from './harness'

let db: Db
let admin: User, tech: User
beforeAll(async () => {
  db = await Db.fresh()
  admin = await db.admin()
  tech = await db.technician({ admin })
})
afterAll(async () => { await db.close() })

const unreadFor = async (u: User, jobId: string) =>
  ((await db.as(u).rpc('my_unread', [])).find((r) => r.job_id === jobId)?.unread ?? 0) as number

test('a new message shows as unread for the other side only, and reading clears it', async () => {
  const customer = await db.customer()
  const j = (await db.book(customer, tech)).id
  await db.as(customer).rpc('send_message', [j, 'Hello, is it in stock?'])
  expect(await unreadFor(tech, j)).toBe(1)
  expect(await unreadFor(customer, j)).toBe(0) // your own messages never count

  await db.as(customer).rpc('send_message', [j, 'Please reply'])
  expect(await unreadFor(tech, j)).toBe(2)

  await db.as(tech).rpc('mark_messages_read', [j, null])
  expect(await unreadFor(tech, j)).toBe(0)

  // Replying also counts as reading.
  await db.as(customer).rpc('send_message', [j, 'One more thing'])
  expect(await unreadFor(tech, j)).toBe(1)
  await db.as(tech).rpc('send_message', [j, 'Yes, come by 2pm'])
  expect(await unreadFor(tech, j)).toBe(0)
  expect(await unreadFor(customer, j)).toBe(1)
})

test('reading up to a message leaves newer ones unread, and the marker never goes backwards', async () => {
  const customer = await db.customer()
  const j = (await db.book(customer, tech)).id
  const a = await db.as(tech).one('send_message', [j, 'first'])
  const b = await db.as(tech).one('send_message', [j, 'second'])
  await db.as(customer).rpc('mark_messages_read', [j, a.id])
  expect(await unreadFor(customer, j)).toBe(1)
  await db.as(customer).rpc('mark_messages_read', [j, b.id])
  await db.as(customer).rpc('mark_messages_read', [j, a.id]) // older marker: ignored
  expect(await unreadFor(customer, j)).toBe(0)
})

test('a made-up huge or negative marker cannot hide future messages', async () => {
  const customer = await db.customer()
  const j = (await db.book(customer, tech)).id
  await db.as(customer).rpc('mark_messages_read', [j, '9223372036854775807'])
  await db.as(customer).rpc('mark_messages_read', [j, -5])
  await db.as(tech).rpc('send_message', [j, 'are you there?'])
  expect(await unreadFor(customer, j)).toBe(1)
})

test('strangers cannot mark or see unread counts for other people\'s repairs', async () => {
  const customer = await db.customer()
  const j = (await db.book(customer, tech)).id
  await db.as(tech).rpc('send_message', [j, 'private'])
  const stranger = await db.customer('Eve Stranger')
  await expectFail(db.as(stranger).rpc('mark_messages_read', [j, null]), 'Repair not found')
  expect(await db.as(stranger).rpc('my_unread', [])).toEqual([])
  expect(await unreadFor(customer, j)).toBe(1)
  await expect(db.as(stranger).sql('SELECT * FROM public.message_reads')).rejects.toThrow(/permission/)
  await expect(db.as(customer).sql('INSERT INTO public.message_reads (job_id, user_id, last_read_id) VALUES ($1, $2, 999)', [j, customer.id]))
    .rejects.toThrow(/permission/)
  await expect(db.as(customer).sql("SELECT public._message_seen_by_sender()")).rejects.toThrow()
})

test('admins see unread messages on any repair and can clear them', async () => {
  const customer = await db.customer()
  const j = (await db.book(customer, tech)).id
  await db.as(customer).rpc('send_message', [j, 'Support, help please'])
  expect(await unreadFor(admin, j)).toBe(1)
  await db.as(admin).rpc('mark_messages_read', [j, null])
  expect(await unreadFor(admin, j)).toBe(0)
})

test('signed-out callers are refused', async () => {
  await expect(db.as(null).rpc('my_unread', [])).rejects.toThrow()
})
