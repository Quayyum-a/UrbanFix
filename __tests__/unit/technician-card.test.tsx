/**
 * Property and Unit Tests for TechnicianCard Component
 *
 * Validates: Requirements 7.2, 5.6
 * 
 * Requirement 7.2: TechnicianCard SHALL display technician information with
 *                  avatar, rating, verification status, and specialty tags
 * Requirement 5.6: TechnicianCard SHALL include distance calculation and
 *                  availability indicators with proper avatar fallback
 */

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import * as fc from 'fast-check'
import { TechnicianCard } from '@/components/ui/TechnicianCard'

// Arbitrary generators for property testing
const arbitraryRating = fc.integer({ min: 0, max: 5 })
const arbitraryJobCount = fc.integer({ min: 0, max: 10000 })
const arbitraryLabourPrice = fc.integer({ min: 500, max: 2000000 }) // ₦5 to ₦20,000
const arbitraryName = fc.string({
  minLength: 2,
  maxLength: 30,
})
const arbitrarySpecialty = fc.string({
  minLength: 3,
  maxLength: 20,
})
const arbitraryDistance = fc.string({
  minLength: 2,
  maxLength: 10,
})

describe('TechnicianCard Component', () => {
  const mockProps = {
    id: 'tech-123',
    name: 'Chukwuemeka Repairs',
    rating: 4.8,
    jobCount: 47,
    isVerified: true,
    labourPrice: 600000, // ₦6,000
    isAvailable: true,
    distance: '2.5 km',
    specialties: ['Screen Replacement', 'Battery Repair'],
    onPress: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Unit Tests', () => {
    it('renders technician name', () => {
      const { getByText } = render(<TechnicianCard {...mockProps} />)
      expect(getByText('Chukwuemeka Repairs')).toBeTruthy()
    })

    it('renders verification badge when verified', () => {
      const { getByText } = render(<TechnicianCard {...mockProps} isVerified={true} />)
      expect(getByText('Verified')).toBeTruthy()
    })

    it('does not render verification badge when not verified', () => {
      const { queryByText } = render(<TechnicianCard {...mockProps} isVerified={false} />)
      expect(queryByText('Verified')).toBeNull()
    })

    it('displays rating', () => {
      const { getByText } = render(<TechnicianCard {...mockProps} />)
      expect(getByText('4.8')).toBeTruthy()
    })

    it('displays job count', () => {
      const { getByText } = render(<TechnicianCard {...mockProps} />)
      expect(getByText('(47)')).toBeTruthy()
    })

    it('displays labour price in Nigerian Naira format', () => {
      const { getByText } = render(<TechnicianCard {...mockProps} />)
      expect(getByText('₦6,000')).toBeTruthy()
    })

    it('displays distance when provided', () => {
      const { getByText } = render(<TechnicianCard {...mockProps} distance="2.5 km" />)
      expect(getByText('2.5 km')).toBeTruthy()
    })

    it('does not display distance when not provided', () => {
      const { queryByText } = render(<TechnicianCard {...mockProps} distance={undefined} />)
      expect(queryByText('2.5 km')).toBeNull()
    })

    it('renders specialty badges', () => {
      const { getByText } = render(
        <TechnicianCard {...mockProps} specialties={['Screen Replacement', 'Battery']} />
      )
      expect(getByText('Screen Replacement')).toBeTruthy()
      expect(getByText('Battery')).toBeTruthy()
    })

    it('shows count badge for specialties over 3', () => {
      const specialties = ['Screen', 'Battery', 'Water', 'Camera', 'Charging']
      const { getByText } = render(
        <TechnicianCard {...mockProps} specialties={specialties} />
      )
      // First 3 should display
      expect(getByText('Screen')).toBeTruthy()
      // Count of remaining should show (+2)
      expect(getByText('+2')).toBeTruthy()
    })

    it('provides accessibility information', () => {
      const { getByLabelText } = render(<TechnicianCard {...mockProps} />)
      const card = getByLabelText(/Technician: Chukwuemeka Repairs/)
      expect(card).toBeTruthy()
      expect(card.props.accessibilityRole).toBe('button')
    })

    it('calls onPress when card is pressed', () => {
      const onPress = jest.fn()
      const { getByRole } = render(
        <TechnicianCard {...mockProps} onPress={onPress} />
      )
      fireEvent.press(getByRole('button'))
      expect(onPress).toHaveBeenCalledTimes(1)
    })

    it('renders initials when avatar URL is not provided', () => {
      const { getByText } = render(
        <TechnicianCard {...mockProps} avatarUrl={undefined} />
      )
      // Should render initials "CR" for Chukwuemeka Repairs
      expect(getByText('CR')).toBeTruthy()
    })

    it('uses first letter initials correctly', () => {
      const testCases = [
        { name: 'John Doe', expected: 'JD' },
        { name: 'Alice Bob Smith', expected: 'ABS' },
        { name: 'X', expected: 'X' },
      ]

      testCases.forEach(({ name, expected }) => {
        const { getByText } = render(
          <TechnicianCard {...mockProps} name={name} avatarUrl={undefined} />
        )
        expect(getByText(expected)).toBeTruthy()
      })
    })
  })

  describe('Property 26: Technician Card Information Rendering', () => {
    /**
     * Property: For any technician data, the TechnicianCard SHALL render all
     * required information consistently: name, rating, job count, verification
     * status, labour price in Naira format, and specialty tags.
     */
    test('Property: All technician data displays consistently', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            arbitraryName,
            arbitraryRating,
            arbitraryJobCount,
            arbitraryLabourPrice,
            fc.array(arbitrarySpecialty, { minLength: 0, maxLength: 5 })
          ),
          ([name, rating, jobCount, price, specialties]) => {
            const props = {
              ...mockProps,
              name,
              rating: Math.min(5, Math.max(0, rating)),
              jobCount,
              labourPrice: price,
              specialties: [...new Set(specialties)], // Ensure unique
            }

            const { getByText, getByLabelText } = render(
              <TechnicianCard {...props} />
            )

            // Name should render
            expect(getByText(name)).toBeTruthy()

            // Price should be formatted in Naira
            const priceInNaira = (price / 100).toLocaleString('en-NG')
            expect(getByText(`₦${priceInNaira}`)).toBeTruthy()

            // Job count should display
            expect(getByText(`(${jobCount})`)).toBeTruthy()

            // Card should be accessible
            const card = getByLabelText(new RegExp(`Technician: ${name}`))
            expect(card).toBeTruthy()
          }
        ),
        { numRuns: 50 }
      )
    })

    /**
     * Property: For any labour price value in kobo, the TechnicianCard SHALL
     * format it correctly in Nigerian Naira with proper thousand separators.
     */
    test('Property: Labour price formatting is consistent and correct', () => {
      fc.assert(
        fc.property(arbitraryLabourPrice, (priceInKobo) => {
          const { getByText } = render(
            <TechnicianCard {...mockProps} labourPrice={priceInKobo} />
          )

          const priceInNaira = priceInKobo / 100
          const expectedFormatted = (priceInNaira).toLocaleString('en-NG')

          expect(getByText(`₦${expectedFormatted}`)).toBeTruthy()
        }),
        { numRuns: 50 }
      )
    })

    /**
     * Property: For any rating value between 0-5, the TechnicianCard SHALL
     * display it accurately with one decimal place.
     */
    test('Property: Rating displays accurately', () => {
      fc.assert(
        fc.property(arbitraryRating, (rating) => {
          const normalizedRating = Math.min(5, Math.max(0, rating))
          const { getByText } = render(
            <TechnicianCard {...mockProps} rating={normalizedRating} />
          )

          // Rating should display as a number (with or without decimals)
          const ratingStr = normalizedRating.toString()
          try {
            expect(getByText(ratingStr)).toBeTruthy()
          } catch {
            // If exact match fails, check if rating is displayed with decimals
            expect(getByText(normalizedRating.toFixed(1))).toBeTruthy()
          }
        }),
        { numRuns: 30 }
      )
    })

    /**
     * Property: For any job count value, the TechnicianCard SHALL display it
     * in the correct format with parentheses.
     */
    test('Property: Job count displays correctly formatted', () => {
      fc.assert(
        fc.property(arbitraryJobCount, (jobCount) => {
          const { getByText } = render(
            <TechnicianCard {...mockProps} jobCount={jobCount} />
          )

          expect(getByText(`(${jobCount})`)).toBeTruthy()
        }),
        { numRuns: 50 }
      )
    })

    /**
     * Property: Technician initials SHALL be correctly derived from the name
     * for avatar fallback display when no avatar URL is provided.
     */
    test('Property: Technician initials are correctly derived', () => {
      // Test with known good names
      const testNames = [
        'John Doe',
        'Alice Bob Smith',
        'X Y',
      ]

      testNames.forEach((name) => {
        const { getByText } = render(
          <TechnicianCard {...mockProps} name={name} avatarUrl={undefined} />
        )

        const expectedInitials = name
          .split(' ')
          .map(part => (part[0] || '').toUpperCase())
          .join('')
          .slice(0, 3)

        if (expectedInitials) {
          expect(getByText(expectedInitials)).toBeTruthy()
        }
      })
    })

    /**
     * Property: Specialty tags SHALL render up to 3 items with a count badge
     * for additional specialties beyond the 3-item limit.
     */
    test('Property: Specialty tags display with count badge for overflow', () => {
      const testCases = [
        { specialties: [], expectedCount: 0 },
        { specialties: ['Screen Repair'], expectedCount: 1 },
        { specialties: ['Screen', 'Battery', 'Camera'], expectedCount: 3 },
        { specialties: ['Screen', 'Battery', 'Camera', 'Charging'], expectedCount: 3, shouldShowCount: true, countValue: 1 },
        { specialties: ['Screen', 'Battery', 'Camera', 'Charging', 'Water'], expectedCount: 3, shouldShowCount: true, countValue: 2 },
      ]

      testCases.forEach(({ specialties, expectedCount, shouldShowCount, countValue }) => {
        const { getByText, queryByText } = render(
          <TechnicianCard {...mockProps} specialties={specialties} />
        )

        // Check visible specialties (first 3)
        specialties.slice(0, 3).forEach(spec => {
          expect(getByText(spec)).toBeTruthy()
        })

        // Check count badge
        if (shouldShowCount && countValue !== undefined) {
          expect(getByText(`+${countValue}`)).toBeTruthy()
        } else if (!shouldShowCount) {
          expect(queryByText(/^\+\d+$/)).toBeNull()
        }
      })
    })

    /**
     * Property: Availability status SHALL be consistently indicated through
     * visual elements when technician is available.
     */
    test('Property: Availability status is clearly indicated', () => {
      const { getByLabelText: getAvailable } = render(
        <TechnicianCard {...mockProps} isAvailable={true} />
      )

      // Should have accessibility label
      const card = getAvailable(/Technician/)
      expect(card).toBeTruthy()
      expect(card.props.accessibilityHint).toContain('Available')

      const { getByLabelText: getUnavailable } = render(
        <TechnicianCard {...mockProps} isAvailable={false} />
      )

      // Should have accessibility label
      const unavailableCard = getUnavailable(/Technician/)
      expect(unavailableCard).toBeTruthy()
      expect(unavailableCard.props.accessibilityHint).toContain('Unavailable')
    })

    /**
     * Property: Distance information SHALL display when provided and be
     * formatted consistently.
     */
    test('Property: Distance information displays when provided', () => {
      fc.assert(
        fc.property(arbitraryDistance, (distance) => {
          const { getByText, queryByText } = render(
            <TechnicianCard {...mockProps} distance={distance} />
          )

          expect(getByText(distance)).toBeTruthy()
        }),
        { numRuns: 30 }
      )
    })
  })
})
