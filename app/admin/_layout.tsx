import React from 'react'
import { TabsLayout } from '@/components/TabsLayout'
import { useRoleGuard } from '@/lib/useRole'

export default function AdminLayout() {
  const guard = useRoleGuard('admin')
  if (guard) return guard
  return (
    <TabsLayout tabs={[
      { name: 'index', title: 'To do', icon: 'checkbox-outline' },
      { name: 'account', title: 'Account', icon: 'person-outline' },
    ]} />
  )
}
