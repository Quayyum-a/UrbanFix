// Booking: brand → model → problem → part quality → technician → confirm.
// Every step is one tap; typing is only needed for an unlisted model or a home-visit address.
import { Ionicons } from '@expo/vector-icons'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import React, { useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { PriceBreakdown } from '@/components/PriceBreakdown'
import {
  Banner, Button, Card, Chips, Choice, Empty, ErrorText, Field, Loading, P, Pill, Screen, Small, tap, Title,
} from '@/components/ui'
import { deviceLabel, isDeviceType, partModeOf, REPAIRS, repairLabel, type DeviceType } from '@/constants/catalog'
import { colors, font, radius, spacing } from '@/constants/theme'
import { createJob, findTechnicians, friendlyError, gradeOptions, listBrands, listModels, updateMyProfile } from '@/lib/api'
import { useSession } from '@/lib/session'
import type { DeviceBrand, DeviceModel, Grade, GradeOption, TechnicianMatch } from '@/lib/types'
import { addressProblem, formatNaira, textProblem } from '@/lib/validation'
import { useRoleGuard } from '@/lib/useRole'

const BRAND_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  iphone: 'logo-apple', macbook: 'logo-apple', ipad: 'logo-apple', imac: 'logo-apple', other_android: 'logo-android',
}

function Back({ label, onPress }: { label: string; onPress: () => void }) {
  return <Button title={label} kind="ghost" icon="arrow-back" onPress={onPress} style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} />
}

export default function Book() {
  const guard = useRoleGuard('customer')
  const params = useLocalSearchParams<{ device?: string }>()
  const device: DeviceType = isDeviceType(params.device) ? params.device : 'smartphone'
  const { profile, setProfile } = useSession()

  const [brands, setBrands] = useState<DeviceBrand[] | null>(null)
  const [brand, setBrand] = useState<DeviceBrand | null>(null)
  const [models, setModels] = useState<DeviceModel[] | null>(null)
  const [model, setModel] = useState<DeviceModel | null>(null)
  const [typingModel, setTypingModel] = useState(false) // "my model isn't listed"
  const [modelText, setModelText] = useState('')
  const [modelConfirmed, setModelConfirmed] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [grades, setGrades] = useState<GradeOption[] | null>(null)
  const [grade, setGrade] = useState<GradeOption | null>(null)
  const [noGrade, setNoGrade] = useState(false) // repair without a part
  const [techs, setTechs] = useState<TechnicianMatch[] | null>(null)
  const [tech, setTech] = useState<TechnicianMatch | null>(null)
  const [mode, setMode] = useState<'drop_off' | 'visit'>('drop_off')
  const [address, setAddress] = useState(profile?.address ?? '')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [triedSubmit, setTriedSubmit] = useState(false)

  const partMode = category ? partModeOf(device, category) : 'none'
  const modelChosen = !!model || modelConfirmed
  const gradeKey: Grade | null = noGrade ? null : (grade?.grade ?? null)

  const allowed = !guard
  useEffect(() => {
    if (!allowed) return
    let live = true
    listBrands(device).then((b) => { if (live) setBrands(b) }).catch((e) => { if (live) { setBrands([]); setError(friendlyError(e)) } })
    return () => { live = false }
  }, [device, allowed])

  useEffect(() => {
    if (!brand) return
    let live = true
    listModels(device, brand.brand).then((m) => { if (live) setModels(m) }).catch((e) => { if (live) { setModels([]); setError(friendlyError(e)) } })
    return () => { live = false }
  }, [device, brand])

  useEffect(() => {
    if (!category || partMode === 'none') return
    let live = true
    gradeOptions(model?.id ?? null, category)
      .then((g) => { if (live) setGrades(g) }).catch((e) => { if (live) { setGrades([]); setError(friendlyError(e)) } })
    return () => { live = false }
  }, [category, model, partMode])

  const readyForTechs = !!category && (noGrade || !!grade)
  useEffect(() => {
    if (!readyForTechs || !category) return
    let live = true
    findTechnicians(device, category, model?.id ?? null, gradeKey)
      .then((t) => { if (live) setTechs(t) }).catch((e) => { if (live) { setTechs([]); setError(friendlyError(e)) } })
    return () => { live = false }
  }, [readyForTechs, device, category, model, gradeKey])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (models ?? []).filter((m) => !q || m.name.toLowerCase().includes(q))
  }, [models, search])

  if (guard) return guard

  const title = `Fix my ${deviceLabel(device).toLowerCase()}`
  const modelName = model?.name ?? modelText.trim()

  const resetFrom = (step: 'brand' | 'model' | 'problem' | 'grade' | 'tech') => {
    setError(null)
    if (step === 'brand') { setBrand(null); setModels(null); setSearch('') }
    if (['brand', 'model'].includes(step)) { setModel(null); setTypingModel(false); setModelText(''); setModelConfirmed(false) }
    if (['brand', 'model', 'problem'].includes(step)) { setCategory(null); setGrades(null) }
    if (['brand', 'model', 'problem', 'grade'].includes(step)) { setGrade(null); setNoGrade(false); setTechs(null) }
    setTech(null)
  }

  const chooseProblem = (c: string) => {
    setCategory(c); setGrade(null); setGrades(null); setTechs(null)
    setNoGrade(partModeOf(device, c) === 'none')
  }

  // ---- Step 1: brand
  if (!brand) {
    return (
      <Screen edges={['left', 'right']}>
        <Stack.Screen options={{ title }} />
        <Title sub="Tap your brand.">What {deviceLabel(device).toLowerCase()} is it?</Title>
        <ErrorText error={error} />
        {brands === null ? <Loading /> : (
          <View style={styles.grid}>
            {brands.map((b) => (
              <Pressable key={b.brand} testID={`brand-${b.brand}`} accessibilityRole="button" accessibilityLabel={b.label}
                onPress={() => { tap(); setBrand(b) }} style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}>
                <Ionicons name={BRAND_ICON[b.brand] ?? (b.is_android ? 'logo-android' : 'hardware-chip-outline')} size={26} color={colors.primary} />
                <Text style={[font.bodyStrong, { marginTop: spacing.xs, textAlign: 'center' }]}>{b.label}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </Screen>
    )
  }

  // ---- Step 2: model
  if (!modelChosen && !typingModel) {
    return (
      <Screen edges={['left', 'right']}>
        <Stack.Screen options={{ title }} />
        <Back label="Change brand" onPress={() => resetFrom('brand')} />
        <Title sub={device === 'smartphone' ? (brand.brand === 'iphone' ? 'Not sure? Settings → General → About → Model Name.' : 'Not sure? Settings → About phone.') : 'Check the sticker or the About screen.'}>
          Which {brand.label} model?
        </Title>
        <ErrorText error={error} />
        {models === null ? <Loading /> : (
          <>
            {models.length > 8 ? (
              <TextInput style={styles.search} placeholder="Search models" placeholderTextColor={colors.textFaint} value={search}
                onChangeText={setSearch} accessibilityLabel="Search models" testID="model-search" />
            ) : null}
            {filtered.map((m) => (
              <Choice key={m.id} testID={`model-${m.id}`} title={m.name} subtitle={m.hint ?? undefined} onPress={() => setModel(m)} />
            ))}
            {!filtered.length && search ? <Small style={{ marginBottom: spacing.md }}>No match for "{search}".</Small> : null}
            <Choice testID="model-other" icon="create-outline" title="My model isn't listed" onPress={() => setTypingModel(true)} />
          </>
        )}
      </Screen>
    )
  }

  // Typing an unlisted model name
  if (!modelChosen && typingModel) {
    const err = textProblem(modelText, { min: 2, max: 60, field: 'the model name' })
    return (
      <Screen edges={['left', 'right']} footer={
        <Button title="Continue" disabled={!!err} testID="model-text-continue" onPress={() => setModelConfirmed(true)} />
      }>
        <Stack.Screen options={{ title }} />
        <Back label="Back to the list" onPress={() => resetFrom('model')} />
        <Title sub="The technician will confirm the exact price after checking it.">Type your model</Title>
        <Field label={`${brand.label} model`} placeholder="e.g. Galaxy A57, Camon 50" value={modelText} onChangeText={setModelText}
          maxLength={60} autoFocus error={modelText ? err : null} testID="model-text" />
      </Screen>
    )
  }

  // ---- Step 3: problem
  if (!category) {
    return (
      <Screen edges={['left', 'right']}>
        <Stack.Screen options={{ title }} />
        <Back label="Change model" onPress={() => resetFrom('model')} />
        <Title sub={modelName}>What's wrong?</Title>
        {REPAIRS[device].map((r) => (
          <Choice key={r.category} testID={`problem-${r.category}`} title={r.label} onPress={() => chooseProblem(r.category)} />
        ))}
      </Screen>
    )
  }

  // ---- Step 4: part quality
  if (!noGrade && !grade) {
    const priced = (grades ?? []).filter((g) => g.part_kobo != null)
    const showPrices = partMode === 'catalog' && priced.length > 0
    const options = showPrices ? priced : (grades ?? [])
    return (
      <Screen edges={['left', 'right']}>
        <Stack.Screen options={{ title }} />
        <Back label="Change problem" onPress={() => resetFrom('problem')} />
        <Title sub={`${modelName} · ${repairLabel(device, category)}`}>Choose part quality</Title>
        <ErrorText error={error} />
        {grades === null ? <Loading /> : (
          <>
            {!showPrices ? (
              <Banner tone="neutral" icon="search-outline" text="The part price for this model is confirmed after the technician checks your device. Pick the quality you want." />
            ) : null}
            {options.map((g) => (
              <Card key={g.grade} testID={`grade-${g.grade}`} onPress={() => setGrade(g)} accessibilityLabel={`${g.label}${g.part_kobo != null ? `, part ${formatNaira(g.part_kobo)}` : ''}`}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md }}>
                  <View style={{ flex: 1 }}>
                    <Text style={font.bodyStrong}>{g.label}{g.market_label ? <Text style={font.small}>  {g.market_label}</Text> : null}</Text>
                    <Small>{g.description}</Small>
                  </View>
                  {showPrices && g.part_kobo != null ? <Text style={font.bodyStrong}>{formatNaira(g.part_kobo)}</Text> : null}
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, alignItems: 'center' }}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={colors.success} />
                  <Small style={{ color: colors.success }}>{g.warranty_days}-day warranty</Small>
                  {showPrices ? <Small>· part price, service charge added next</Small> : null}
                </View>
              </Card>
            ))}
          </>
        )}
      </Screen>
    )
  }

  // ---- Step 5: technician
  if (!tech) {
    return (
      <Screen edges={['left', 'right']}>
        <Stack.Screen options={{ title }} />
        <Back label={noGrade ? 'Change problem' : 'Change quality'} onPress={() => resetFrom(noGrade ? 'problem' : 'grade')} />
        <Title sub={`${modelName} · ${repairLabel(device, category)}${grade ? ` · ${grade.label}` : ''}`}>Choose a technician</Title>
        <ErrorText error={error} />
        {techs === null ? <Loading label="Finding technicians" /> : techs.length === 0 ? (
          <Empty icon="search-outline" title="No technicians available for this yet"
            text="We're adding verified technicians every week. Try a different problem or check back soon." />
        ) : techs.map((t) => (
          <Card key={t.technician_id} testID={`tech-${t.technician_id}`} onPress={() => setTech(t)}
            accessibilityLabel={`${t.shop_name ?? t.full_name}, ${t.part_pending ? `service charge ${formatNaira(t.service_charge_kobo)} plus part` : formatNaira(t.total_kobo)}`}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={font.bodyStrong}>{t.shop_name ?? t.full_name}</Text>
                <Small>{t.full_name} · {t.area}</Small>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[font.heading, { marginTop: 0, marginBottom: 0 }]}>{formatNaira(t.part_pending ? t.service_charge_kobo : t.total_kobo)}</Text>
                <Small>{t.part_pending ? '+ part after check' : 'total'}</Small>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap', alignItems: 'center' }}>
              <Ionicons name="shield-checkmark" size={16} color={colors.success} />
              <Small style={{ color: colors.success }}>Verified</Small>
              {t.rating ? <Small>★ {Number(t.rating).toFixed(1)} ({t.reviews})</Small> : <Small>New on UrbanFix</Small>}
              {t.jobs_done ? <Small>· {t.jobs_done} repairs</Small> : null}
              {t.used_before ? <Pill text="Used before · lower charge" tone="good" /> : null}
            </View>
          </Card>
        ))}
      </Screen>
    )
  }

  // ---- Step 6: confirm
  const addrErr = mode === 'visit' ? addressProblem(address) : null
  const submit = async () => {
    setTriedSubmit(true)
    if (addrErr) return
    setBusy(true); setError(null)
    try {
      const job = await createJob({
        technicianId: tech.technician_id, deviceType: device, brand: brand.brand,
        modelId: model?.id ?? null, modelText: model ? null : modelText,
        category, grade: gradeKey, issueNote: note, mode, address,
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
      <Button title="Request repair" onPress={submit} loading={busy} testID="request" />
    }>
      <Stack.Screen options={{ title }} />
      <Title sub="Nothing is charged now.">Confirm your request</Title>
      <Card>
        <Text style={font.bodyStrong}>{brand.brand === 'iphone' ? '' : `${brand.label} `}{modelName}</Text>
        <Small style={{ marginBottom: spacing.sm }}>{repairLabel(device, category)} · {tech.shop_name ?? tech.full_name}</Small>
        <PriceBreakdown partKobo={tech.part_kobo} partPending={tech.part_pending} gradeLabel={grade?.label} partLabel={grade?.market_label}
          serviceChargeKobo={tech.service_charge_kobo} needsPart={!noGrade} estimate />
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
      <Field label="Anything else the technician should know? (optional)" value={note} onChangeText={setNote} multiline maxLength={500} />
      <ErrorText error={error} />
      <P muted>Payment goes to UrbanFix, not the technician. We hold it until you confirm the repair{grade ? `, and the part has a ${grade.warranty_days}-day warranty` : ''}.</P>
    </Screen>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md },
  tile: { width: '31%', minHeight: 92, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', padding: spacing.sm },
  search: { minHeight: 50, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, backgroundColor: colors.surface, marginBottom: spacing.md, ...font.body },
})
