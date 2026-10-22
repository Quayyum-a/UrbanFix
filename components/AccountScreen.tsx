// Shared account screen: name, location (from the phone, not a picker), address, sign out.
import React, { useState } from 'react'
import { Alert } from 'react-native'
import { LocationPicker } from '@/components/LocationPicker'
import { Banner, Button, Card, ErrorText, Field, Row, Screen, Title } from '@/components/ui'
import { friendlyError, signOut, updateMyProfile } from '@/lib/api'
import { useSession } from '@/lib/session'
import { addressProblem, displayPhone, nameProblem } from '@/lib/validation'

export function AccountScreen({ children, showAddress = true }: { children?: React.ReactNode; showAddress?: boolean }) {
  const { profile, setProfile } = useSession()
  const [name, setName] = useState(profile?.full_name ?? '')
  const [area, setArea] = useState<string | null>(profile?.area ?? null)
  const [address, setAddress] = useState(profile?.address ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  if (!profile) return null
  const nameErr = nameProblem(name)
  const addrErr = showAddress ? addressProblem(address, { required: false }) : null
  const dirty = name !== profile.full_name || area !== profile.area || (address || null) !== (profile.address || null)

  const save = async () => {
    if (nameErr || addrErr) return
    setBusy(true); setError(null); setSaved(false)
    try {
      setProfile(await updateMyProfile(name, area, showAddress ? address : profile.address))
      setSaved(true)
    } catch (e) {
      setError(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  // A location change saves straight away: one tap, no extra Save.
  const saveLocation = async (newArea: string, detected: string | null) => {
    const newAddress = showAddress && detected && !address ? detected : address
    setArea(newArea); setAddress(newAddress); setError(null); setSaved(false)
    try {
      setProfile(await updateMyProfile(profile.full_name, newArea, (showAddress ? newAddress : profile.address) || null))
      setSaved(true)
    } catch (e) {
      setError(friendlyError(e))
    }
  }

  return (
    <Screen>
      <Title>Account</Title>
      <Card>
        <Row label="Phone" value={displayPhone(profile.phone)} />
        <Row label="Account type" value={profile.role === 'customer' ? 'Customer' : profile.role === 'technician' ? 'Technician' : 'Admin'} />
      </Card>
      {children}
      <Field label="Name" value={name} onChangeText={(t) => { setName(t); setSaved(false) }} error={nameErr} maxLength={80} />
      <LocationPicker area={area} compact title="Area" onChange={(a, addr) => void saveLocation(a, addr)} />
      {showAddress ? (
        <Field label="Address for home visits (optional)" value={address} onChangeText={(t) => { setAddress(t); setSaved(false) }}
          multiline maxLength={200} error={addrErr} />
      ) : null}
      <ErrorText error={error} />
      {saved ? <Banner tone="good" text="Saved." /> : null}
      <Button title="Save changes" onPress={save} loading={busy} disabled={!dirty} />
      <Button title="Sign out" kind="danger" icon="log-out-outline" onPress={() =>
        Alert.alert('Sign out?', 'You can sign back in with your phone number and PIN.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
        ])} />
    </Screen>
  )
}
