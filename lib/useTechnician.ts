import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { friendlyError, getMyTechnician } from './api'
import type { Service, Technician, TechnicianPrivate } from './types'

export function useMyTechnician() {
  const [data, setData] = useState<{ tech: Technician; priv: TechnicianPrivate | null; services: Service[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    try {
      setData(await getMyTechnician())
      setError(null)
    } catch (e) {
      setError(friendlyError(e))
    } finally {
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { void load() }, [load]))
  return { data, error, refreshing, reload: (manual = false) => load(manual) }
}

/** Which onboarding steps are complete. */
export function setupProgress(d: { tech: Technician; priv: TechnicianPrivate | null; services: Service[] } | null) {
  const shop = !!(d?.tech.shop_name && d.tech.shop_address && d.tech.area)
  const services = !!d?.services.some((s) => s.is_active)
  const bank = !!(d?.priv?.bank_name && d.priv.account_number && d.priv.account_name)
  const identity = !!(d?.priv?.nin && d.priv.id_document_path)
  return { shop, services, bank, identity, complete: shop && services && bank && identity }
}
