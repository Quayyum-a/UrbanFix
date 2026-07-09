import React from 'react'
import {
  Keyboard,
  ScrollView,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from 'react-native'

interface KeyboardDismissViewProps {
  children: React.ReactNode
  style?: ViewStyle
  /**
   * Whether to also dismiss the keyboard when the user begins scrolling.
   * When true, wraps children in a ScrollView instead of a plain View.
   * Defaults to false.
   */
  dismissOnScroll?: boolean
}

/**
 * A wrapper that dismisses the software keyboard when the user taps
 * outside an input field.  When `dismissOnScroll` is true it additionally
 * dismisses on scroll-begin-drag.
 */
export function KeyboardDismissView({
  children,
  style,
  dismissOnScroll = false,
}: KeyboardDismissViewProps) {
  if (dismissOnScroll) {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          style={style}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => Keyboard.dismiss()}
        >
          {children}
        </ScrollView>
      </TouchableWithoutFeedback>
    )
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={style}>{children}</View>
    </TouchableWithoutFeedback>
  )
}
