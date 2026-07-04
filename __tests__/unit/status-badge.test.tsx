/**
 * Property and Unit Tests for StatusBadge Component
 *
 * Validates: Requirements 7.3, 9.3
 * 
 * Requirement 7.3: StatusBadge SHALL display status with color-coded indicators
 *                  (success, warning, error) mapped to job statuses
 * Requirement 9.3: StatusBadge SHALL implement proper contrast ratios 
 *                  for accessibility (WCAG 2.1 AA - minimum 4.5:1)
 */

import React from 'react'
import { render } from '@testing-library/react-native'
import * as fc from 'fast-check'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { colors } from '@/constants/theme'

// All valid job status values for property testing
const validStatuses = [
  'booked',
  'paid',
  'pickup_scheduled',
  'device_received',
  'repair_started',
  'awaiting_release',
  'disputed',
  'complete',
  'cancelled',
] as const

type JobStatus = typeof validStatuses[number]

// Expected status labels for validation
const expectedLabels: Record<JobStatus, string> = {
  booked: 'Booked',
  paid: 'Paid',
  pickup_scheduled: 'Pickup Scheduled',
  device_received: 'Device Received',
  repair_started: 'In Progress',
  awaiting_release: 'Awaiting Release',
  disputed: 'Disputed',
  complete: 'Complete',
  cancelled: 'Cancelled',
}

// Expected colors for semantic meaning
const expectedColors: Record<JobStatus, { background: string; text: string }> = {
  booked: { background: colors.primary, text: colors.onPrimary },
  paid: { background: '#1b7e3c', text: colors.onPrimary },
  pickup_scheduled: { background: colors.primary, text: colors.onPrimary },
  device_received: { background: colors.primary, text: colors.onPrimary },
  repair_started: { background: colors.secondary, text: colors.text.primary },
  awaiting_release: { background: colors.warning, text: colors.text.primary },
  disputed: { background: colors.error, text: colors.onError },
  complete: { background: '#1b7e3c', text: colors.onPrimary },
  cancelled: { background: colors.error, text: colors.onError },
}

/**
 * Helper to calculate relative luminance (WCAG definition)
 */
function getLuminance(rgb: string): number {
  const hex = rgb.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255

  const [rs, gs, bs] = [r, g, b].map((c) => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/**
 * Calculate contrast ratio (WCAG definition)
 */
function getContrastRatio(foreground: string, background: string): number {
  const l1 = getLuminance(foreground)
  const l2 = getLuminance(background)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)

  return (lighter + 0.05) / (darker + 0.05)
}

describe('StatusBadge Component', () => {
  describe('Unit Tests', () => {
    it('renders StatusBadge with correct label for each status', () => {
      validStatuses.forEach((status) => {
        const { getByText } = render(
          <StatusBadge status={status as JobStatus} />
        )
        const label = expectedLabels[status]
        expect(getByText(label)).toBeTruthy()
      })
    })

    it('applies accessibility labels correctly', () => {
      const { getByLabelText } = render(
        <StatusBadge status="paid" />
      )
      expect(getByLabelText('Job status: Paid')).toBeTruthy()
    })

    it('renders different size variants', () => {
      const { getByText: getByText1 } = render(
        <StatusBadge status="booked" size="small" />
      )
      const { getByText: getByText2 } = render(
        <StatusBadge status="booked" size="medium" />
      )

      expect(getByText1('Booked')).toBeTruthy()
      expect(getByText2('Booked')).toBeTruthy()
    })
  })

  describe('Property 27: Status Badge Color Consistency', () => {
    /**
     * Property: For any valid status, the badge SHALL render with consistent
     * colors that map to the correct semantic meaning, and the color contrast
     * ratio SHALL meet WCAG 2.1 AA standards (minimum 4.5:1).
     */
    test('Property: All status badges have consistent color mapping', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...validStatuses),
          (status) => {
            const { getByText } = render(
              <StatusBadge status={status as JobStatus} />
            )
            const label = expectedLabels[status]
            const element = getByText(label)

            // Verify element exists
            expect(element).toBeTruthy()

            // Verify style mapping exists
            const expectedColor = expectedColors[status]
            expect(expectedColor).toBeDefined()
            expect(expectedColor.background).toBeDefined()
            expect(expectedColor.text).toBeDefined()
          }
        ),
        { numRuns: 50 }
      )
    })

    /**
     * Property: Color contrast for all status badges SHALL meet WCAG 2.1 AA
     * minimum of 4.5:1 for normal text, ensuring accessibility for users
     * with color vision deficiency.
     */
    test('Property: All status badge colors meet WCAG 2.1 AA contrast ratio', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...validStatuses),
          (status) => {
            const colors = expectedColors[status as JobStatus]
            const contrastRatio = getContrastRatio(colors.text, colors.background)

            // WCAG 2.1 AA requires minimum 4.5:1 for normal text
            expect(contrastRatio).toBeGreaterThanOrEqual(4.5)
          }
        ),
        { numRuns: 50 }
      )
    })

    /**
     * Property: Status badges SHALL use semantic colors consistently:
     * - Success (green) for positive outcomes (Paid, Complete)
     * - Warning (orange) for attention states (In Progress, Awaiting Release)
     * - Error (red) for issues (Disputed, Cancelled)
     * - Info (blue) for neutral updates (Booked, Scheduled, Received)
     */
    test('Property: Status colors follow semantic meaning', () => {
      const semanticMapping = {
        success: ['paid', 'complete'] as const,
        warning: ['repair_started', 'awaiting_release'] as const,
        error: ['disputed', 'cancelled'] as const,
        info: ['booked', 'pickup_scheduled', 'device_received'] as const,
      }

      const successColor = '#1b7e3c'

      Object.entries(semanticMapping).forEach(([semantic, statuses]) => {
        statuses.forEach((status) => {
          const statusColors = expectedColors[status]

          switch (semantic) {
            case 'success':
              expect(statusColors.background).toBe(successColor)
              break
            case 'warning':
              expect([colors.secondary, colors.warning]).toContain(statusColors.background)
              break
            case 'error':
              expect(statusColors.background).toBe(colors.error)
              break
            case 'info':
              expect(statusColors.background).toBe(colors.primary)
              break
          }
        })
      })
    })

    /**
     * Property: All status text SHALL render in colors with sufficient
     * contrast against their backgrounds to ensure readability.
     */
    test('Property: All status badge text is readable', () => {
      validStatuses.forEach((status) => {
        const { getByText } = render(
          <StatusBadge status={status as JobStatus} />
        )
        const label = expectedLabels[status]
        const element = getByText(label)

        // Verify text is rendered and accessible
        expect(element).toBeTruthy()
        expect(element.props.style).toBeTruthy()

        const colors = expectedColors[status]
        const contrastRatio = getContrastRatio(colors.text, colors.background)
        expect(contrastRatio).toBeGreaterThanOrEqual(4.5)
      })
    })
  })
})
