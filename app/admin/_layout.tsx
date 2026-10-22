import React from 'react'
import { TabsLayout } from '@/components/TabsLayout'
import { unreadChats, useLive } from '@/lib/live'
import { useRoleGuard } from '@/lib/useRole'

export default function AdminLayout() {
  const guard = useRoleGuard('admin')
  const unread = useLive((s) => unreadChats(s.unread))
  if (guard) return guard
  return (
    <TabsLayout tabs={[
      { name: 'index', title: 'To do', icon: 'checkbox-outline', badge: unread },
      { name: 'prices', title: 'Prices', icon: 'pricetags-outline' },
      { name: 'account', title: 'Account', icon: 'person-outline' },
    ]} />
  )
}
