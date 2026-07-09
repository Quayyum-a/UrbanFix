/**
 * useSnackbar — hook to programmatically show snackbars
 *
 * Requirements: 10.5, 10.8
 *
 * Consumes the SnackbarContext exposed by <SnackbarProvider>.
 * Must be used inside a <SnackbarProvider> tree.
 *
 * Usage:
 *   const { showSnackbar } = useSnackbar()
 *   showSnackbar({ message: 'Saved!', type: 'success' })
 */

import {
  useSnackbar as useSnackbarContext,
  type ShowSnackbarOptions,
  type SnackbarContextValue,
} from '@/components/ui/SnackbarProvider'

// Re-export the options type for consumers
export type { ShowSnackbarOptions }

/**
 * Hook to programmatically show a snackbar.
 * Must be used within a <SnackbarProvider>.
 *
 * @returns {{ showSnackbar: (options: ShowSnackbarOptions) => void }}
 */
export function useSnackbar(): SnackbarContextValue {
  return useSnackbarContext()
}
