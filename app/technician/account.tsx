import { router } from 'expo-router'
import React from 'react'
import { AccountScreen } from '@/components/AccountScreen'
import { Button } from '@/components/ui'

export default function TechnicianAccount() {
  return (
    <AccountScreen showAddress={false}>
      <Button title="Shop, prices, bank and ID" kind="secondary" icon="storefront-outline" onPress={() => router.push('/technician-setup')} />
    </AccountScreen>
  )
}
