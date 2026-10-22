import React from 'react'
import { TabsLayout } from '@/components/TabsLayout'
import { unreadChats, useLive } from '@/lib/live'
import { useRoleGuard } from '@/lib/useRole'

export default function CustomerLayout() {
  const guard = useRoleGuard('customer')
  const unread = useLive((s) => unreadChats(s.unread))
  if (guard) return guard
  return (
    <TabsLayout tabs={[
      { name: 'index', title: 'Home', icon: 'home-outline' },
      { name: 'repairs', title: 'My repairs', icon: 'construct-outline', badge: unread },
      { name: 'account', title: 'Account', icon: 'person-outline' },
    ]} />
  )
}
