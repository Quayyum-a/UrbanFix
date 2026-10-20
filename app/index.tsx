import { Redirect } from 'expo-router'
import React from 'react'
import { Button, Empty, Loading, P, Screen, Title } from '@/components/ui'
import { homeFor, useSession } from '@/lib/session'
import { signOut } from '@/lib/api'

export default function Gate() {
  const { status, profile, error, refresh } = useSession()

  if (status === 'loading') return <Screen scroll={false}><Loading /></Screen>

  if (status === 'not_configured') {
    return (
      <Screen>
        <Title sub="The app can't reach your database yet.">Almost there</Title>
        <P>Create a file called .env in the project folder with:</P>
        <P strong style={{ marginVertical: 12 }}>EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co{'\n'}EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key</P>
        <P muted>Find both in Supabase → Project Settings → API. Then stop and restart "npx expo start".</P>
      </Screen>
    )
  }

  if (status === 'error') {
    return (
      <Screen scroll={false}>
        <Empty
          icon="cloud-offline-outline"
          title="Couldn't load your account"
          text={error?.includes('fetch') ? 'Check your internet connection.' : 'Please try again.'}
          action={<>
            <Button title="Try again" onPress={() => void refresh()} />
            <Button title="Sign out" kind="ghost" onPress={() => void signOut()} />
          </>}
        />
      </Screen>
    )
  }

  return <Redirect href={homeFor(status, profile) as never} />
}
