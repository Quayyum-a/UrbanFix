import React, { useRef, useEffect, useState } from 'react'
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
  Animated,
  Platform,
} from 'react-native'
import { colors, typography, radius, spacing, touchTargets } from '@/constants/theme'

interface InputProps extends TextInputProps {
  label?: string
  error?: string
  helperText?: string
  containerStyle?: ViewStyle
  inputStyle?: TextStyle
  labelStyle?: TextStyle
}

// Floating label animation constants
const LABEL_UPPER_TOP = -10   // position when floated (above the input)
const LABEL_LOWER_TOP = 17    // position when resting inside the input
const LABEL_UPPER_FONT = 12   // font size when floated
const LABEL_LOWER_FONT = 16   // font size when resting
const ANIMATION_DURATION = 150 // ms — matches design spec fast animation

export function Input({
  label,
  error,
  helperText,
  containerStyle,
  inputStyle,
  labelStyle,
  onFocus,
  onBlur,
  value,
  defaultValue,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false)

  // Determine whether the label should be in the "floated" (upper) position
  const hasValue = Boolean(value || defaultValue)
  const shouldFloat = isFocused || hasValue

  // Animated values — initialise to the correct position based on current state
  const labelTopAnim = useRef(new Animated.Value(shouldFloat ? LABEL_UPPER_TOP : LABEL_LOWER_TOP)).current
  const labelFontAnim = useRef(new Animated.Value(shouldFloat ? LABEL_UPPER_FONT : LABEL_LOWER_FONT)).current

  // Re-run the animation whenever the float state changes
  useEffect(() => {
    Animated.parallel([
      Animated.timing(labelTopAnim, {
        toValue: shouldFloat ? LABEL_UPPER_TOP : LABEL_LOWER_TOP,
        duration: ANIMATION_DURATION,
        useNativeDriver: false, // 'top' and 'fontSize' are not supported by the native driver
      }),
      Animated.timing(labelFontAnim, {
        toValue: shouldFloat ? LABEL_UPPER_FONT : LABEL_LOWER_FONT,
        duration: ANIMATION_DURATION,
        useNativeDriver: false,
      }),
    ]).start()
  }, [shouldFloat, labelTopAnim, labelFontAnim])

  const handleFocus = (e: any) => {
    setIsFocused(true)
    onFocus?.(e)
  }

  const handleBlur = (e: any) => {
    setIsFocused(false)
    onBlur?.(e)
  }

  // Derive the label colour for the current state
  const labelColor = error
    ? colors.error
    : isFocused
    ? colors.primary
    : colors.text.secondary

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Outer wrapper gives the input its bordered box; label floats on top of its border */}
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          error && styles.inputWrapperError,
        ]}
      >
        {/* Floating label — positioned absolutely so it can float above the border */}
        {label ? (
          <Animated.Text
            style={[
              styles.floatingLabel,
              {
                top: labelTopAnim,
                fontSize: labelFontAnim,
                color: labelColor,
                // Mask the border behind the label when it floats up
                backgroundColor: shouldFloat ? colors.surface : 'transparent',
              },
              labelStyle,
            ]}
            // Accessibility: associate the label with the input
            accessibilityLabel={label}
            importantForAccessibility="no"
          >
            {label}
          </Animated.Text>
        ) : null}

        <TextInput
          style={[
            styles.input,
            // Add top padding so typed text doesn't collide with the floated label
            label ? styles.inputWithLabel : null,
            inputStyle,
          ]}
          placeholderTextColor={colors.text.disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          value={value}
          // Don't show placeholder while label is visible in the field (un-floated state)
          placeholder={shouldFloat ? props.placeholder : undefined}
          accessibilityLabel={label}
          accessibilityHint={helperText}
          accessibilityState={{
            disabled: props.editable === false,
          }}
          {...props}
        />
      </View>

      {/* Helper / error text */}
      {(error || helperText) ? (
        <Text
          style={[styles.helperText, error ? styles.errorText : null]}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {error ?? helperText}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },

  // The bordered box that contains the TextInput
  inputWrapper: {
    position: 'relative',
    height: touchTargets.inputHeight, // 56px — proper touch target (WCAG)
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },

  inputWrapperFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },

  inputWrapperError: {
    borderColor: colors.error,
    borderWidth: 2,
  },

  // The animated label that floats above the border
  floatingLabel: {
    position: 'absolute',
    left: spacing.md,
    // top is driven by Animated.Value
    // fontSize is driven by Animated.Value
    fontFamily: 'Inter_400Regular',
    paddingHorizontal: 4,
    zIndex: 1,
    // Ensure the label sits above the border line
    ...Platform.select({
      android: { elevation: 1 },
    }),
  },

  // The actual text field — fills the wrapper
  input: {
    ...typography.bodyLg,
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 0, // vertically centred by the wrapper's justifyContent
    color: colors.text.primary,
    // Remove default TextInput focus outline on web
    // @ts-ignore — outlineWidth is web-only
    outlineWidth: 0,
  },

  // Extra top padding so typed text sits below the floated label
  inputWithLabel: {
    paddingTop: 8,
  },

  helperText: {
    ...typography.labelMd,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    marginLeft: spacing.md,
  },

  errorText: {
    color: colors.error,
  },
})
