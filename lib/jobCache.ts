// Last loaded details of each repair, so reopening one is instant while it refreshes.
import type { JobDetails } from './types'

const cache = new Map<string, JobDetails>()
const MAX = 30

export const cachedJob = (id: string | undefined) => (id ? cache.get(id) ?? null : null)

export function rememberJob(id: string, d: JobDetails) {
  cache.delete(id)
  cache.set(id, d)
  if (cache.size > MAX) cache.delete(cache.keys().next().value!)
}

export const forgetJobs = () => cache.clear()
