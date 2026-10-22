import { useFocusEffect } from 'expo-router'
import { useCallback } from 'react'
import { useLive } from './live'

/**
 * My jobs from the shared live copy: shown instantly from the last refresh,
 * refreshed when the screen gains focus. The app-wide refresher (LiveUpdates)
 * keeps it fresh in between.
 */
export function useMyJobs() {
  const jobs = useLive((s) => s.jobs)
  const unread = useLive((s) => s.unread)
  const error = useLive((s) => s.error)
  const refreshing = useLive((s) => s.refreshing)
  const load = useLive((s) => s.load)

  useFocusEffect(useCallback(() => { void load() }, [load]))

  return { jobs, unread, error, refreshing, reload: () => load(true) }
}
