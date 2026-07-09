/**
 * SnackbarProvider — context-based snackbar management
 *
 * Requirements: 10.5, 10.8
 *
 * Wraps the app root and exposes `useSnackbar()` hook for
 * programmatic snackbar display from anywhere in the component tree.
 *
 * Usage:
 *   // In _layout.tsx (app root):
 *   <SnackbarProvider>
 *     <App />
 *   </SnackbarProvider>
 *
 *   // Anywhere in the tree:
 *   const { showSnackbar } = useSnackbar()
 *   showSnackbar({ message: 'Address saved!', type: 'success' })
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import { Snackbar, type SnackbarType } from './Snackbar'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShowSnackbarOptions {
  message: string
  type?: SnackbarType
  /** Duration in ms before auto-dismiss. Pass 0 to disable. @default 3000 */
  duration?: number
  actionLabel?: string
  onAction?: () => void
}

export interface SnackbarContextValue {
  showSnackbar: (options: ShowSnackbarOptions) => void
}

// ─── Context ─────────────────────────────────────────────────────────────────

const SnackbarContext = createContext<SnackbarContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

interface SnackbarState extends ShowSnackbarOptions {
  id: number
}

interface SnackbarProviderProps {
  children: ReactNode
}

export function SnackbarProvider({ children }: SnackbarProviderProps) {
  const [current, setCurrent] = useState<SnackbarState | null>(null)
  const [visible, setVisible] = useState(false)
  const idRef = useRef(0)

  const showSnackbar = useCallback((options: ShowSnackbarOptions) => {
    idRef.current += 1
    setCurrent({ ...options, id: idRef.current })
    setVisible(true)
  }, [])

  const handleDismiss = useCallback(() => {
    setVisible(false)
    // Clear after the slide-out animation completes to avoid flash
    setTimeout(() => {
      setCurrent(null)
    }, 350)
  }, [])

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}

      {current ? (
        <Snackbar
          key={current.id}
          message={current.message}
          type={current.type}
          duration={current.duration}
          actionLabel={current.actionLabel}
          onAction={current.onAction}
          visible={visible}
          onDismiss={handleDismiss}
        />
      ) : null}
    </SnackbarContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook to programmatically show a snackbar.
 * Must be used inside a <SnackbarProvider>.
 */
export function useSnackbar(): SnackbarContextValue {
  const ctx = useContext(SnackbarContext)
  if (!ctx) {
    throw new Error('useSnackbar must be used within a <SnackbarProvider>')
  }
  return ctx
}
