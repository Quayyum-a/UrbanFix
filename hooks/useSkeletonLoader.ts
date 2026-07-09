/**
 * Convenience hook for managing skeleton loading state with a minimum display duration.
 *
 * Requirements: 8.8
 *
 * Prevents the "flash of skeleton" anti-pattern: when data loads faster than the
 * minimum display time, the skeleton remains visible until the minimum has elapsed.
 * This avoids jarring visual flickers for fast network responses.
 */

import { useState, useEffect, useRef } from 'react'

export interface UseSkeletonLoaderReturn {
  /** Whether the skeleton loader should currently be displayed */
  showSkeleton: boolean
}

/**
 * @param isLoading - Current loading state from the data fetching layer
 * @param minDisplayMs - Minimum time (ms) the skeleton is shown even if loading
 *   completes quickly. Defaults to 500ms to prevent content flash.
 */
export function useSkeletonLoader(
  isLoading: boolean,
  minDisplayMs = 500,
): UseSkeletonLoaderReturn {
  const [showSkeleton, setShowSkeleton] = useState(isLoading)
  const startTimeRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isLoading) {
      // Loading started — show skeleton and record start time
      startTimeRef.current = Date.now()
      setShowSkeleton(true)

      // Clear any pending hide timer from a previous cycle
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    } else {
      // Loading finished — calculate how much of minDisplayMs has elapsed
      const elapsed = startTimeRef.current !== null ? Date.now() - startTimeRef.current : minDisplayMs
      const remaining = Math.max(0, minDisplayMs - elapsed)

      if (remaining === 0) {
        setShowSkeleton(false)
      } else {
        timerRef.current = setTimeout(() => {
          setShowSkeleton(false)
          timerRef.current = null
        }, remaining)
      }
    }

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
    }
  }, [isLoading, minDisplayMs])

  return { showSkeleton }
}
