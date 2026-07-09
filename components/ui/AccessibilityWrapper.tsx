import React from 'react'
import { View, AccessibilityRole, ViewStyle } from 'react-native'

export interface AccessibilityWrapperProps {
  /** Describes the element for screen readers (replaces visual label). */
  label: string
  /** Provides additional context about the element's action or purpose. */
  hint?: string
  /**
   * The accessibility role of the element.
   * Defaults to 'none' when not provided.
   */
  role?: AccessibilityRole
  children: React.ReactNode
  style?: ViewStyle
}

/**
 * AccessibilityWrapper wraps any content in a View with accessibility props pre-applied.
 *
 * Use this when you have a group of elements that should be announced as a single unit
 * by screen readers, or when you need to apply an explicit accessibilityRole to a
 * container that doesn't have one natively (e.g. a custom card, section header, or
 * decorative layout wrapper).
 *
 * @example
 * <AccessibilityWrapper label="Profile section" role="header">
 *   <Text>John Doe</Text>
 *   <Text>Technician</Text>
 * </AccessibilityWrapper>
 */
export function AccessibilityWrapper({
  label,
  hint,
  role,
  children,
  style,
}: AccessibilityWrapperProps): React.JSX.Element {
  return (
    <View
      accessible
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityRole={role ?? 'none'}
      style={style}
    >
      {children}
    </View>
  )
}
