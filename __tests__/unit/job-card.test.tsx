/**
 * Property and Unit Tests for JobCard Component
 *
 * Validates: Requirements 7.1, 7.8
 * 
 * Requirement 7.1: JobCard SHALL display job information with device icon,
 *                  status, pricing, and repair details
 * Requirement 7.8: JobCard SHALL format prices in Nigerian Naira with proper
 *                  localization and support progress indicators for active repairs
 */

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import * as fc from 'fast-check'
import { JobCard } from '@/components/ui/JobCard'
import { DeviceType } from '@/constants/deviceTypes'

// Valid device types for property testing
const validDeviceTypes: DeviceType[] = ['smartphone', 'laptop', 'tablet', 'desktop', 'other']

// Valid job statuses
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

// Device icon map for validation
const deviceIcons: Record<DeviceType | string, string> = {
  smartphone: '📱',
  laptop: '💻',
  tablet: '📑',
  desktop: '🖥️',
  other: '⚙️',
}

// Arbitrary generators for property testing
const arbitraryDeviceType = fc.constantFrom(...validDeviceTypes)
const arbitraryStatus = fc.constantFrom(...validStatuses)
const arbitraryPrice = fc.integer({ min: 100, max: 5000000 }) // ₦1 to ₦50,000
const arbitraryPercentage = fc.integer({ min: 0, max: 100 })

describe('JobCard Component', () => {
  const mockProps = {
    id: 'job-123',
    deviceBrand: 'Apple',
    deviceModel: 'iPhone 14 Pro',
    repairCategory: 'Screen Replacement',
    status: 'repair_started' as const,
    totalPrice: 5000000, // ₦50,000
    createdAt: new Date().toISOString(),
    onPress: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Unit Tests', () => {
    it('renders device name and model', () => {
      const { getByText } = render(<JobCard {...mockProps} />)
      expect(getByText('Apple iPhone 14 Pro')).toBeTruthy()
    })

    it('renders repair category', () => {
      const { getByText } = render(<JobCard {...mockProps} />)
      expect(getByText('Screen Replacement')).toBeTruthy()
    })

    it('displays price in Nigerian Naira format', () => {
      const { getByText } = render(<JobCard {...mockProps} />)
      // ₦50,000
      expect(getByText('₦50,000')).toBeTruthy()
    })

    it('renders status badge', () => {
      const { getByText } = render(<JobCard {...mockProps} />)
      expect(getByText('In Progress')).toBeTruthy()
    })

    it('displays device icon for each device type', () => {
      validDeviceTypes.forEach((deviceType) => {
        const { getByText } = render(
          <JobCard {...mockProps} deviceType={deviceType} />
        )
        const icon = deviceIcons[deviceType]
        expect(getByText(icon)).toBeTruthy()
      })
    })

    it('shows progress indicator when status is repair_started and progress is provided', () => {
      const { getByText } = render(
        <JobCard {...mockProps} progressPercentage={50} />
      )
      expect(getByText('50% complete')).toBeTruthy()
    })

    it('does not show progress indicator when status is not repair_started', () => {
      const { queryByText } = render(
        <JobCard {...mockProps} status="paid" progressPercentage={50} />
      )
      expect(queryByText(/% complete/)).toBeNull()
    })

    it('calls onPress when card is pressed', () => {
      const onPress = jest.fn()
      const { getByRole } = render(
        <JobCard {...mockProps} onPress={onPress} />
      )
      fireEvent.press(getByRole('button'))
      expect(onPress).toHaveBeenCalledTimes(1)
    })

    it('provides accessibility information', () => {
      const { getByLabelText } = render(<JobCard {...mockProps} />)
      const card = getByLabelText(/Repair job/)
      expect(card).toBeTruthy()
      expect(card.props.accessibilityRole).toBe('button')
    })
  })

  describe('Property 25: Job Card Data Display', () => {
    /**
     * Property: For any valid job data, the JobCard SHALL render all required
     * information consistently: device icon, brand/model, repair category, status,
     * and price in Nigerian Naira format.
     */
    test('Property: All job card data displays consistently', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            arbitraryDeviceType,
            arbitraryStatus,
            arbitraryPrice,
            fc.string({ minLength: 1, maxLength: 20 }),
            fc.string({ minLength: 1, maxLength: 30 })
          ),
          ([deviceType, status, price, brand, model]) => {
            const props = {
              ...mockProps,
              deviceType,
              status: status as any,
              totalPrice: price,
              deviceBrand: brand,
              deviceModel: model,
            }

            const { getByText, getByLabelText } = render(<JobCard {...props} />)

            // Device icon should render
            const icon = deviceIcons[deviceType]
            expect(getByText(icon)).toBeTruthy()

            // Brand and model should display
            const deviceName = `${brand} ${model}`
            expect(getByText(deviceName)).toBeTruthy()

            // Price should display in Naira format
            const priceInNaira = (price / 100).toLocaleString('en-NG')
            expect(getByText(`₦${priceInNaira}`)).toBeTruthy()

            // Card should be accessible
            const card = getByLabelText(/Repair job/)
            expect(card).toBeTruthy()
          }
        ),
        { numRuns: 50 }
      )
    })

    /**
     * Property: For any price value in kobo, the JobCard SHALL format it
     * correctly in Nigerian Naira with proper thousand separators and decimal
     * representation.
     */
    test('Property: Price formatting is consistent and correct', () => {
      fc.assert(
        fc.property(arbitraryPrice, (priceInKobo) => {
          const { getByText } = render(
            <JobCard {...mockProps} totalPrice={priceInKobo} />
          )

          const priceInNaira = priceInKobo / 100
          const expectedFormatted = (priceInNaira).toLocaleString('en-NG')

          expect(getByText(`₦${expectedFormatted}`)).toBeTruthy()
        }),
        { numRuns: 50 }
      )
    })

    /**
     * Property: For any progress percentage, if the job status is
     * repair_started, the progress indicator SHALL display the correct
     * percentage value, clamped between 0 and 100.
     */
    test('Property: Progress indicator displays correct percentage for active repairs', () => {
      fc.assert(
        fc.property(arbitraryPercentage, (percentage) => {
          const { getByText } = render(
            <JobCard
              {...mockProps}
              status="repair_started"
              progressPercentage={percentage}
            />
          )

          const clamped = Math.min(Math.max(percentage, 0), 100)
          expect(getByText(`${Math.round(clamped)}% complete`)).toBeTruthy()
        }),
        { numRuns: 50 }
      )
    })

    /**
     * Property: Device icons SHALL be consistent for each device type across
     * multiple renders of the same device type.
     */
    test('Property: Device icons are consistent across renders', () => {
      const testDeviceType: DeviceType = 'smartphone'
      const expectedIcon = deviceIcons[testDeviceType]

      // Render multiple times
      for (let i = 0; i < 5; i++) {
        const { getByText } = render(
          <JobCard {...mockProps} deviceType={testDeviceType} />
        )
        expect(getByText(expectedIcon)).toBeTruthy()
      }
    })

    /**
     * Property: Status badge SHALL render for any valid job status, providing
     * clear visual indication of the job's current state.
     */
    test('Property: Status badge renders for all valid statuses', () => {
      fc.assert(
        fc.property(arbitraryStatus, (status) => {
          const { getByText } = render(
            <JobCard {...mockProps} status={status as any} />
          )

          // Status label should be rendered (via StatusBadge)
          const statusLabels: Record<string, string> = {
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

          const expectedLabel = statusLabels[status]
          expect(getByText(expectedLabel)).toBeTruthy()
        }),
        { numRuns: 50 }
      )
    })

    /**
     * Property: For dates, the JobCard SHALL format them consistently in
     * en-NG locale format (e.g., "Jan 15, 2024").
     */
    test('Property: Date formatting is consistent', () => {
      const testDate = new Date('2024-01-15T10:30:00Z').toISOString()
      const { getByText } = render(
        <JobCard {...mockProps} createdAt={testDate} />
      )

      const expectedDate = new Date(testDate).toLocaleDateString('en-NG', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })

      expect(getByText(expectedDate)).toBeTruthy()
    })
  })
})
