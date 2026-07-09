import { useState, useEffect } from 'react'
import { Keyboard, Platform, KeyboardEvent } from 'react-native'

interface UseKeyboardHeightReturn {
  /** Current keyboard height in pixels (0 when hidden) */
  keyboardHeight: number
  /** Whether the keyboard is currently visible */
  keyboardVisible: boolean
  /** Duration of the show/hide animation in milliseconds */
  keyboardAnimDuration: number
}

/**
 * Tracks the keyboard height and visibility state.
 * Uses `keyboardWillShow`/`keyboardWillHide` on iOS for smoother transitions,
 * and `keyboardDidShow`/`keyboardDidHide` on Android.
 */
export function useKeyboardHeight(): UseKeyboardHeightReturn {
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  const [keyboardAnimDuration, setKeyboardAnimDuration] = useState(0)

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const handleShow = (event: KeyboardEvent) => {
      setKeyboardHeight(event.endCoordinates.height)
      setKeyboardAnimDuration(event.duration ?? 0)
      setKeyboardVisible(true)
    }

    const handleHide = (event: KeyboardEvent) => {
      setKeyboardHeight(0)
      setKeyboardAnimDuration(event.duration ?? 0)
      setKeyboardVisible(false)
    }

    const showSubscription = Keyboard.addListener(showEvent, handleShow)
    const hideSubscription = Keyboard.addListener(hideEvent, handleHide)

    return () => {
      showSubscription.remove()
      hideSubscription.remove()
    }
  }, [])

  return { keyboardHeight, keyboardVisible, keyboardAnimDuration }
}
