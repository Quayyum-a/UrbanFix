import React from 'react'
import { Text } from 'react-native'
import { render, fireEvent } from '@testing-library/react-native'

import { Card, CardVariant } from '@/components/ui/Card'
import { colors, radius, shadows } from '@/constants/theme'

function flattenStyle(style: any): Record<string, any> {
  if (!style) return {}
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.filter(Boolean).map(flattenStyle))
  }
  return style
}

describe('Card component', () => {
  it('renders default variant with content', () => {
    const { getByText } = render(
      <Card><Text>Card content</Text></Card>
    )
    expect(getByText('Card content')).toBeTruthy()
  })

  it('supports outlined and elevated variants', () => {
    const variants: CardVariant[] = ['default', 'outlined', 'elevated']

    variants.forEach((variant) => {
      const { toJSON } = render(
        <Card variant={variant}><Text>Content</Text></Card>
      )
      expect(toJSON()).toBeTruthy()
    })
  })

  it('applies 12px border radius to all variants', () => {
    const variants: CardVariant[] = ['default', 'outlined', 'elevated']

    variants.forEach((variant) => {
      const { toJSON } = render(
        <Card variant={variant}><Text>Content</Text></Card>
      )
      const styles = (toJSON() as any).props.style
      const flatStyle = flattenStyle(styles)
      expect(flatStyle.borderRadius).toBe(radius.lg)
    })
  })

  it('applies elevated shadow styles for elevated variant', () => {
    const { toJSON } = render(
      <Card variant="elevated"><Text>Content</Text></Card>
    )
    const styles = (toJSON() as any).props.style
    const flatStyle = flattenStyle(styles)
    expect(flatStyle.elevation).toBe(shadows.level2.elevation)
  })

  it('calls onPress when pressable card is pressed', () => {
    const onPress = jest.fn()
    const { getByRole } = render(
      <Card onPress={onPress} accessibilityLabel="Tap card"><Text>Tap</Text></Card>
    )

    fireEvent.press(getByRole('button'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('adds accessibilityRole button when pressable', () => {
    const { getByRole } = render(
      <Card onPress={() => {}} accessibilityLabel="Tap card"><Text>Tap</Text></Card>
    )
    expect(getByRole('button')).toBeTruthy()
  })
})
