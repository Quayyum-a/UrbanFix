// Enhanced authentication hook with phone auth integration
// Provides access to all auth functionality and state

import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/lib/auth'

export function useAuth() {
  const {
    // State
    user,
    userProfile,
    role,
    loading,
    initialized,
    isAuthenticating,
    authStep,
    phoneNumber,
    error,
    
    // Actions
    sendOTP,
    verifyOTP,
    completeRegistration,
    directSignIn,
    signOut,
    initialize,
    hasRole,
    canAccess,
    isAuthenticated,
    clearError,
    
    // Setters (for internal use)
    setAuthStep,
    setPhoneNumber,
    setError
  } = useAuthStore()

  return {
    // Authentication state
    user,
    userProfile,
    role,
    loading,
    initialized,
    isAuthenticating,
    authStep,
    phoneNumber,
    error,
    
    // Authentication methods
    sendOTP,
    verifyOTP,
    completeRegistration,
    directSignIn,
    signOut,
    initialize,
    
    // Convenience methods
    isAuthenticated: isAuthenticated(),
    isCustomer: role === 'customer',
    isTechnician: role === 'technician',
    isAdmin: role === 'admin',
    hasRole,
    canAccess,
    
    // UI helpers
    clearError,
    setAuthStep,
    setPhoneNumber,
    setError,
    
    // Auth flow helpers
    needsRoleSelection: authStep === 'role-selection',
    needsProfileSetup: authStep === 'profile-setup',
    isComplete: authStep === 'complete',
    canProceed: !isAuthenticating && !error,
    
    // User info helpers
    fullName: userProfile?.full_name || null,
    avatarUrl: userProfile?.avatar_url || null,
    createdAt: userProfile?.created_at || null
  }
}
