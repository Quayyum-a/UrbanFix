// Admin reviews a technician: details, prices, ID photo → approve or reject.
import { router, useLocalSearchParams } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { Image, Text } from 'react-native'
import { Banner, Button, Card, ErrorText, Field, Heading, Loading, Row, Screen, Small } from '@/components/ui'
import { repairLabel, deviceLabel } from '@/constants/catalog'
import { font, radius } from '@/constants/theme'
import * as api from '@/lib/api'
import { signedUrls } from '@/lib/photos'
import { useRoleGuard } from '@/lib/useRole'
import { displayPhone, formatNaira } from '@/lib/validation'

type Details = NonNullable<Awaited<ReturnType<typeof api.adminTechnicianDetails>>>

export default function ReviewTechnician() {
  const guard = useRoleGuard('admin')
  const { id } = useLocalSearchParams<{ id: string }>()
  const [d, setD] = useState<Details | null>(null)
  const [idUrl, setIdUrl] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    api.adminTechnicianDetails(id).then(async (r) => {
      setD(r)
      const path = r?.private?.id_document_path
      if (path) setIdUrl((await signedUrls('id-documents', [path]))[path] ?? null)
    }).catch((e) => setError(api.friendlyError(e)))
  }, [id])

  if (guard) return guard
  if (!d) return <Screen edges={['left', 'right']}>{error ? <ErrorText error={error} /> : <Loading />}</Screen>

  const decide = async (approve: boolean) => {
    setBusy(true); setError(null)
    try {
      await api.adminReviewTechnician(d.technician.id, approve, approve ? null : reason)
      router.back()
    } catch (e) {
      setError(api.friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  const t = d.technician
  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <Text style={font.title}>{t.shop_name}</Text>
      <Small>Status: {t.status}</Small>
      {t.status === 'approved' ? <Banner tone="good" text="Approved and can take jobs." /> : null}
      <Card>
        <Row label="Name" value={d.profile.full_name} />
        <Row label="Phone" value={displayPhone(d.profile.phone)} />
        <Row label="Area" value={t.area ?? '-'} />
        <Row label="Shop address" value={t.shop_address ?? '-'} />
        {t.bio ? <Row label="Bio" value={t.bio} /> : null}
      </Card>
      <Heading>Identity</Heading>
      <Card>
        <Row label="NIN" value={d.private.nin ?? '-'} />
        {idUrl ? <Image source={{ uri: idUrl }} style={{ width: '100%', height: 220, borderRadius: radius.md, marginTop: 8 }} resizeMode="contain" />
          : <Small>No ID photo</Small>}
        <Small style={{ marginTop: 8 }}>Check the name on the ID matches the account name and bank account name.</Small>
      </Card>
      <Heading>Bank</Heading>
      <Card>
        <Row label="Bank" value={d.private.bank_name ?? '-'} />
        <Row label="Account" value={d.private.account_number ?? '-'} />
        <Row label="Account name" value={d.private.account_name ?? '-'} />
      </Card>
      <Heading>Prices</Heading>
      <Card>
        {d.services.length ? d.services.map((s) => (
          <Row key={`${s.device_type}:${s.category}`} label={`${deviceLabel(s.device_type)}: ${repairLabel(s.device_type, s.category)}${s.is_active ? '' : ' (off)'}`} value={formatNaira(s.price_kobo)} />
        )) : <Small>No services</Small>}
      </Card>
      <ErrorText error={error} />
      {['pending', 'suspended'].includes(t.status) ? <Button title="Approve" kind="accent" loading={busy && !rejecting} onPress={() => void decide(true)} testID="approve" /> : null}
      {['pending', 'approved'].includes(t.status) ? (rejecting ? (
        <>
          <Field label={t.status === 'approved' ? 'Reason for suspending' : 'What do they need to fix?'} value={reason} onChangeText={setReason} maxLength={300} multiline />
          <Button title={t.status === 'approved' ? 'Suspend' : 'Reject'} kind="danger" disabled={reason.trim().length < 5} loading={busy} onPress={() => void decide(false)} />
        </>
      ) : <Button title={t.status === 'approved' ? 'Suspend technician' : 'Reject'} kind="danger" onPress={() => setRejecting(true)} />) : null}
    </Screen>
  )
}
