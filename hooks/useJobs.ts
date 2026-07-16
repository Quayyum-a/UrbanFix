import { useState, useCallback, useEffect } from 'react'
import { jobsService, type Job, type JobStatus } from '@/lib/services/jobs-service'

interface UseJobsOptions {
  technicianId?: string
  autoFetch?: boolean
}

interface UseJobsReturn {
  // Available Jobs
  availableJobs: Job[]
  availableJobsLoading: boolean
  availableJobsError: string | null
  fetchAvailableJobs: (categoryId?: string) => Promise<void>

  // Technician's Jobs
  technicianJobs: Job[]
  technicianJobsLoading: boolean
  technicianJobsError: string | null
  fetchTechnicianJobs: (status?: JobStatus) => Promise<void>

  // Job Details
  currentJob: Job | null
  jobDetailsLoading: boolean
  jobDetailsError: string | null
  fetchJobDetails: (jobId: string) => Promise<void>

  // Job Actions
  acceptJob: (jobId: string) => Promise<boolean>
  declineJob: (jobId: string, reason?: string) => Promise<boolean>
  updateJobStatus: (jobId: string, status: JobStatus, notes?: string) => Promise<boolean>
  uploadPhotos: (jobId: string, photos: string[]) => Promise<boolean>

  // Statistics
  jobStats: any | null
  statsLoading: boolean
  fetchJobStats: () => Promise<void>
}

export function useJobs(options: UseJobsOptions = {}): UseJobsReturn {
  const { technicianId, autoFetch = true } = options

  // Available Jobs
  const [availableJobs, setAvailableJobs] = useState<Job[]>([])
  const [availableJobsLoading, setAvailableJobsLoading] = useState(false)
  const [availableJobsError, setAvailableJobsError] = useState<string | null>(null)

  // Technician's Jobs
  const [technicianJobs, setTechnicianJobs] = useState<Job[]>([])
  const [technicianJobsLoading, setTechnicianJobsLoading] = useState(false)
  const [technicianJobsError, setTechnicianJobsError] = useState<string | null>(null)

  // Job Details
  const [currentJob, setCurrentJob] = useState<Job | null>(null)
  const [jobDetailsLoading, setJobDetailsLoading] = useState(false)
  const [jobDetailsError, setJobDetailsError] = useState<string | null>(null)

  // Statistics
  const [jobStats, setJobStats] = useState<any>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // Fetch available jobs
  const fetchAvailableJobs = useCallback(async (categoryId?: string) => {
    setAvailableJobsLoading(true)
    setAvailableJobsError(null)
    try {
      const result = await jobsService.getAvailableJobs(technicianId || '', categoryId)
      if (result.success) {
        setAvailableJobs(result.data || [])
      } else {
        setAvailableJobsError(result.error || 'Failed to load jobs')
      }
    } catch (error) {
      setAvailableJobsError('Network error')
    } finally {
      setAvailableJobsLoading(false)
    }
  }, [technicianId])

  // Fetch technician's jobs
  const fetchTechnicianJobs = useCallback(async (status?: JobStatus) => {
    setTechnicianJobsLoading(true)
    setTechnicianJobsError(null)
    try {
      const result = await jobsService.getTechnicianJobs(technicianId || '', status)
      if (result.success) {
        setTechnicianJobs(result.data || [])
      } else {
        setTechnicianJobsError(result.error || 'Failed to load jobs')
      }
    } catch (error) {
      setTechnicianJobsError('Network error')
    } finally {
      setTechnicianJobsLoading(false)
    }
  }, [technicianId])

  // Fetch job details
  const fetchJobDetails = useCallback(async (jobId: string) => {
    setJobDetailsLoading(true)
    setJobDetailsError(null)
    try {
      const result = await jobsService.getJobDetails(jobId)
      if (result.success) {
        setCurrentJob(result.data)
      } else {
        setJobDetailsError(result.error || 'Failed to load job details')
      }
    } catch (error) {
      setJobDetailsError('Network error')
    } finally {
      setJobDetailsLoading(false)
    }
  }, [])

  // Accept a job
  const acceptJob = useCallback(async (jobId: string): Promise<boolean> => {
    try {
      const result = await jobsService.acceptJob(jobId, technicianId || '')
      return result.success
    } catch (error) {
      return false
    }
  }, [technicianId])

  // Decline a job
  const declineJob = useCallback(async (jobId: string, reason?: string): Promise<boolean> => {
    try {
      const result = await jobsService.declineJob(jobId, reason)
      return result.success
    } catch (error) {
      return false
    }
  }, [])

  // Update job status
  const updateJobStatus = useCallback(async (
    jobId: string,
    status: JobStatus,
    notes?: string
  ): Promise<boolean> => {
    try {
      const result = await jobsService.updateJobStatus(jobId, status, notes)
      if (result.success) {
        // Update local state
        setTechnicianJobs(jobs =>
          jobs.map(j => j.id === jobId ? { ...j, status } : j)
        )
        if (currentJob?.id === jobId) {
          setCurrentJob({ ...currentJob, status })
        }
        return true
      }
      return false
    } catch (error) {
      return false
    }
  }, [currentJob])

  // Upload photos
  const uploadPhotos = useCallback(async (
    jobId: string,
    photos: string[]
  ): Promise<boolean> => {
    try {
      const result = await jobsService.uploadJobPhotos(jobId, photos)
      if (result.success && currentJob?.id === jobId) {
        setCurrentJob({
          ...currentJob,
          photo_urls: result.data?.photo_urls || []
        })
        return true
      }
      return false
    } catch (error) {
      return false
    }
  }, [currentJob])

  // Fetch job stats
  const fetchJobStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const result = await jobsService.getJobStatistics(technicianId || '')
      if (result.success) {
        setJobStats(result.data)
      }
    } catch (error) {
      console.error('Failed to load job stats')
    } finally {
      setStatsLoading(false)
    }
  }, [technicianId])

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && technicianId) {
      fetchAvailableJobs()
      fetchTechnicianJobs()
      fetchJobStats()
    }
  }, [autoFetch, technicianId, fetchAvailableJobs, fetchTechnicianJobs, fetchJobStats])

  return {
    availableJobs,
    availableJobsLoading,
    availableJobsError,
    fetchAvailableJobs,

    technicianJobs,
    technicianJobsLoading,
    technicianJobsError,
    fetchTechnicianJobs,

    currentJob,
    jobDetailsLoading,
    jobDetailsError,
    fetchJobDetails,

    acceptJob,
    declineJob,
    updateJobStatus,
    uploadPhotos,

    jobStats,
    statsLoading,
    fetchJobStats
  }
}
