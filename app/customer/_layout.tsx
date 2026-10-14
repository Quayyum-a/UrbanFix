import React from 'react'
import { TabsLayout } from '@/components/TabsLayout'
import { useRoleGuard } from '@/lib/useRole'

export default function CustomerLayout() {
  const guard = useRoleGuard('customer')
  if (guard) return guard
  return (
    <TabsLayout tabs={[
      { name: 'index', title: 'Home', icon: 'home-outline' },
      { name: 'repairs', title: 'My repairs', icon: 'construct-outline' },
      { name: 'account', title: 'Account', icon: 'person-outline' },
    ]} />
  )
}
