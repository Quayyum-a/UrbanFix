/**
 * Unit Tests for Card Component
 *
 * Validates: Requirements 2.8, 8.2, 9.2
 * Requirement 2.8: THE Component_Library SHALL define Card layouts for technicians,
 *                  jobs, and service categories
 * Requirement 8.2: THE Interaction_Patterns SHALL implement press animations with
 *                  0.95 scale transform for touch feedback
 * Requirement 9.2: THE Accessibility_Standards SHALL provide proper semantic labels
 *                  for all interactive elements
 */

import React from 'react'
import { Text } from 'react-native'
import { render, fireEvent } from '@testing-library/react-native'

import { Card, CardVariant } from './Card'
import { colors, radius, shadows } from '@/constants/theme'

describe('Card Component', () => {
  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------
  describe('Rendering', () => {
    it('renders children correctly', () => {
      const { getByText } = render(
        <Card>
          <Text>Card content</Text>
        </Card>
      )
      expect(getByText('Card content')).toBeTruthy()
    })

    it('renders without crashing when children is null', () => {
      const { toJSON } = render(<Card>{null}</Card>)
      expect(toJSON()).toBeTruthy()
    })
  })

  // ---------------------------------------------------------------------------
  // Variants
  // ---------------------------------------------------------------------------
  describe('Variants', () => {
    const variants: CardVariant[] = ['default', 'outlined', 'elevated']

    it.each(variants)('renders the "%s" variant without crashing', (variant) => {
      const { toJSON } = render(
        <Card variant={variant}>
          <Text>Content</Text>
        </Card>
      )
      expect(toJSON()).toBeTruthy()
    })

    it('defaults to "default" variant when no variant prop is provided', () => {
      const { toJSON: withVariant } = render(
        <Card variant="default"><Text>A</Text></Card>
      )
      const { toJSON: withoutVariant } = render(
        <Card><Text>A</Text></Card>
      )
      // Both should have identical style array structures
      expect(JSON.stringify(withVariant())).toBe(JSON.stringify(withoutVariant()))
    })

    it('applies 12px border radius (radius.lg) to all variants', () => {
      variants.forEach((variant) => {
        const { toJSON } = render(
          <Card variant={variant}><Text>Content</Text></Card>
        )
        const styles = (toJSON() as any).props.style
        const flatStyle = Array.isArray(styles)
          ? Object.assign({}, ...styles.filter(Boolean))
          : styles
        expect(flatStyle.borderRadius).toBe(radius.lg)
      })
    })

    it('default variant has a 1px subtle border (outlineVariant color)', () => {
      const { toJSON } = render(
        <Card variant="default"><Text>Content</Text></Card>
      )
      const flatStyle = flattenStyle((toJSON() as any).props.style)
      expect(flatStyle.borderWidth).toBe(1)
      expect(flatStyle.borderColor).toBe(colors.outlineVariant)
    })

    it('outlined variant has a 2px enhanced border (outline color)', () => {
      const { toJSON } = render(
        <Card variant="outlined"><Text>Content</Text></Card>
      )
      const flatStyle = flattenStyle((toJSON() as any).props.style)
      expect(flatStyle.borderWidth).toBe(2)
      expect(flatStyle.borderColor).toBe(colors.outline)
    })

    it('elevated variant has no border', () => {
      const { toJSON } = render(
        <Card variant="elevated"><Text>Content</Text></Card>
      )
      const flatStyle = flattenStyle((toJSON() as any).props.style)
      expect(flatStyle.borderWidth).toBe(0)
    })

    it('elevated variant applies a drop shadow (elevation token)', () => {
      const { toJSON } = render(
        <Card variant="elevated"><Text>Content</Text></Card>
      )
      const flatStyle = flattenStyle((toJSON() as any).props.style)
      expect(flatStyle.elevation).toBe(shadows.level2.elevation)
    })

    it('elevated variant uses tonal surface background (surfaceContainerLow)', () => {
      const { toJSON } = render(
        <Card variant="elevated"><Text>Content</Text></Card>
      )
      const flatStyle = flattenStyle((toJSON() as any).props.style)
      expect(flatStyle.backgroundColor).toBe(colors.surfaceContainerLow)
    })
  })

  // ---------------------------------------------------------------------------
  // Pressable card (onPress provided)
  // ---------------------------------------------------------------------------
  describe('Pressable card — onPress provided', () => {
    it('calls onPress when pressed', () => {
      const onPress = jest.fn()
      const { getByRole } = render(
        <Card onPress={onPress} accessibilityLabel="Open job">
          <Text>Job card</Text>
        </Card>
      )
      fireEvent.press(getByRole('button'))
      expect(onPress).toHaveBeenCalledTimes(1)
    })

    it('sets accessibilityRole="button" when onPress is provided', () => {
      const { getByRole } = render(
        <Card onPress={() => {}} accessibilityLabel="Tap me">
          <Text>Tappable</Text>
        </Card>
      )
      expect(getByRole('button')).toBeTruthy()
    })

    it('forwards accessibilityLabel to the pressable element', () => {
      const label = 'View technician profile'
      const { getByLabelText } = render(
        <Card onPress={() => {}} accessibilityLabel={label}>
          <Text>Content</Text>
        </Card>
      )
      expect(getByLabelText(label)).toBeTruthy()
    })

    it('forwards accessibilityHint to the pressable element', () => {
      const { getByA11yHint } = render(
        <Card
          onPress={() => {}}
          accessibilityLabel="Job card"
          accessibilityHint="Opens job details"
        >
          <Text>Content</Text>
        </Card>
      )
      expect(getByA11yHint('Opens job details')).toBeTruthy()
    })

    it('does not throw when press-in and press-out events fire', () => {
      const { getByRole } = render(
        <Card onPress={() => {}} accessibilityLabel="Card">
          <Text>Content</Text>
        </Card>
      )
      const button = getByRole('button')
      expect(() => {
        fireEvent(button, 'pressIn')
        fireEvent(button, 'pressOut')
      }).not.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // Non-pressable card (no onPress)
  // ---------------------------------------------------------------------------
  describe('Non-pressable card — no onPress', () => {
    it('sets accessibilityRole="none" when no onPress is provided', () => {
      const { toJSON } = render(
        <Card>
          <Text>Static card</Text>
        </Card>
      )
      const json = toJSON() as any
      expect(json.props.accessibilityRole).toBe('none')
    })

    it('does not throw when tapped without an onPress handler', () => {
      const { getByText } = render(
        <Card>
          <Text>Static</Text>
        </Card>
      )
      expect(() => fireEvent.press(getByText('Static'))).not.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // Style overrides
  // ---------------------------------------------------------------------------
  describe('Custom style override', () => {
    it('merges custom style prop with variant styles', () => {
      const customStyle = { margin: 16 }
      const { toJSON } = render(
        <Card style={customStyle}>
          <Text>Styled</Text>
        </Card>
      )
      const flatStyle = flattenStyle((toJSON() as any).props.style)
      expect(flatStyle.margin).toBe(16)
    })
  })
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Flatten a potentially nested style array into a single style object. */
function flattenStyle(style: any): Record<string, any> {
  if (!style) return {}
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.filter(Boolean).map(flattenStyle))
  }
  return style
}
