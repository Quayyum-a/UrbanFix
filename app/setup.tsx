// First-time setup: what you're here for, and your name. One screen.
import { Redirect, router } from 'expo-router'
import React, { useState } from 'react'
import { LocationPicker } from '@/components/LocationPicker'
import { Button, Choice, ErrorText, Field, Screen, Small, Title } from '@/components/ui'
import { completeSignup, friendlyError, signOut } from '@/lib/api'
import { homeFor, useSession } from '@/lib/session'
import { nameProblem } from '@/lib/validation'

export default function Setup() {
  const { status, profile, setProfile } = useSession()
  const [role, setRole] = useState<'customer' | 'technician' | null>(null)
  const [name, setName] = useState('')
  const [area, setArea] = useState<string | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)

  if (status !== 'needs_setup') return <Redirect href={homeFor(status, profile) as never} />

  const nameErr = nameProblem(name)

  const submit = async () => {
    setTouched(true)
    if (!role || nameErr) return
    setBusy(true); setError(null)
    try {
      const p = await completeSignup(role, name, area, role === 'customer' ? address : null)
      setProfile(p)
      router.replace(role === 'technician' ? '/technician-setup' : '/customer')
    } catch (e) {
      setError(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen footer={role ? <Button title="Continue" onPress={submit} loading={busy} testID="setup-continue" /> : undefined}>
      <Title sub="This sets up your account.">What brings you here?</Title>
      <Choice testID="role-customer" icon="build-outline" title="I need a repair" subtitle="Phone, laptop, tablet or desktop"
        selected={role === 'customer'} onPress={() => setRole('customer')} />
      <Choice testID="role-technician" icon="construct-outline" title="I fix devices" subtitle="Get repair jobs and get paid safely"
        selected={role === 'technician'} onPress={() => setRole('technician')} />
      {role ? (
        <>
          <Field
            label="Your name"
            placeholder="e.g. Ada Obi"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            textContentType="name"
            autoComplete="name"
            maxLength={80}
            error={touched ? nameErr : null}
            onBlur={() => setTouched(true)}
            testID="name"
          />
          <LocationPicker area={area} onChange={(a, addr) => { setArea(a); setAddress(addr) }}
            title={role === 'technician' ? 'Shop area' : 'Your area'}
            why={role === 'technician' ? 'So customers nearby can find you.' : 'We ask once, to show technicians near you. You can skip this.'} />
          <ErrorText error={error} />
        </>
      ) : null}
      <Small style={{ marginTop: 16 }}>Signed in with the wrong number?</Small>
      <Button title="Sign out" kind="ghost" onPress={() => void signOut()} />
    </Screen>
  )
}
