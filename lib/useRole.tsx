import { Redirect } from 'expo-router'
import React from 'react'
import { Loading, Screen } from '@/components/ui'
import { homeFor, useSession } from './session'
import type { Role } from './types'

/** Returns a redirect element if the signed-in person isn't `role`, else null. */
export function useRoleGuard(role: Role): React.ReactElement | null {
  const { status, profile } = useSession()
  if (status === 'loading') return <Screen scroll={false}><Loading /></Screen>
  if (status !== 'ready' || profile?.role !== role) return <Redirect href={homeFor(status, profile) as never} />
  return null
}
