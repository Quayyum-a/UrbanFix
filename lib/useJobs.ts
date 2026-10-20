import { useFocusEffect } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import { friendlyError, myJobs } from './api'
import type { JobSummary } from './types'

/** My jobs, refreshed whenever the screen gains focus and every `pollMs` while focused. */
export function useMyJobs(pollMs = 15000) {
  const [jobs, setJobs] = useState<JobSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const alive = useRef(true)

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    try {
      const data = await myJobs()
      if (alive.current) { setJobs(data); setError(null) }
    } catch (e) {
      if (alive.current) setError(friendlyError(e))
    } finally {
      if (alive.current) setRefreshing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => {
    alive.current = true
    void load()
    const t = setInterval(() => void load(), pollMs)
    return () => { alive.current = false; clearInterval(t) }
  }, [load, pollMs]))

  return { jobs, error, refreshing, reload: () => load(true) }
}
