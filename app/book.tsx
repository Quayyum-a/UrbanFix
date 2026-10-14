// Booking: problem → technician → confirm. Each step is one tap; typing is optional
// except an address when the technician should come to you.
import { Ionicons } from '@expo/vector-icons'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import {
  Banner, Button, Card, Chips, Choice, Empty, ErrorText, Field, Heading, Loading, P, Pill, Row, Screen, Small, tap, Title,
} from '@/components/ui'
import { BRANDS, deviceLabel, isDeviceType, REPAIRS, repairLabel, type DeviceType } from '@/constants/catalog'
import { colors, font, spacing } from '@/constants/theme'
import { createJob, findTechnicians, friendlyError, updateMyProfile } from '@/lib/api'
import { useSession } from '@/lib/session'
import type { TechnicianMatch } from '@/lib/types'
import { addressProblem, formatNaira } from '@/lib/validation'
import { useRoleGuard } from '@/lib/useRole'

export default function Book() {
  const guard = useRoleGuard('customer')
  const params = useLocalSearchParams<{ device?: string }>()
  const device: DeviceType = isDeviceType(params.device) ? params.device : 'smartphone'
  const { profile, setProfile } = useSession()

  const [category, setCategory] = useState<string | null>(null)
  const [techs, setTechs] = useState<TechnicianMatch[] | null>(null)
  const [tech, setTech] = useState<TechnicianMatch | null>(null)
  const [mode, setMode] = useState<'drop_off' | 'visit'>('drop_off')
  const [address, setAddress] = useState(profile?.address ?? '')
  const [brand, setBrand] = useState<string | null>(null)
  const [model, setModel] = useState('')
  const [note, setNote] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [triedSubmit, setTriedSubmit] = useState(false)

  useEffect(() => {
    if (!category) return
    let live = true
    setTechs(null); setError(null)
    findTechnicians(device, category)
      .then((t) => { if (live) setTechs(t) })
      .catch((e) => { if (live) { setTechs([]); setError(friendlyError(e)) } })
    return () => { live = false }
  }, [device, category])

  if (guard) return guard

  const title = `Fix my ${deviceLabel(device).toLowerCase()}`

  // Step 1: what's wrong
  if (!category) {
    return (
      <Screen edges={['left', 'right']}>
        <Stack.Screen options={{ title }} />
        <Title sub="Tap the closest match. You can add details later.">What's wrong?</Title>
        {REPAIRS[device].map((r) => (
          <Choice key={r.category} testID={`problem-${r.category}`} title={r.label} onPress={() => setCategory(r.category)} />
        ))}
      </Screen>
    )
  }

  // Step 2: choose technician
  if (!tech) {
    return (
      <Screen edges={['left', 'right']}>
        <Stack.Screen options={{ title }} />
        <Title sub={repairLabel(device, category)}>Choose a technician</Title>
        <Button title="Change problem" kind="ghost" icon="arrow-back" onPress={() => setCategory(null)} style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} />
        <ErrorText error={error} />
        {techs === null ? <Loading label="Finding technicians near you" /> : techs.length === 0 ? (
          <Empty icon="search-outline" title="No technicians available for this yet"
            text="We're adding verified technicians every week. Try a different problem or check back soon." />
        ) : techs.map((t) => (
          <Card key={t.technician_id} testID={`tech-${t.technician_id}`} onPress={() => setTech(t)} accessibilityLabel={`${t.shop_name ?? t.full_name}, ${formatNaira(t.price_kobo)}`}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={font.bodyStrong}>{t.shop_name ?? t.full_name}</Text>
                <Small>{t.full_name} · {t.area}</Small>
              </View>
              <Text style={[font.heading, { marginTop: 0, marginBottom: 0 }]}>{formatNaira(t.price_kobo)}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap', alignItems: 'center' }}>
              <Ionicons name="shield-checkmark" size={16} color={colors.success} />
              <Small style={{ color: colors.success }}>Verified</Small>
              {t.rating ? <Small>★ {Number(t.rating).toFixed(1)} ({t.reviews})</Small> : <Small>New on UrbanFix</Small>}
              {t.jobs_done ? <Small>· {t.jobs_done} repairs</Small> : null}
              {t.used_before ? <Pill text="Used before · lower fee" tone="good" /> : null}
            </View>
          </Card>
        ))}
      </Screen>
    )
  }

  // Step 3: confirm
  const addrErr = mode === 'visit' ? addressProblem(address) : null
  const submit = async () => {
    setTriedSubmit(true)
    if (addrErr) return
    setBusy(true); setError(null)
    try {
      const job = await createJob({
        technicianId: tech.technician_id, deviceType: device, category,
        brand, model, issueNote: note, mode, address,
      })
      if (mode === 'visit' && profile && !profile.address) {
        updateMyProfile(profile.full_name, profile.area, address).then(setProfile).catch(() => {})
      }
      router.replace(`/job/${job.id}`)
    } catch (e) {
      setError(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen edges={['left', 'right', 'bottom']} footer={
      <Button title={`Request repair · ${formatNaira(tech.price_kobo)}`} onPress={submit} loading={busy} testID="request" />
    }>
      <Stack.Screen options={{ title }} />
      <Title sub="Nothing is charged yet. You'll pay after the technician accepts.">Confirm your request</Title>
      <Card>
        <Row label="Technician" value={tech.shop_name ?? tech.full_name} />
        <Row label="Problem" value={repairLabel(device, category)} />
        <Row label="Price" value={formatNaira(tech.price_kobo)} />
        <Pressable onPress={() => { tap(); setTech(null) }} accessibilityRole="button">
          <Text style={[font.bodyStrong, { color: colors.primary, marginTop: spacing.sm }]}>Change technician</Text>
        </Pressable>
      </Card>

      <Chips<'drop_off' | 'visit'>
        label="How should the device get to them?"
        value={mode}
        onChange={setMode}
        options={[{ value: 'drop_off', label: "I'll drop it off" }, { value: 'visit', label: 'Come to me' }]}
        testID="mode"
      />
      {mode === 'drop_off' ? (
        <Banner tone="neutral" icon="location-outline" text={`Drop-off at ${tech.shop_address ?? tech.area ?? 'their shop'}. They'll record your device's IMEI and condition in front of you.`} />
      ) : (
        <Field label="Your address" placeholder="House number, street, landmark, area" value={address} onChangeText={setAddress}
          multiline maxLength={200} error={triedSubmit ? addrErr : null} testID="address" />
      )}

      {showDetails ? (
        <>
          <Heading>Details (optional)</Heading>
          <Chips label="Brand" options={BRANDS[device].map((b) => ({ value: b, label: b }))} value={brand} onChange={setBrand} />
          <Field label="Model" placeholder="e.g. Galaxy A54, Spark 10" value={model} onChangeText={setModel} maxLength={60} />
          <Field label="Anything else the technician should know?" value={note} onChangeText={setNote} multiline maxLength={500} />
        </>
      ) : (
        <Button title="Add brand, model or notes (optional)" kind="secondary" icon="add" onPress={() => setShowDetails(true)} />
      )}

      <ErrorText error={error} />
      <P muted style={{ marginTop: spacing.sm }}>
        After they accept, you'll transfer {formatNaira(tech.price_kobo)} to UrbanFix. We hold it until you confirm the repair.
      </P>
    </Screen>
  )
}
