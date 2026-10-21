// Can anyone read or write data they shouldn't, by going around the app
// and calling the Supabase API directly with the public anon key?
import { Db, DENIED, expectFail, User } from './harness'

let db: Db
let admin: User, tech: User, customer: User, stranger: User, otherTech: User
let jobId: string

const TABLES = ['profiles', 'technicians', 'technician_private', 'repair_options', 'services',
  'settings', 'jobs', 'job_events', 'messages', 'reviews']

beforeAll(async () => {
  db = await Db.fresh()
  admin = await db.admin()
  tech = await db.technician({ admin })
  otherTech = await db.technician({ admin })
  customer = await db.customer()
  stranger = await db.customer('Stranger Danger')
  const job = await db.paidJob(customer, tech, admin)
  jobId = job.id
  await db.as(customer).rpc('send_message', [jobId, 'Please call when you arrive'])
})
afterAll(async () => { await db.close() })

describe('signed-out (anon key only)', () => {
  test.each(TABLES)('cannot read %s', async (t) => {
    await expectFail(db.as(null).sql(`SELECT * FROM public.${t}`), DENIED)
  })

  test('can only call phone_registered', async () => {
    await expect(db.as(null).one('phone_registered', ['08012345678'])).resolves.toBe(false)
    await expectFail(db.as(null).rpc('find_technicians', ['smartphone', 'screen_replacement']), DENIED)
    await expectFail(db.as(null).rpc('complete_signup', ['customer', 'Anon', null, null]), DENIED)
    await expectFail(db.as(null).rpc('get_job', [jobId]), DENIED)
  })

  test('cannot upload files', async () => {
    await expectFail(db.as(null).upload('job-photos', `${jobId}/x.jpg`), DENIED)
  })
})

describe('signed-in users cannot write tables directly', () => {
  test.each([
    ['UPDATE public.jobs SET status = \'completed\''],
    ['UPDATE public.jobs SET price_kobo = 1, commission_kobo = 0, payout_kobo = 1'],
    ['UPDATE public.profiles SET role = \'admin\''],
    ['UPDATE public.technicians SET status = \'approved\', is_available = true'],
    ['UPDATE public.technician_private SET account_number = \'9999999999\''],
    ['DELETE FROM public.jobs'],
    ['DELETE FROM public.reviews'],
    ['DELETE FROM public.job_events'],
    ['UPDATE public.settings SET account_number = \'1111111111\''],
  ])('%s is denied', async (sqlText) => {
    for (const u of [customer, tech, stranger]) {
      await expectFail(db.as(u).sql(sqlText), DENIED)
    }
  })

  test('cannot insert rows directly (fake jobs, reviews, admin profiles, messages)', async () => {
    await expectFail(db.as(customer).sql(
      `INSERT INTO public.jobs (code, customer_id, technician_id, device_type, category, service_mode, price_kobo, commission_kobo, payout_kobo, status)
       VALUES ('UF-HACK', $1, $2, 'smartphone', 'screen_replacement', 'drop_off', 100, 0, 100, 'completed')`,
      [customer.id, tech.id]), DENIED)
    await expectFail(db.as(customer).sql(
      'INSERT INTO public.reviews (job_id, technician_id, customer_id, rating) VALUES ($1, $2, $3, 5)',
      [jobId, tech.id, customer.id]), DENIED)
    await expectFail(db.as(stranger).sql(
      'INSERT INTO public.messages (job_id, sender_id, body) VALUES ($1, $2, $3)', [jobId, customer.id, 'spoofed']), DENIED)
    const u = await db.authUser()
    await expectFail(db.as(u).sql(
      "INSERT INTO public.profiles (id, role, full_name, phone) VALUES ($1, 'admin', 'Evil', $2)", [u.id, u.phone]), DENIED)
  })

  test('internal functions are not callable', async () => {
    for (const fn of ['_auto_release()', `make_admin('${customer.phone}')`, '_uid()',
      `_log('${jobId}', null, 'x', null, 'completed', null)`,
      `_lock_job('${jobId}', '${customer.id}', 'admin')`]) {
      await expectFail(db.as(customer).sql(`SELECT public.${fn}`), DENIED)
    }
  })
})

describe('row level security: people only see their own things', () => {
  test('a stranger cannot see another customer\'s job, events, messages or profile', async () => {
    await expectFail(db.as(stranger).sql('SELECT * FROM public.jobs'), DENIED)
    expect(await db.as(stranger).sql('SELECT * FROM public.job_events')).toHaveLength(0)
    expect(await db.as(stranger).sql('SELECT * FROM public.messages')).toHaveLength(0)
    const profiles = await db.as(stranger).sql('SELECT id FROM public.profiles')
    expect(profiles.map((p) => p.id)).toEqual([stranger.id])
    await expectFail(db.as(stranger).rpc('get_job', [jobId]), 'Repair not found')
    expect(await db.as(stranger).rpc('my_jobs')).toHaveLength(0)
  })

  test('another technician cannot see the job', async () => {
    await expectFail(db.as(otherTech).sql('SELECT * FROM public.jobs WHERE id = $1', [jobId]), DENIED)
    await expectFail(db.as(otherTech).rpc('get_job', [jobId]), 'Repair not found')
    await expectFail(db.as(otherTech).rpc('accept_job', [jobId]), 'Repair not found')
  })

  test('customers cannot see technicians\' bank details or NIN', async () => {
    expect(await db.as(customer).sql('SELECT * FROM public.technician_private')).toHaveLength(0)
    const mine = await db.as(tech).sql('SELECT * FROM public.technician_private')
    expect(mine).toHaveLength(1)
    expect(mine[0].account_number).toBe('0123456789')
  })

  test('customers only see approved technicians', async () => {
    const pending = await db.technician({ approve: false })
    const rows = await db.as(customer).sql('SELECT id FROM public.technicians')
    expect(rows.map((r) => r.id)).not.toContain(pending.id)
    const svc = await db.as(customer).sql('SELECT * FROM public.services WHERE technician_id = $1', [pending.id])
    expect(svc).toHaveLength(0)
  })

  test('admin sees everything', async () => {
    expect((await db.as(admin).rpc('admin_list_jobs', [null, null])).length).toBeGreaterThan(0)
    expect((await db.as(admin).sql('SELECT * FROM public.technician_private')).length).toBeGreaterThan(1)
  })

  test('only the parties and admin can read the job\'s photos', async () => {
    // The customer's job is paid, so the technician can upload intake evidence.
    await db.as(tech).upload('job-photos', `${jobId}/sec-1.jpg`)
    const visible = (u: User) => db.as(u).sql("SELECT name FROM storage.objects WHERE bucket_id = 'job-photos'")
    expect(await visible(customer)).toHaveLength(2) // intake photo + this one
    expect(await visible(admin)).toHaveLength(2)
    expect(await visible(stranger)).toHaveLength(0)
    expect(await visible(otherTech)).toHaveLength(0)
  })

  test('nobody can overwrite or delete uploaded evidence', async () => {
    for (const u of [tech, customer, admin]) {
      const upd = await db.as(u).sql("UPDATE storage.objects SET name = 'x' WHERE bucket_id = 'job-photos' RETURNING id")
      expect(upd).toHaveLength(0)
      const del = await db.as(u).sql("DELETE FROM storage.objects WHERE bucket_id = 'job-photos' RETURNING id")
      expect(del).toHaveLength(0)
    }
    const { rows } = await db.root.query("SELECT count(*)::int AS n FROM storage.objects WHERE bucket_id = 'job-photos'")
    expect(rows[0].n).toBe(2)
  })

  test('ID documents are private to the technician and admin', async () => {
    const see = (u: User) => db.as(u).sql("SELECT name FROM storage.objects WHERE bucket_id = 'id-documents'")
    expect((await see(tech)).map((r) => r.name)).toEqual([`${tech.id}/nin-front.jpg`])
    expect(await see(customer)).toHaveLength(0)
    expect((await see(admin)).length).toBeGreaterThanOrEqual(2)
  })
})

describe('injection and hostile input is stored as plain text', () => {
  test('SQL in a message is just text', async () => {
    const evil = "'); DROP TABLE public.jobs; --"
    await db.as(customer).rpc('send_message', [jobId, evil])
    const rows = await db.as(customer).sql('SELECT body FROM public.messages WHERE job_id = $1 ORDER BY id', [jobId])
    expect(rows[rows.length - 1].body).toBe(evil)
    expect((await db.root.query('SELECT 1 FROM public.jobs LIMIT 1')).rows).toHaveLength(1)
  })

  test('malformed ids are rejected cleanly', async () => {
    await expectFail(db.as(customer).rpc('get_job', ['not-a-uuid']), /invalid input syntax for type uuid/)
    await expectFail(db.as(customer).rpc('get_job', ['00000000-0000-0000-0000-000000000000']), 'Repair not found')
  })
})

describe('prices and the fee split', () => {
  test('customers can\'t see how the service charge is split, by any route', async () => {
    await expectFail(db.as(customer).sql('SELECT labour_kobo, commission_kobo FROM public.jobs'), DENIED)
    const [mine] = await db.as(customer).rpc('my_jobs')
    expect(mine.payout_kobo).toBeNull()
    const [techs] = await db.as(tech).rpc('my_jobs')
    expect(techs.payout_kobo).toBeGreaterThan(0)
  })

  test('everyone signed in can read the price list; only admins see Jiji observations', async () => {
    expect((await db.as(customer).sql('SELECT * FROM public.part_prices')).length).toBeGreaterThan(0)
    expect(await db.as(customer).sql('SELECT * FROM public.price_observations')).toHaveLength(0)
    expect(await db.as(tech).sql('SELECT * FROM public.price_observations')).toHaveLength(0)
    expect((await db.as(admin).sql('SELECT * FROM public.price_observations')).length).toBeGreaterThan(0)
    await expectFail(db.as(null).sql('SELECT * FROM public.part_prices'), DENIED)
  })

  test('only admins change prices, add models or list all jobs', async () => {
    const { rows: [m] } = await db.root.query("SELECT id FROM public.device_models WHERE name = 'iPhone X'")
    for (const u of [customer, tech]) {
      await expectFail(db.as(u).rpc('admin_set_part_price', [m.id, 'screen_replacement', 'standard', 100_000, null]), 'Only an UrbanFix admin')
      await expectFail(db.as(u).rpc('admin_add_model', ['smartphone', 'iphone', 'iPhone 99', null]), 'Only an UrbanFix admin')
      await expectFail(db.as(u).rpc('admin_list_jobs', [null, null]), 'Only an UrbanFix admin')
      await expectFail(db.as(u).rpc('admin_price_board', ['smartphone', 'iphone']), 'Only an UrbanFix admin')
      await expectFail(db.as(u).sql('UPDATE public.part_prices SET price_kobo = 100'), DENIED)
      await expectFail(db.as(u).sql("INSERT INTO public.device_models (device_type, brand, name) VALUES ('smartphone','iphone','Fake')"), DENIED)
    }
  })
})

