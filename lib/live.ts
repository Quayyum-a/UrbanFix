// One shared, always-fresh copy of "my repairs" and unread chats.
// Every tab reads from here, so switching tabs is instant (no blank screen
// while it reloads), and one background refresh drives the red dots,
// vibration and pop-up notes for the whole app.
import { create } from 'zustand'
import { buzz } from './buzz'
import { friendlyError, markMessagesRead, myJobs, myUnread } from './api'
import { diffJobs, type LiveEvent } from './liveEvents'
import { useSession } from './session'
import type { JobStatus, JobSummary, Role } from './types'

interface LiveState {
  role: Role | null
  jobs: JobSummary[] | null
  unread: Record<string, number>
  error: string | null
  refreshing: boolean
  toast: LiveEvent | null
  /** Last status we told the person about, per repair. Null until the first load. */
  known: Record<string, JobStatus> | null
  unreadKnown: Record<string, number> | null
  inFlight: Promise<void> | null
  setRole: (role: Role | null) => void
  load: (manual?: boolean) => Promise<void>
  /** The person just changed this repair themselves: don't buzz them about it. */
  noteStatus: (jobId: string, status: JobStatus) => void
  markRead: (jobId: string, lastId?: number | null) => void
  showToast: (e: LiveEvent) => void
  dismissToast: () => void
  reset: () => void
}

const EMPTY = { jobs: null, unread: {}, error: null, refreshing: false, toast: null, known: null, unreadKnown: null, inFlight: null }

export const useLive = create<LiveState>((set, get) => ({
  role: null,
  ...EMPTY,

  setRole: (role) => {
    if (role !== get().role) set({ role, ...EMPTY })
  },

  load: (manual = false) => {
    const running = get().inFlight
    if (running) {
      if (manual) set({ refreshing: true })
      return running.finally(() => { if (manual) set({ refreshing: false }) })
    }
    let role = get().role
    if (!role) {
      // A screen asked before the app-wide refresher started: use the signed-in role.
      const s = useSession.getState()
      if (s.status !== 'ready' || !s.profile) return Promise.resolve()
      role = s.profile.role
      set({ role })
    }
    if (manual) set({ refreshing: true })
    const p = (async () => {
      try {
        const [jobs, unreadRows] = await Promise.all([
          role === 'admin' ? Promise.resolve([] as JobSummary[]) : myJobs(),
          // Older databases without migration 006: no dots, everything else works.
          myUnread().catch(() => null),
        ])
        if (get().role !== role) return // signed out or switched account meanwhile
        const unread: Record<string, number> = {}
        for (const r of unreadRows ?? []) unread[r.job_id] = r.unread
        const events = diffJobs(role, get().known, jobs, get().unreadKnown, unread)
        const known: Record<string, JobStatus> = {}
        for (const j of jobs) known[j.id] = j.status
        set({ jobs, unread, known, unreadKnown: unread, error: null })
        if (events.length) {
          buzz(events[0]!.kind)
          set({ toast: events[0]! })
        }
      } catch (e) {
        set({ error: friendlyError(e) })
      } finally {
        set({ inFlight: null, refreshing: false })
      }
    })()
    set({ inFlight: p })
    return p
  },

  noteStatus: (jobId, status) => {
    const { known, jobs } = get()
    set({
      known: known ? { ...known, [jobId]: status } : known,
      jobs: jobs ? jobs.map((j) => (j.id === jobId && j.status !== status ? { ...j, status } : j)) : jobs,
    })
  },

  markRead: (jobId, lastId) => {
    const { unread, unreadKnown } = get()
    if (unread[jobId]) {
      const rest = { ...unread }
      delete rest[jobId]
      set({ unread: rest, unreadKnown: unreadKnown ? { ...unreadKnown, [jobId]: 0 } : unreadKnown })
    }
    markMessagesRead(jobId, lastId).catch(() => {})
  },

  showToast: (toast) => set({ toast }),
  dismissToast: () => set({ toast: null }),
  reset: () => set({ role: null, ...EMPTY }),
}))

/** How many repairs have chat messages you haven't read. */
export const unreadChats = (unread: Record<string, number>, jobIds?: string[]) =>
  Object.entries(unread).filter(([id, n]) => n > 0 && (!jobIds || jobIds.includes(id))).length
