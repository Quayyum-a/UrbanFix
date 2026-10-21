// Phone number → PIN. New numbers create a PIN (entered twice); returning
// numbers enter it once. The PIN pad submits on the 6th digit.
import { Redirect } from 'expo-router'
import React, { useEffect, useRef, useState } from 'react'
import { Alert, Linking, Text, View } from 'react-native'
import { PinPad } from '@/components/PinPad'
import { Banner, Button, Field, P, Screen, Small, Title } from '@/components/ui'
import { colors, spacing } from '@/constants/theme'
import { friendlyError, phoneRegistered, signIn, signUp } from '@/lib/api'
import { homeFor, useSession } from '@/lib/session'
import { displayPhone, normalizePhone, pinProblem } from '@/lib/validation'

type Step = 'phone' | 'enter' | 'create' | 'confirm'

const LOCK_AFTER = 5
const LOCK_SECONDS = 60
const clock = () => Date.now()
const SUPPORT_WHATSAPP = (process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP ?? '').replace(/[^0-9]/g, '')

function forgotPin(e164: string) {
  const text = `Hi UrbanFix, I forgot my PIN. My number is ${displayPhone(e164)}.`
  if (!SUPPORT_WHATSAPP) {
    Alert.alert('Forgot your PIN?', 'Contact UrbanFix support from this phone number and we will reset it for you.')
    return
  }
  Alert.alert('Forgot your PIN?', 'Message UrbanFix support on WhatsApp from this phone number. We will reset it for you.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Open WhatsApp', onPress: () => void Linking.openURL(`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(text)}`) },
  ])
}

export default function SignIn() {
  const { status, profile } = useSession()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [firstPin, setFirstPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [failures, setFailures] = useState(0)
  const [lockedUntil, setLockedUntil] = useState(0)
  const [now, setNow] = useState(clock)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const e164 = normalizePhone(phone)
  const locked = lockedUntil > now

  useEffect(() => {
    if (!locked) return
    timer.current = setInterval(() => setNow(clock()), 1000)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [locked])

  // Signed in: let the gate route them.
  if (status !== 'signed_out' && status !== 'loading') return <Redirect href={homeFor(status, profile) as never} />

  const continueWithPhone = async () => {
    if (!e164) { setError('Enter a valid Nigerian mobile number, like 0803 123 4567.'); return }
    setBusy(true); setError(null)
    try {
      const exists = await phoneRegistered(e164)
      setPin('')
      setStep(exists ? 'enter' : 'create')
    } catch (e) {
      setError(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  const onPinComplete = async (value: string) => {
    setError(null)
    if (step === 'create') {
      const problem = pinProblem(value)
      if (problem) { setError(problem); setPin(''); return }
      setFirstPin(value); setPin(''); setStep('confirm')
      return
    }
    if (step === 'confirm') {
      if (value !== firstPin) {
        setError("The PINs didn't match. Create your PIN again.")
        setPin(''); setFirstPin(''); setStep('create')
        return
      }
      setBusy(true)
      try {
        await signUp(e164!, value) // session change routes to setup
      } catch (e) {
        setError(friendlyError(e)); setPin('')
      } finally {
        setBusy(false)
      }
      return
    }
    // enter
    setBusy(true)
    try {
      await signIn(e164!, value)
      setFailures(0)
    } catch (e) {
      const msg = friendlyError(e)
      const n = failures + 1
      setFailures(n)
      setPin('')
      if (msg === 'Wrong PIN. Try again.' && n >= LOCK_AFTER) {
        const t = clock()
        setLockedUntil(t + LOCK_SECONDS * 1000); setNow(t)
        setError(`Too many wrong PINs. Wait ${LOCK_SECONDS} seconds.`)
      } else {
        setError(msg === 'Wrong PIN. Try again.' ? `Wrong PIN. ${LOCK_AFTER - n} tries left before a short lock.` : msg)
      }
    } finally {
      setBusy(false)
    }
  }

  const back = () => { setStep('phone'); setPin(''); setFirstPin(''); setError(null) }

  if (step === 'phone') {
    return (
      <Screen footer={<Button title="Continue" onPress={continueWithPhone} loading={busy} disabled={!e164} testID="continue" />}>
        <View style={{ marginTop: spacing.xl }}>
          <Text style={{ fontSize: 34, fontWeight: '800', color: colors.primary, marginBottom: spacing.sm }}>UrbanFix</Text>
          <Title sub="Verified technicians. Your money is held until your device is fixed.">Get your device fixed</Title>
        </View>
        <Field
          label="Phone number"
          placeholder="0803 123 4567"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          value={phone}
          onChangeText={(t) => { setPhone(t.replace(/[^0-9+ ]/g, '').slice(0, 17)); setError(null) }}
          onSubmitEditing={continueWithPhone}
          maxLength={17}
          autoFocus
          error={error}
          testID="phone"
        />
        <Small>We use your number to sign you in. It's only shared with your technician after you pay.</Small>
      </Screen>
    )
  }

  const titles: Record<Exclude<Step, 'phone'>, [string, string]> = {
    enter: ['Enter your PIN', `Welcome back, ${displayPhone(e164)}`],
    create: ['Create a 6-digit PIN', `You'll use it to sign in with ${displayPhone(e164)}`],
    confirm: ['Enter the PIN again', 'Just to be sure'],
  }
  const [title, sub] = titles[step]

  return (
    <Screen>
      <Title sub={sub}>{title}</Title>
      {error ? <Banner text={error} tone="bad" /> : null}
      <PinPad value={pin} onChange={(v) => { setPin(v); if (error && !locked) setError(null) }} onComplete={onPinComplete} busy={busy} disabled={locked} />
      {locked ? <P center muted style={{ marginTop: spacing.md }}>Try again in {Math.ceil((lockedUntil - now) / 1000)}s</P> : null}
      <View style={{ marginTop: spacing.xl }}>
        <Button title="Use a different number" kind="ghost" onPress={back} />
        {step === 'enter' ? (
          <Button title="Forgot PIN?" kind="ghost" onPress={() => forgotPin(e164!)} />
        ) : null}
      </View>
    </Screen>
  )
}
