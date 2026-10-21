// Test harness: each test file gets its own copy of the template database.
// `db.as(user)` runs SQL exactly the way the app does through Supabase:
// as the `authenticated` (or `anon`) role, with the user's id in the JWT claims,
// so RLS, grants and SECURITY DEFINER checks are all exercised for real.
import fs from 'fs'
import { Client } from 'pg'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { STATE_FILE, TEMPLATE_DB } = require('./constants')

export type User = { id: string; phone: string; email: string }

export const VALID_IMEI = '490154203237518' // passes the Luhn checksum
export const OTHER_VALID_IMEI = '356938035643809'

const usedPhones = new Set<string>()
export function randomPhone(): string {
  for (;;) {
    const p = `+23480${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`
    if (!usedPhones.has(p)) { usedPhones.add(p); return p }
  }
}

export class Db {
  private clients: Client[] = []
  constructor(public readonly name: string, private readonly port: number, public readonly root: Client) {}

  static async fresh(): Promise<Db> {
    const { port } = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
    const name = `t_${Date.now()}_${Math.floor(Math.random() * 1e6)}`
    const admin = new Client({ host: 'localhost', port, user: 'postgres', password: 'postgres', database: 'postgres' })
    await admin.connect()
    await admin.query(`CREATE DATABASE ${name} TEMPLATE ${TEMPLATE_DB}`)
    await admin.end()
    const root = new Client({ host: 'localhost', port, user: 'postgres', password: 'postgres', database: name })
    await root.connect()
    return new Db(name, port, root)
  }

  /** An extra connection, for testing concurrent requests. */
  async connection(): Promise<Client> {
    const c = new Client({ host: 'localhost', port: this.port, user: 'postgres', password: 'postgres', database: this.name })
    await c.connect()
    this.clients.push(c)
    return c
  }

  async close() {
    for (const c of this.clients) await c.end()
    await this.root.end()
  }

  /** Create a Supabase Auth account the way signUp does for phone+PIN users. */
  async authUser(phone = randomPhone()): Promise<User> {
    const email = `${phone.slice(1)}@phone.urbanfix.app`
    const { rows } = await this.root.query('INSERT INTO auth.users (email) VALUES ($1) RETURNING id', [email])
    return { id: rows[0].id, phone, email }
  }

  as(user: User | null, client: Client = this.root): Actor {
    return new Actor(client, user)
  }

  // ---------- fixtures ----------
  async customer(name = 'Ada Obi'): Promise<User> {
    const u = await this.authUser()
    await this.as(u).rpc('complete_signup', ['customer', name, 'Ikeja', '12 Allen Avenue, Ikeja'])
    return u
  }

  async admin(): Promise<User> {
    const u = await this.authUser()
    await this.root.query('SELECT public.make_admin($1)', [u.phone])
    return u
  }

  async technician(opts: {
    approve?: boolean
    services?: [string, string, number][]
    admin?: User
  } = {}): Promise<User> {
    // Service prices are the technician's repair fee (labour only), in kobo.
    const { approve = true, services = [['smartphone', 'screen_replacement', 500_000]] } = opts
    const u = await this.authUser()
    const t = this.as(u)
    await t.rpc('complete_signup', ['technician', 'Emeka Okafor', 'Ikeja', null])
    await t.rpc('save_shop', ['Emeka Phone Clinic', 'Shop 14, Computer Village, Ikeja', 'Ikeja', 'Screens and batteries'])
    for (const [d, c, p] of services) await t.rpc('save_service', [d, c, p, true])
    await t.rpc('save_payout_details', ['GTBank', '0123456789', 'Emeka Okafor'])
    const doc = `${u.id}/nin-front.jpg`
    await t.upload('id-documents', doc)
    await t.rpc('save_identity', ['12345678901', doc])
    await t.rpc('submit_for_review', [])
    if (approve) {
      const a = opts.admin ?? (await this.admin())
      await this.as(a).rpc('admin_review_technician', [u.id, true, null])
    }
    return u
  }

  async modelId(name: string, device = 'smartphone', brand = 'iphone'): Promise<number> {
    const { rows } = await this.root.query(
      'SELECT id FROM public.device_models WHERE device_type = $1 AND brand = $2 AND name = $3', [device, brand, name])
    if (!rows[0]) throw new Error(`No model ${name}`)
    return Number(rows[0].id)
  }

  /** Default booking: iPhone X screen, Premium (GX ₦37,000 in the seeded price list). */
  async book(customer: User, tech: User, over: Partial<{
    device: string; brand: string; model: string | null; modelText: string | null
    category: string; grade: string | null; mode: string; address: string | null
  }> = {}) {
    const device = over.device ?? 'smartphone'
    const brand = over.brand ?? 'iphone'
    const model = over.model === undefined ? 'iPhone X' : over.model
    const modelId = model ? await this.modelId(model, device, brand) : null
    return this.as(customer).one('create_job', [
      tech.id, device, brand, modelId, over.modelText ?? null,
      over.category ?? 'screen_replacement', over.grade === undefined ? 'premium' : over.grade,
      'Screen cracked after a fall',
      over.mode ?? 'visit', over.address === undefined ? '12 Allen Avenue, Ikeja, Lagos' : over.address,
    ])
  }

  /** Technician records the device and confirms the price. */
  async quote(tech: User, jobId: string, opts: { partKobo?: number | null; grade?: string | null; category?: string | null; model?: string | null } = {}) {
    const photo = `${jobId}/intake-1.jpg`
    const { rows } = await this.root.query("SELECT 1 FROM storage.objects WHERE bucket_id = 'job-photos' AND name = $1", [photo])
    if (!rows.length) await this.as(tech).upload('job-photos', photo)
    const modelId = opts.model ? await this.modelId(opts.model) : null
    return this.as(tech).one('record_intake', [jobId, VALID_IMEI, 'Screen shattered, frame bent', [photo],
      modelId, null, opts.category ?? null, opts.grade ?? null, opts.partKobo ?? null])
  }

  /** Book → accept → technician checks device and confirms price. */
  async quotedJob(customer: User, tech: User, over: Parameters<Db['book']>[2] = {}) {
    const job = await this.book(customer, tech, over)
    await this.as(tech).rpc('accept_job', [job.id])
    return this.quote(tech, job.id)
  }

  /** …→ customer pays → admin confirms. Returns the job, now in repair. */
  async paidJob(customer: User, tech: User, admin: User, over: Parameters<Db['book']>[2] = {}) {
    const job = await this.quotedJob(customer, tech, over)
    await this.as(customer).rpc('submit_payment', [job.id, 'Ada Obi GTB transfer'])
    return this.as(admin).one('admin_confirm_payment', [job.id])
  }

  inRepairJob(customer: User, tech: User, admin: User, over: Parameters<Db['book']>[2] = {}) {
    return this.paidJob(customer, tech, admin, over)
  }

  async readyJob(customer: User, tech: User, admin: User, over: Parameters<Db['book']>[2] = {}) {
    const job = await this.paidJob(customer, tech, admin, over)
    const photo = `${job.id}/done-1.jpg`
    await this.as(tech).upload('job-photos', photo)
    return this.as(tech).one('mark_ready', [job.id, 'Replaced screen and tested touch', 'Screen (GX OLED)', [photo]])
  }

  async completedJob(customer: User, tech: User, admin: User, over: Parameters<Db['book']>[2] = {}) {
    const job = await this.readyJob(customer, tech, admin, over)
    return this.as(customer).one('confirm_completion', [job.id])
  }

  async job(id: string) {
    const { rows } = await this.root.query('SELECT * FROM public.jobs WHERE id = $1', [id])
    return rows[0]
  }
}

export class Actor {
  constructor(private readonly client: Client, private readonly user: User | null) {}

  /** Run SQL as this user (authenticated, or anon if no user). */
  async sql(text: string, params: unknown[] = []): Promise<any[]> {
    const c = this.client
    await c.query('BEGIN')
    try {
      await c.query(this.user ? 'SET LOCAL ROLE authenticated' : 'SET LOCAL ROLE anon')
      await c.query("SELECT set_config('request.jwt.claims', $1, true)", [
        this.user ? JSON.stringify({ sub: this.user.id, role: 'authenticated' }) : '',
      ])
      const res = await c.query(text, params)
      await c.query('COMMIT')
      return res.rows
    } catch (e) {
      await c.query('ROLLBACK')
      throw e
    }
  }

  async rpc(fn: string, args: unknown[] = []): Promise<any[]> {
    const placeholders = args.map((_, i) => `$${i + 1}`).join(', ')
    return this.sql(`SELECT * FROM public.${fn}(${placeholders})`, args)
  }

  /** RPC returning one row; unwraps single-column results (jsonb, boolean, int). */
  async one(fn: string, args: unknown[] = []): Promise<any> {
    const rows = await this.rpc(fn, args)
    const row = rows[0]
    if (row && Object.keys(row).length === 1 && fn in row) return row[fn]
    return row
  }

  /** Same as the Storage API: insert an object row as this user, subject to RLS. */
  async upload(bucket: string, name: string) {
    return this.sql('INSERT INTO storage.objects (bucket_id, name) VALUES ($1, $2) RETURNING *', [bucket, name])
  }
}

/** Assert a promise rejects with a message containing `text`. */
export async function expectFail(p: Promise<unknown>, text: string | RegExp) {
  let err: any
  try {
    await p
  } catch (e) {
    err = e
  }
  if (!err) throw new Error(`Expected failure matching ${String(text)}, but it succeeded`)
  if (typeof text === 'string' ? !String(err.message).includes(text) : !text.test(String(err.message))) {
    throw new Error(`Expected failure matching ${String(text)}, got: ${err.message}`)
  }
}

export const DENIED = /permission denied|row-level security|violates row-level/
