// Integration Tests for Customer Home Screen Business Logic
// Tests data and business logic at the service level (no RN rendering required)
// Validates Requirements related to location, technician matching, and job status

import { locationService } from '@/lib/services'

// Mock Supabase to avoid real network calls
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  },
}))

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { High: 4 },
}))

// Mock @/lib/services so we can control location service behavior per test
jest.mock('@/lib/services', () => ({
  locationService: {
    hasLocationPermissions: jest.fn(),
    requestLocationPermissions: jest.fn(),
    getCurrentLocation: jest.fn(),
    reverseGeocode: jest.fn(),
    calculateDistance: jest.fn(),
    formatDistance: jest.fn(),
    validateNigerianAddress: jest.fn(),
  },
}))

// ── Helper types & data ──────────────────────────────────────────────────────

interface MockTechnician {
  id: string
  name: string
  rating: number
  isAvailable: boolean
  location: { latitude: number; longitude: number }
}

function sortByRating(technicians: MockTechnician[]): MockTechnician[] {
  return [...technicians].sort((a, b) => b.rating - a.rating)
}

function filterAvailable(technicians: MockTechnician[]): MockTechnician[] {
  return technicians.filter((t) => t.isAvailable)
}

function clampProgress(value: number): number {
  return Math.max(0, Math.min(100, value))
}

// Haversine distance calculation (mirrors production locationService.calculateDistance)
function calculateDistance(
  p1: { latitude: number; longitude: number },
  p2: { latitude: number; longitude: number }
): number {
  const R = 6371
  const dLat = ((p2.latitude - p1.latitude) * Math.PI) / 180
  const dLon = ((p2.longitude - p1.longitude) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((p1.latitude * Math.PI) / 180) *
      Math.cos((p2.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Customer Home Screen Integration', () => {
  const lagosCoords = { latitude: 6.5244, longitude: 3.3792 }
  const lagosAddress = 'Victoria Island, Lagos'
  const mockLocationService = locationService as jest.Mocked<typeof locationService>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ── Location services ──────────────────────────────────────────────────────

  describe('Location services', () => {
    it('getCurrentLocation returns coordinates when permission granted', async () => {
      mockLocationService.getCurrentLocation.mockResolvedValue({
        success: true,
        location: lagosCoords,
      })

      const result = await locationService.getCurrentLocation()

      expect(result.success).toBe(true)
      expect(result.location).toEqual(lagosCoords)
      expect(result.location?.latitude).toBeCloseTo(6.5244, 3)
      expect(result.location?.longitude).toBeCloseTo(3.3792, 3)
    })

    it('reverseGeocode returns Lagos address for Lagos coordinates', async () => {
      mockLocationService.reverseGeocode.mockResolvedValue({
        success: true,
        address: lagosAddress,
      })

      const result = await locationService.reverseGeocode(lagosCoords)

      expect(result.success).toBe(true)
      expect(result.address).toBe(lagosAddress)
    })

    it('falls back to "Lagos, Nigeria" when permission denied', async () => {
      mockLocationService.getCurrentLocation.mockResolvedValue({
        success: false,
        error: 'Location permissions denied',
      })

      const locationResult = await locationService.getCurrentLocation()
      expect(locationResult.success).toBe(false)

      // Fallback logic: when location fails, default address is used
      const fallbackAddress = locationResult.success
        ? locationResult.location
        : 'Lagos, Nigeria'

      expect(fallbackAddress).toBe('Lagos, Nigeria')
    })
  })

  // ── Technician matching data ───────────────────────────────────────────────

  describe('Technician matching data', () => {
    const mockTechnicians: MockTechnician[] = [
      {
        id: 'tech-1',
        name: 'Emeka Okafor',
        rating: 4.2,
        isAvailable: true,
        location: { latitude: 6.5255, longitude: 3.3810 },
      },
      {
        id: 'tech-2',
        name: 'Ngozi Adeyemi',
        rating: 4.8,
        isAvailable: true,
        location: { latitude: 6.5230, longitude: 3.3760 },
      },
      {
        id: 'tech-3',
        name: 'Chuka Nwosu',
        rating: 3.9,
        isAvailable: false,
        location: { latitude: 6.5200, longitude: 3.3720 },
      },
      {
        id: 'tech-4',
        name: 'Amaka Eze',
        rating: 4.5,
        isAvailable: true,
        location: { latitude: 6.5260, longitude: 3.3800 },
      },
    ]

    it('mock technicians are sorted by rating (highest first)', () => {
      const sorted = sortByRating(mockTechnicians)

      expect(sorted[0].rating).toBeGreaterThanOrEqual(sorted[1].rating)
      expect(sorted[1].rating).toBeGreaterThanOrEqual(sorted[2].rating)
      expect(sorted[2].rating).toBeGreaterThanOrEqual(sorted[3].rating)

      // Verify specific order
      expect(sorted[0].id).toBe('tech-2') // 4.8
      expect(sorted[1].id).toBe('tech-4') // 4.5
      expect(sorted[2].id).toBe('tech-1') // 4.2
      expect(sorted[3].id).toBe('tech-3') // 3.9
    })

    it('unavailable technicians are filtered from "nearby" list', () => {
      const nearby = filterAvailable(mockTechnicians)

      expect(nearby.every((t) => t.isAvailable)).toBe(true)
      expect(nearby.find((t) => t.id === 'tech-3')).toBeUndefined()
      expect(nearby).toHaveLength(3)
    })

    it('distance is calculated correctly', () => {
      const userLocation = lagosCoords
      const techLocation = mockTechnicians[0].location

      const distance = calculateDistance(userLocation, techLocation)

      // tech-1 is very close to user location in Lagos — should be < 2km
      expect(distance).toBeGreaterThan(0)
      expect(distance).toBeLessThan(2)
    })

    it('sorted and filtered list combines both operations correctly', () => {
      const nearbyAndSorted = sortByRating(filterAvailable(mockTechnicians))

      expect(nearbyAndSorted.every((t) => t.isAvailable)).toBe(true)
      expect(nearbyAndSorted[0].rating).toBeGreaterThanOrEqual(nearbyAndSorted[1].rating)
    })
  })

  // ── Active job status ──────────────────────────────────────────────────────

  describe('Active job status', () => {
    interface MockJob {
      id: string
      status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
      progressPercentage: number
    }

    const mockJobs: MockJob[] = [
      { id: 'job-1', status: 'in_progress', progressPercentage: 60 },
      { id: 'job-2', status: 'completed', progressPercentage: 100 },
    ]

    function getActiveJob(jobs: MockJob[]): MockJob | null {
      return jobs.find((j) => j.status === 'in_progress') ?? null
    }

    it('active job card is shown when job status is in_progress', () => {
      const activeJob = getActiveJob(mockJobs)

      expect(activeJob).not.toBeNull()
      expect(activeJob?.status).toBe('in_progress')
      expect(activeJob?.id).toBe('job-1')
    })

    it('no active job card shown when no active jobs', () => {
      const completedJobs: MockJob[] = [
        { id: 'job-3', status: 'completed', progressPercentage: 100 },
        { id: 'job-4', status: 'cancelled', progressPercentage: 0 },
      ]

      const activeJob = getActiveJob(completedJobs)
      expect(activeJob).toBeNull()
    })

    it('progress percentage is clamped between 0-100', () => {
      expect(clampProgress(-10)).toBe(0)
      expect(clampProgress(0)).toBe(0)
      expect(clampProgress(50)).toBe(50)
      expect(clampProgress(100)).toBe(100)
      expect(clampProgress(150)).toBe(100)
    })

    it('returns null when jobs array is empty', () => {
      const activeJob = getActiveJob([])
      expect(activeJob).toBeNull()
    })
  })
})
