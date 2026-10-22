import React from 'react'
import { TabsLayout } from '@/components/TabsLayout'
import { unreadChats, useLive } from '@/lib/live'
import { useRoleGuard } from '@/lib/useRole'

export default function TechnicianLayout() {
  const guard = useRoleGuard('technician')
  const unread = useLive((s) => unreadChats(s.unread))
  if (guard) return guard
  return (
    <TabsLayout tabs={[
      { name: 'index', title: 'Jobs', icon: 'briefcase-outline', badge: unread },
      { name: 'earnings', title: 'Earnings', icon: 'wallet-outline' },
      { name: 'account', title: 'Account', icon: 'person-outline' },
    ]} />
  )
}
