import React from 'react'
import { TabsLayout } from '@/components/TabsLayout'
import { useRoleGuard } from '@/lib/useRole'

export default function TechnicianLayout() {
  const guard = useRoleGuard('technician')
  if (guard) return guard
  return (
    <TabsLayout tabs={[
      { name: 'index', title: 'Jobs', icon: 'briefcase-outline' },
      { name: 'earnings', title: 'Earnings', icon: 'wallet-outline' },
      { name: 'account', title: 'Account', icon: 'person-outline' },
    ]} />
  )
}
