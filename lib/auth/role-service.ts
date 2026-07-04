// Role-Based Access Control Service
// Implements Requirements 2.4: Immutable role assignment, 2.5: Role-based access control

import { jwtService } from './jwt-service'
import type { Database } from '@/types/database.types'

export type UserRole = 'customer' | 'technician' | 'admin'

export interface AccessControlResult {
  allowed: boolean
  error?: string
  redirectTo?: string
}

export interface RolePermissions {
  canBookRepairs: boolean
  canAcceptJobs: boolean
  canManageUsers: boolean
  canAccessCustomerFeatures: boolean
  canAccessTechnicianFeatures: boolean
  canAccessAdminFeatures: boolean
  canViewJobDetails: boolean
  canUpdateJobStatus: boolean
  canReleasePayments: boolean
  canReviewUsers: boolean
}

export class RoleService {
  private static instance: RoleService
  private currentRole: UserRole | null = null

  private constructor() {}

  public static getInstance(): RoleService {
    if (!RoleService.instance) {
      RoleService.instance = new RoleService()
    }
    return RoleService.instance
  }

  /**
   * Get current user's role
   */
  public async getCurrentRole(): Promise<UserRole | null> {
    try {
      // Check cached role first
      if (this.currentRole) {
        return this.currentRole
      }

      // Get role from JWT service
      const role = await jwtService.getUserRole()
      this.currentRole = role
      return role
    } catch (error) {
      console.error('Get current role error:', error)
      return null
    }
  }

  /**
   * Check if user has a specific role
   */
  public async hasRole(role: UserRole): Promise<boolean> {
    const currentRole = await this.getCurrentRole()
    return currentRole === role
  }

  /**
   * Check if user has any of the specified roles
   */
  public async hasAnyRole(roles: UserRole[]): Promise<boolean> {
    const currentRole = await this.getCurrentRole()
    return currentRole ? roles.includes(currentRole) : false
  }

  /**
   * Get permissions for current user role
   */
  public async getPermissions(): Promise<RolePermissions> {
    const role = await this.getCurrentRole()
    return this.getRolePermissions(role)
  }

  /**
   * Get permissions for a specific role
   */
  public getRolePermissions(role: UserRole | null): RolePermissions {
    const defaultPermissions: RolePermissions = {
      canBookRepairs: false,
      canAcceptJobs: false,
      canManageUsers: false,
      canAccessCustomerFeatures: false,
      canAccessTechnicianFeatures: false,
      canAccessAdminFeatures: false,
      canViewJobDetails: false,
      canUpdateJobStatus: false,
      canReleasePayments: false,
      canReviewUsers: false
    }

    switch (role) {
      case 'customer':
        return {
          ...defaultPermissions,
          canBookRepairs: true,
          canAccessCustomerFeatures: true,
          canViewJobDetails: true,
          canReleasePayments: true,
          canReviewUsers: true // Can review technicians
        }

      case 'technician':
        return {
          ...defaultPermissions,
          canAcceptJobs: true,
          canAccessTechnicianFeatures: true,
          canViewJobDetails: true,
          canUpdateJobStatus: true
        }

      case 'admin':
        return {
          ...defaultPermissions,
          canManageUsers: true,
          canAccessAdminFeatures: true,
          canViewJobDetails: true,
          canUpdateJobStatus: true,
          canReleasePayments: true,
          canReviewUsers: true
        }

      default:
        return defaultPermissions
    }
  }

  /**
   * Check access to a specific feature
   */
  public async checkAccess(
    permission: keyof RolePermissions
  ): Promise<AccessControlResult> {
    try {
      const isAuthenticated = await jwtService.isAuthenticated()
      
      if (!isAuthenticated) {
        return {
          allowed: false,
          error: 'Authentication required',
          redirectTo: '/auth/login'
        }
      }

      const permissions = await this.getPermissions()
      
      if (!permissions[permission]) {
        return {
          allowed: false,
          error: 'Access denied. You do not have permission to access this feature.',
          redirectTo: this.getRedirectPath()
        }
      }

      return { allowed: true }
    } catch (error) {
      console.error('Check access error:', error)
      return {
        allowed: false,
        error: 'Access check failed'
      }
    }
  }

  /**
   * Check if user can access a specific route
   */
  public async checkRouteAccess(route: string): Promise<AccessControlResult> {
    try {
      const isAuthenticated = await jwtService.isAuthenticated()
      const role = await this.getCurrentRole()

      // Public routes that don't require authentication
      const publicRoutes = [
        '/auth/login',
        '/auth/register',
        '/auth/otp-verification',
        '/auth/role-selection',
        '/onboarding'
      ]

      if (publicRoutes.some(publicRoute => route.startsWith(publicRoute))) {
        return { allowed: true }
      }

      // All other routes require authentication
      if (!isAuthenticated || !role) {
        return {
          allowed: false,
          error: 'Authentication required',
          redirectTo: '/auth/login'
        }
      }

      // Role-specific route access
      if (route.startsWith('/customer/')) {
        if (role !== 'customer') {
          return {
            allowed: false,
            error: 'Customer access required',
            redirectTo: this.getRedirectPath(role)
          }
        }
      }

      if (route.startsWith('/technician/')) {
        if (role !== 'technician') {
          return {
            allowed: false,
            error: 'Technician access required',
            redirectTo: this.getRedirectPath(role)
          }
        }
      }

      if (route.startsWith('/admin/')) {
        if (role !== 'admin') {
          return {
            allowed: false,
            error: 'Admin access required',
            redirectTo: this.getRedirectPath(role)
          }
        }
      }

      return { allowed: true }
    } catch (error) {
      console.error('Check route access error:', error)
      return {
        allowed: false,
        error: 'Route access check failed'
      }
    }
  }

  /**
   * Get appropriate redirect path for user role
   */
  public getRedirectPath(role?: UserRole): string {
    const userRole = role || this.currentRole

    switch (userRole) {
      case 'customer':
        return '/customer'
      case 'technician':
        return '/technician'
      case 'admin':
        return '/admin'
      default:
        return '/auth/login'
    }
  }

  /**
   * Validate role assignment (prevent role changes)
   * Requirement 2.4: Immutable role assignment
   */
  public async validateRoleImmutability(
    userId: string, 
    currentRole: UserRole, 
    newRole: UserRole
  ): Promise<boolean> {
    // Once a role is assigned, it cannot be changed
    // This would typically be enforced at the database level with RLS policies
    if (currentRole && currentRole !== newRole) {
      console.error('Attempted role change blocked:', {
        userId,
        currentRole,
        newRole
      })
      return false
    }
    return true
  }

  /**
   * Check if user can perform action on resource
   */
  public async canAccessResource(
    resourceType: 'job' | 'profile' | 'payment' | 'review',
    resourceId: string,
    action: 'read' | 'write' | 'delete'
  ): Promise<AccessControlResult> {
    try {
      const session = await jwtService.getCurrentSession()
      const permissions = await this.getPermissions()

      if (!session) {
        return {
          allowed: false,
          error: 'Authentication required'
        }
      }

      // Resource-specific access control
      switch (resourceType) {
        case 'job':
          return this.checkJobAccess(resourceId, action, session.user.id, permissions)
        
        case 'profile':
          return this.checkProfileAccess(resourceId, action, session.user.id, permissions)
        
        case 'payment':
          return this.checkPaymentAccess(resourceId, action, session.user.id, permissions)
        
        case 'review':
          return this.checkReviewAccess(resourceId, action, session.user.id, permissions)
        
        default:
          return {
            allowed: false,
            error: 'Unknown resource type'
          }
      }
    } catch (error) {
      console.error('Resource access check error:', error)
      return {
        allowed: false,
        error: 'Resource access check failed'
      }
    }
  }

  private async checkJobAccess(
    jobId: string,
    action: 'read' | 'write' | 'delete',
    userId: string,
    permissions: RolePermissions
  ): Promise<AccessControlResult> {
    // Users can only access jobs they are participants in
    // This would typically involve a database query to check job participation
    // For now, we assume proper RLS policies handle this at the database level
    
    if (!permissions.canViewJobDetails) {
      return {
        allowed: false,
        error: 'Permission denied: Cannot view job details'
      }
    }

    if (action === 'write' && !permissions.canUpdateJobStatus) {
      return {
        allowed: false,
        error: 'Permission denied: Cannot update job status'
      }
    }

    return { allowed: true }
  }

  private async checkProfileAccess(
    profileId: string,
    action: 'read' | 'write' | 'delete',
    userId: string,
    permissions: RolePermissions
  ): Promise<AccessControlResult> {
    // Users can only modify their own profiles
    if (action === 'write' && profileId !== userId) {
      return {
        allowed: false,
        error: 'Permission denied: Can only modify own profile'
      }
    }

    return { allowed: true }
  }

  private async checkPaymentAccess(
    paymentId: string,
    action: 'read' | 'write' | 'delete',
    userId: string,
    permissions: RolePermissions
  ): Promise<AccessControlResult> {
    if (action === 'write' && !permissions.canReleasePayments) {
      return {
        allowed: false,
        error: 'Permission denied: Cannot release payments'
      }
    }

    return { allowed: true }
  }

  private async checkReviewAccess(
    reviewId: string,
    action: 'read' | 'write' | 'delete',
    userId: string,
    permissions: RolePermissions
  ): Promise<AccessControlResult> {
    if (action === 'write' && !permissions.canReviewUsers) {
      return {
        allowed: false,
        error: 'Permission denied: Cannot write reviews'
      }
    }

    return { allowed: true }
  }

  /**
   * Clear cached role (call on logout)
   */
  public clearRole(): void {
    this.currentRole = null
  }

  /**
   * Set current role (for testing purposes)
   */
  public setRole(role: UserRole | null): void {
    this.currentRole = role
  }
}

// Export singleton instance
export const roleService = RoleService.getInstance()