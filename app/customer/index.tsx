// Home: one tap on a device starts a booking. Repairs that need you are on top.
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import React, { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { JobItem } from '@/components/JobItem'
import { LocationPicker } from '@/components/LocationPicker'
import { Button, ErrorText, Heading, Screen, Skeleton, Small, tap, Title } from '@/components/ui'
import { DEVICES } from '@/constants/catalog'
import { colors, font, radius, shadow, spacing } from '@/constants/theme'
import { needsMe } from '@/lib/jobFlow'
import { friendlyError, updateMyProfile } from '@/lib/api'
import { useSession } from '@/lib/session'
import { useMyJobs } from '@/lib/useJobs'

const ACTIVE = ['requested', 'accepted', 'quoted', 'payment_submitted', 'paid', 'in_repair', 'awaiting_confirmation', 'warranty', 'disputed']
export const LOCATION_ASKED_KEY = 'uf.locationAsked'

export default function CustomerHome() {
  const profile = useSession((s) => s.profile)
  const setProfile = useSession((s) => s.setProfile)
  const [askLocation, setAskLocation] = useState(false)
  const [locError, setLocError] = useState<string | null>(null)

  // Ask for location once, only if we don't know the area yet.
  useEffect(() => {
    if (profile?.area) return
    let live = true
    AsyncStorage.getItem(LOCATION_ASKED_KEY).then((v) => { if (live && !v) setAskLocation(true) }).catch(() => {})
    return () => { live = false }
  }, [profile?.area])

  const stopAsking = () => { setAskLocation(false); AsyncStorage.setItem(LOCATION_ASKED_KEY, '1').catch(() => {}) }
  const saveLocation = async (area: string, address: string | null) => {
    if (!profile) return
    try {
      setProfile(await updateMyProfile(profile.full_name, area, profile.address ?? address))
      stopAsking()
    } catch (e) {
      setLocError(friendlyError(e))
    }
  }
  const { jobs, error, refreshing, reload } = useMyJobs()
  const active = (jobs ?? []).filter((j) => ACTIVE.includes(j.status))
    .sort((a, b) => Number(needsMe('customer', b.status)) - Number(needsMe('customer', a.status)))
  const first = profile?.full_name.split(' ')[0] ?? ''

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <Title sub="Pick your device to see verified technicians and prices.">Hi {first}, what needs fixing?</Title>
      {askLocation && !profile?.area ? (
        <>
          <LocationPicker area={null} onChange={(a, addr) => void saveLocation(a, addr)} title="Find technicians near you"
            why="Share your location once. We use it to show nearby technicians and fill in your address for home visits." />
          <Button title="Not now" kind="ghost" onPress={stopAsking} testID="skip-location" />
          <ErrorText error={locError} />
        </>
      ) : null}
      <View style={styles.grid}>
        {DEVICES.map((d) => (
          <Pressable
            key={d.type}
            testID={`device-${d.type}`}
            accessibilityRole="button"
            accessibilityLabel={`Fix my ${d.label}`}
            onPress={() => { tap(); router.push({ pathname: '/book', params: { device: d.type } }) }}
            style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name={d.icon as never} size={34} color={colors.primary} />
            <Text style={[font.bodyStrong, { marginTop: spacing.sm }]}>{d.label}</Text>
          </Pressable>
        ))}
      </View>

      <ErrorText error={error} />
      {jobs === null && !error ? <><Heading>Your repairs</Heading><Skeleton rows={1} /></> : null}
      {active.length ? (
        <>
          <Heading>Your repairs</Heading>
          {active.map((j) => <JobItem key={j.id} job={j} role="customer" />)}
        </>
      ) : null}

      <Heading>How UrbanFix protects you</Heading>
      {[
        ['shield-checkmark-outline', 'Every technician is ID-verified before they can take jobs.'],
        ['lock-closed-outline', 'You pay UrbanFix, not the technician. We hold the money until you confirm the fix.'],
        ['camera-outline', "Your device's IMEI and photos are recorded when it's received, so parts can't be swapped."],
      ].map(([icon, text]) => (
        <View key={text} style={styles.promise}>
          <Ionicons name={icon as never} size={22} color={colors.success} />
          <Small style={{ flex: 1, color: colors.text }}>{text}</Small>
        </View>
      ))}
    </Screen>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md },
  tile: { width: '48%', aspectRatio: 1.35, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', ...shadow },
  promise: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', marginBottom: spacing.md },
})
