import { Db, DENIED, expectFail, User } from './harness'

let db: Db
let admin: User
beforeAll(async () => { db = await Db.fresh(); admin = await db.admin() })
afterAll(async () => { await db.close() })

async function newTech(): Promise<User> {
  const u = await db.authUser()
  await db.as(u).rpc('complete_signup', ['technician', 'Tunde Bello', 'Ikeja', null])
  return u
}

describe('onboarding', () => {
  test('cannot submit for review until everything is filled in, in any order', async () => {
    const u = await newTech()
    const t = db.as(u)
    await expectFail(t.rpc('submit_for_review'), 'shop details')
    await t.rpc('save_shop', ['Tunde Fix It', '22 Obafemi Awolowo Way, Ikeja', 'Ikeja', null])
    await expectFail(t.rpc('submit_for_review'), 'at least one repair')
    await t.rpc('save_service', ['laptop', 'screen_replacement', 6_000_000, true])
    await expectFail(t.rpc('submit_for_review'), 'bank details')
    await t.rpc('save_payout_details', ['Access Bank', '0011223344', 'Tunde Bello'])
    await expectFail(t.rpc('submit_for_review'), 'NIN')
    await t.upload('id-documents', `${u.id}/id.png`)
    await t.rpc('save_identity', ['22334455667', `${u.id}/id.png`])
    const res = await t.one('submit_for_review')
    expect(res.status).toBe('pending')
    await expectFail(t.rpc('submit_for_review'), 'already being reviewed')
  })

  test('an inactive-only service list does not count', async () => {
    const u = await newTech()
    const t = db.as(u)
    await t.rpc('save_shop', ['Tunde Fix It', '22 Obafemi Awolowo Way, Ikeja', 'Ikeja', null])
    await t.rpc('save_service', ['laptop', 'screen_replacement', 6_000_000, false])
    await expectFail(t.rpc('submit_for_review'), 'at least one repair')
  })

  test.each([
    [['', '22 Obafemi Awolowo Way, Ikeja', 'Ikeja', null], 'shop or business name'],
    [['Shop', 'short', 'Ikeja', null], 'full shop address'],
    [['Shop', '22 Obafemi Awolowo Way, Ikeja', '', null], 'Choose your area'],
    [['Shop', '22 Obafemi Awolowo Way, Ikeja', 'Ikeja', 'x'.repeat(301)], 'under 300'],
  ])('save_shop rejects %p', async (args, msg) => {
    const u = await newTech()
    await expectFail(db.as(u).rpc('save_shop', args), msg)
  })

  test.each([
    [['laptop', 'not_a_category', 500_000], 'Unknown repair type'],
    [['toaster', 'screen_replacement', 500_000], 'Unknown repair type'],
    [['laptop', 'screen_replacement', 49_900], 'between ₦500'],
    [['laptop', 'screen_replacement', 0], 'between ₦500'],
    [['laptop', 'screen_replacement', -100_000], 'between ₦500'],
    [['laptop', 'screen_replacement', 500_000_100], 'between ₦500'],
    [['laptop', 'screen_replacement', 9_007_199_254_740_991], 'between ₦500'],
    [['laptop', 'screen_replacement', 500_050], 'whole naira'],
    [['laptop', 'screen_replacement', null], 'between ₦500'],
  ])('save_service rejects %p', async (args, msg) => {
    const u = await newTech()
    await expectFail(db.as(u).rpc('save_service', [...args, true]), msg)
  })

  test('save_service updates the price instead of duplicating; remove_service removes it', async () => {
    const u = await newTech()
    const t = db.as(u)
    await t.rpc('save_service', ['laptop', 'screen_replacement', 6_000_000, true])
    await t.rpc('save_service', ['laptop', 'screen_replacement', 7_000_000, true])
    expect(await t.sql('SELECT price_kobo FROM public.services')).toEqual([{ price_kobo: 7_000_000 }])
    await t.rpc('remove_service', ['laptop', 'screen_replacement'])
    expect(await t.sql('SELECT * FROM public.services')).toHaveLength(0)
  })

  test.each([
    [['', '0011223344', 'Tunde Bello'], 'Choose your bank'],
    [['GTBank', '12345', 'Tunde Bello'], '10 digits'],
    [['GTBank', '00112233AB', 'Tunde Bello'], '10 digits'],
    [['GTBank', '0000000000', 'Tunde Bello'], 'real account number'],
    [['GTBank', '0011223344', '1234'], 'account name'],
  ])('save_payout_details rejects %p', async (args, msg) => {
    const u = await newTech()
    await expectFail(db.as(u).rpc('save_payout_details', args), msg)
  })

  test('customers cannot use technician functions', async () => {
    const c = await db.customer()
    await expectFail(db.as(c).rpc('save_shop', ['Shop', '22 Obafemi Awolowo Way, Ikeja', 'Ikeja', null]), 'Only the technician')
    await expectFail(db.as(c).rpc('save_service', ['laptop', 'screen_replacement', 600_000, true]), 'Only the technician')
    await expectFail(db.as(c).rpc('submit_for_review'), 'Only the technician')
    await expectFail(db.as(c).rpc('set_availability', [true]), 'Only the technician')
  })
})

describe('ID documents', () => {
  test('must be uploaded to your own folder, as an image', async () => {
    const u = await newTech()
    const other = await newTech()
    await expectFail(db.as(u).upload('id-documents', `${other.id}/id.jpg`), DENIED)
    await expectFail(db.as(u).upload('id-documents', `${u.id}/id.pdf`), DENIED)
    await expectFail(db.as(u).upload('id-documents', `${u.id}/../${other.id}/id.jpg`), DENIED)
    await expectFail(db.as(u).upload('id-documents', 'id.jpg'), DENIED)
    const c = await db.customer()
    await expectFail(db.as(c).upload('id-documents', `${c.id}/id.jpg`), DENIED)
  })

  test('save_identity checks NIN and that the photo really exists and is yours', async () => {
    const u = await newTech()
    const other = await newTech()
    await db.as(other).upload('id-documents', `${other.id}/id.jpg`)
    await expectFail(db.as(u).rpc('save_identity', ['123', `${u.id}/id.jpg`]), '11 digits')
    await expectFail(db.as(u).rpc('save_identity', ['11111111111', `${u.id}/id.jpg`]), 'real NIN')
    await expectFail(db.as(u).rpc('save_identity', ['12345678901', `${other.id}/id.jpg`]), 'Upload a photo')
    await expectFail(db.as(u).rpc('save_identity', ['12345678901', `${u.id}/id.jpg`]), 'didn\'t finish uploading')
  })
})

describe('admin review', () => {
  test('approve makes the technician bookable; reject needs a reason; technician can resubmit', async () => {
    const t = await db.technician({ approve: false })
    await expectFail(db.as(admin).rpc('admin_review_technician', [t.id, false, '']), 'Give a reason')
    const r = await db.as(admin).one('admin_review_technician', [t.id, false, 'ID photo is blurry'])
    expect(r).toMatchObject({ status: 'rejected', status_reason: 'ID photo is blurry', is_available: false })
    await db.as(t).rpc('save_identity', ['12345678901', `${t.id}/nin-front.jpg`])
    await db.as(t).rpc('submit_for_review')
    const a = await db.as(admin).one('admin_review_technician', [t.id, true, null])
    expect(a).toMatchObject({ status: 'approved', is_available: true })
    await expectFail(db.as(admin).rpc('admin_review_technician', [t.id, true, null]), 'Only pending or suspended')
  })

  test('technicians and customers cannot approve anyone, including themselves', async () => {
    const t = await db.technician({ approve: false })
    await expectFail(db.as(t).rpc('admin_review_technician', [t.id, true, null]), 'Only an UrbanFix admin')
    const c = await db.customer()
    await expectFail(db.as(c).rpc('admin_review_technician', [t.id, true, null]), 'Only an UrbanFix admin')
  })

  test('suspending an approved technician takes them offline and freezes their details', async () => {
    const t = await db.technician({ admin })
    const s = await db.as(admin).one('admin_review_technician', [t.id, false, 'Customer complaints'])
    expect(s).toMatchObject({ status: 'suspended', is_available: false })
    await expectFail(db.as(t).rpc('set_availability', [true]), 'once UrbanFix approves')
    await expectFail(db.as(t).rpc('save_service', ['smartphone', 'screen_replacement', 100_000, true]), 'suspended')
    await expectFail(db.as(t).rpc('save_shop', ['New', '1 New Street, Ikeja Lagos', 'Ikeja', null]), 'suspended')
  })

  test('bank and ID details are locked after approval (payout redirection protection)', async () => {
    const t = await db.technician({ admin })
    await expectFail(db.as(t).rpc('save_payout_details', ['Kuda', '9988776655', 'Someone Else']), 'contact UrbanFix support')
    await expectFail(db.as(t).rpc('save_identity', ['12345678901', `${t.id}/nin-front.jpg`]), 'already verified')
    await expectFail(db.as(t).upload('id-documents', `${t.id}/new.jpg`), DENIED)
  })

  test('admin can see bank details and ID path for review', async () => {
    const t = await db.technician({ approve: false })
    const d = await db.as(admin).one('admin_technician_details', [t.id])
    expect(d.private).toMatchObject({ account_number: '0123456789', nin: '12345678901', id_document_path: `${t.id}/nin-front.jpg` })
    expect(d.services).toHaveLength(1)
    await expectFail(db.as(t).rpc('admin_technician_details', [t.id]), 'Only an UrbanFix admin')
  })
})

describe('availability', () => {
  test('only approved technicians can go online; going offline hides them from search', async () => {
    const pending = await db.technician({ approve: false })
    await expectFail(db.as(pending).rpc('set_availability', [true]), 'once UrbanFix approves')
    const t = await db.technician({ admin })
    const c = await db.customer()
    const find = async () => (await db.as(c).rpc('find_technicians', ['smartphone', 'screen_replacement', null, 'standard'])).map((r) => r.technician_id)
    expect(await find()).toContain(t.id)
    expect(await find()).not.toContain(pending.id)
    await db.as(t).rpc('set_availability', [false])
    expect(await find()).not.toContain(t.id)
    await db.as(t).rpc('set_availability', [true])
    expect(await find()).toContain(t.id)
  })
})
