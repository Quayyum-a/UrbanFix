// Technician onboarding: shop, repairs & prices, bank, ID → submit for review.
// Each section saves on its own, so it can be finished in several sittings.
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import React, { useState } from 'react'
import { Text, View } from 'react-native'
import { PhotoPicker } from '@/components/PhotoPicker'
import { Banner, Button, Card, Chips, ErrorText, Field, Loading, Screen, Small, Title } from '@/components/ui'
import { AREAS, BANKS, DEVICES, REPAIRS, type DeviceType } from '@/constants/catalog'
import { colors, font, spacing } from '@/constants/theme'
import * as api from '@/lib/api'
import { useSession } from '@/lib/session'
import { useRoleGuard } from '@/lib/useRole'
import { setupProgress, useMyTechnician } from '@/lib/useTechnician'
import { accountNumberProblem, addressProblem, formatNaira, nameProblem, ninProblem, parseNairaToKobo, priceProblem, textProblem } from '@/lib/validation'

function Section({ n, title, done, open, onOpen, children }: {
  n: number; title: string; done: boolean; open: boolean; onOpen: () => void; children: React.ReactNode
}) {
  return (
    <Card onPress={open ? undefined : onOpen} accessibilityLabel={title}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={done ? colors.success : colors.textFaint} />
        <Text style={[font.bodyStrong, { flex: 1 }]}>{n}. {title}</Text>
        {!open ? <Ionicons name="chevron-down" size={20} color={colors.textFaint} /> : null}
      </View>
      {open ? <View style={{ marginTop: spacing.lg }}>{children}</View> : null}
    </Card>
  )
}

type MyTechnician = NonNullable<ReturnType<typeof useMyTechnician>['data']>

export default function TechnicianSetup() {
  const guard = useRoleGuard('technician')
  const { data, error, reload } = useMyTechnician()
  if (guard) return guard
  if (!data) return <Screen>{error ? <ErrorText error={error} /> : <Loading />}</Screen>
  return <SetupForm data={data} reload={reload} />
}

function firstOpenSection(d: MyTechnician): number {
  const p = setupProgress(d)
  if (!p.shop) return 1
  if (!p.services) return 2
  if (!p.bank) return 3
  if (!p.identity) return 4
  return 0
}

function SetupForm({ data, reload }: { data: MyTechnician; reload: (manual?: boolean) => Promise<void> }) {
  const profile = useSession((s) => s.profile)
  const progress = setupProgress(data)
  const editable = ['draft', 'pending', 'rejected'].includes(data.tech.status)
  // Approved technicians (e.g. added directly by UrbanFix) can add bank details once.
  const bankEditable = editable || (data.tech.status === 'approved' && !data.priv?.account_number)
  const [open, setOpen] = useState<number>(() => firstOpenSection(data))
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Form fields start from what's saved; later reloads don't overwrite typing.
  const [shopName, setShopName] = useState(data.tech.shop_name ?? '')
  const [shopAddress, setShopAddress] = useState(data.tech.shop_address ?? '')
  const [area, setArea] = useState<string | null>(data.tech.area ?? profile?.area ?? 'Ikeja')
  const [bio, setBio] = useState(data.tech.bio ?? '')
  const [device, setDevice] = useState<DeviceType>('smartphone')
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [bank, setBank] = useState<string | null>(data.priv?.bank_name ?? null)
  const [acct, setAcct] = useState(data.priv?.account_number ?? '')
  const [acctName, setAcctName] = useState(data.priv?.account_name ?? profile?.full_name ?? '')
  const [nin, setNin] = useState(data.priv?.nin ?? '')
  const [idDoc, setIdDoc] = useState<string[]>(data.priv?.id_document_path ? [data.priv.id_document_path] : [])

  const save = async (key: string, fn: () => Promise<unknown>, next?: number): Promise<boolean> => {
    setBusy(key); setError(null)
    try {
      await fn()
      await reload()
      if (next !== undefined) setOpen(next)
      return true
    } catch (e) {
      setError(api.friendlyError(e))
      return false
    } finally {
      setBusy(null)
    }
  }

  const shopErr = textProblem(shopName, { min: 2, max: 80, field: 'your shop name' }) ?? addressProblem(shopAddress) ?? (area ? null : 'Choose your area.')
  const bankErr = (bank ? null : 'Choose your bank.') ?? accountNumberProblem(acct) ?? (nameProblem(acctName) ? 'Enter the account name exactly as your bank shows it.' : null)
  const idErr = ninProblem(nin) ?? (idDoc.length ? null : 'Add a photo of your NIN slip, ID card or passport.')
  const myUid = data.tech.id

  const status = data.tech.status
  return (
    <Screen footer={editable && status !== 'pending' ? (
      <Button title="Submit for approval" kind="accent" disabled={!progress.complete} loading={busy === 'submit'} testID="submit-review"
        onPress={() => void save('submit', () => api.submitForReview()).then((ok) => { if (ok) router.replace('/technician') })} />
    ) : undefined}>
      <Title sub="UrbanFix checks every technician before customers can book them. It usually takes a day.">Get approved</Title>
      {status === 'pending' ? <Banner tone="neutral" text="Submitted. We're reviewing your details. You can still make changes." /> : null}
      {status === 'rejected' ? <Banner tone="bad" text={`Not approved yet: ${data.tech.status_reason ?? ''}. Fix this and submit again.`} /> : null}
      {status === 'approved' ? <Banner tone="good" text="You're approved. You can update your shop and prices here." /> : null}
      {status === 'suspended' ? <Banner tone="bad" text={`Your account is suspended: ${data.tech.status_reason ?? ''}`} /> : null}
      <ErrorText error={error} />

      <Section n={1} title="Your shop" done={progress.shop} open={open === 1} onOpen={() => setOpen(1)}>
        <Field label="Shop or business name" value={shopName} onChangeText={setShopName} maxLength={80} testID="shop-name" />
        <Field label="Shop address" placeholder="Shop number, building, street, landmark" value={shopAddress} onChangeText={setShopAddress}
          multiline maxLength={200} testID="shop-address" />
        <Chips label="Area" options={AREAS.map((a) => ({ value: a, label: a }))} value={area} onChange={setArea} />
        <Field label="What you're good at (optional)" placeholder="e.g. iPhone screens, Tecno charging ports" value={bio} onChangeText={setBio} maxLength={300} />
        {shopErr && (shopName || shopAddress) ? <Small style={{ color: colors.danger, marginBottom: spacing.sm }}>{shopErr}</Small> : null}
        <Button title="Save shop" disabled={!!shopErr} loading={busy === 'shop'} testID="save-shop"
          onPress={() => void save('shop', () => api.saveShop(shopName, shopAddress, area!, bio), 2)} />
      </Section>

      <Section n={2} title="Repairs you do and your repair fee" done={progress.services} open={open === 2} onOpen={() => setOpen(2)}>
        <Small style={{ marginBottom: spacing.md }}>Set your fee for the work only. Parts are priced separately: from the UrbanFix price list, or by you after checking the device when a part isn't listed. Customers see the part and one service charge (your fee plus a small UrbanFix fee).</Small>
        <Chips options={DEVICES.map((d) => ({ value: d.type, label: d.label }))} value={device} onChange={setDevice} />
        {REPAIRS[device].map((r) => {
          const key = `${device}:${r.category}`
          const existing = data.services.find((s) => s.device_type === device && s.category === r.category)
          const input = prices[key] ?? ''
          const err = input ? priceProblem(input) : null
          return (
            <View key={key} style={{ borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[font.body, { flex: 1 }]}>{r.label}</Text>
                {existing ? <Text style={font.bodyStrong}>{formatNaira(existing.price_kobo)}</Text> : null}
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', marginTop: spacing.xs }}>
                <View style={{ flex: 1 }}>
                  <Field label={existing ? 'New repair fee (₦)' : 'Repair fee (₦)'} placeholder="e.g. 5000" keyboardType="number-pad" value={input}
                    onChangeText={(t) => setPrices((p) => ({ ...p, [key]: t.replace(/[^0-9]/g, '').slice(0, 7) }))} error={err} testID={`price-${key}`} />
                </View>
                <Button title={existing ? 'Update' : 'Add'} kind="secondary" disabled={!input || !!err} loading={busy === key}
                  style={{ marginTop: 22 }} testID={`add-${key}`}
                  onPress={() => void save(key, () => api.saveService(device, r.category, parseNairaToKobo(input)!, true)).then((ok) => { if (ok) setPrices((p) => ({ ...p, [key]: '' })) })} />
              </View>
              {existing ? (
                <Button title="Remove" kind="ghost" loading={busy === `rm-${key}`} style={{ alignSelf: 'flex-start', minHeight: 36 }}
                  onPress={() => void save(`rm-${key}`, () => api.removeService(device, r.category))} />
              ) : null}
            </View>
          )
        })}
        <Button title="Done with repair fees" kind="secondary" disabled={!progress.services} style={{ marginTop: spacing.md }} onPress={() => setOpen(editable ? 3 : 0)} />
      </Section>

      <Section n={3} title="Where we pay you" done={progress.bank} open={open === 3} onOpen={() => setOpen(3)}>
        {!bankEditable ? <Banner tone="neutral" text="Bank details are locked after approval for your safety. Contact UrbanFix support to change them." /> : null}
        <Chips label="Bank" options={BANKS.map((b) => ({ value: b, label: b }))} value={bank} onChange={setBank} />
        <Field label="Account number" keyboardType="number-pad" maxLength={10} value={acct} onChangeText={(t) => setAcct(t.replace(/[^0-9]/g, ''))}
          error={acct.length === 10 ? accountNumberProblem(acct) : null} editable={bankEditable} testID="acct" />
        <Field label="Account name" value={acctName} onChangeText={setAcctName} maxLength={80} editable={bankEditable} />
        {bankEditable ? <Button title="Save bank details" disabled={!!bankErr} loading={busy === 'bank'} testID="save-bank"
          onPress={() => void save('bank', () => api.savePayoutDetails(bank!, acct, acctName), 4)} /> : null}
      </Section>

      <Section n={4} title="Your ID" done={progress.identity} open={open === 4} onOpen={() => setOpen(4)}>
        <Small style={{ marginBottom: spacing.md }}>Only UrbanFix staff see this. It's how customers know you're real.</Small>
        <Field label="NIN (11 digits)" keyboardType="number-pad" maxLength={11} value={nin} onChangeText={(t) => setNin(t.replace(/[^0-9]/g, ''))}
          error={nin.length === 11 ? ninProblem(nin) : null} editable={editable} testID="nin" />
        {editable ? (
          <>
            <PhotoPicker bucket="id-documents" folder={myUid} prefix="id" max={1} value={idDoc} onChange={setIdDoc} label="Photo of your NIN slip, ID card or passport" />
            <Button title="Save ID" disabled={!!idErr} loading={busy === 'id'} testID="save-id"
              onPress={() => void save('id', () => api.saveIdentity(nin, idDoc[0]!), 0)} />
          </>
        ) : <Banner tone="good" text="ID verified." />}
      </Section>

      {!progress.complete && editable ? <Small style={{ textAlign: 'center', marginTop: spacing.sm }}>Finish all 4 steps to submit.</Small> : null}
    </Screen>
  )
}
