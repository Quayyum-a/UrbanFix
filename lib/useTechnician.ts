import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { friendlyError, getMyTechnician } from './api'
import type { Service, Technician, TechnicianPrivate } from './types'

type TechData = { tech: Technician; priv: TechnicianPrivate | null; services: Service[] }
// Last loaded copy, so screens open instantly and refresh quietly.
let last: TechData | null = null
export const forgetTechnician = () => { last = null }

export function useMyTechnician() {
  const [data, setData] = useState<TechData | null>(() => last)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    try {
      const d = await getMyTechnician()
      last = d
      setData(d)
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
