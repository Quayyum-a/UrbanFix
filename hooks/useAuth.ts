// Authentication hook backed by the PIN-based auth store
// Provides access to all auth functionality and state

import { useAuthStore } from '@/stores/authStore'

export function useAuth() {
  const {
    // State
    userProfile,
    role,
    loading,
    initialized,
    isAuthenticating,
    authStep,
    phoneNumber,
    isNewUser,
    error,

    // Actions
    checkPhone,
    submitPIN,
    selectRole,
    completeRegistration,
    signOut,
    initialize,
    hasRole,
    isAuthenticated,
    clearError,
    goToStep
  } = useAuthStore()

  return {
    // Authentication state
    userProfile,
    role,
    loading,
    initialized,
    isAuthenticating,
    authStep,
    phoneNumber,
    isNewUser,
    error,

    // Authentication methods
    checkPhone,
    submitPIN,
    selectRole,
    completeRegistration,
    signOut,
    initialize,

    // Convenience methods
    isAuthenticated: isAuthenticated(),
    isCustomer: role === 'customer',
    isTechnician: role === 'technician',
    hasRole,

    // UI helpers
    clearError,
    goToStep,

    // User info helpers
    fullName: userProfile?.full_name || null,
    avatarUrl: userProfile?.avatar_url || null,
    createdAt: userProfile?.created_at || null
  }
}
