// Authentication module exports
// Central export point for all authentication services

export { PhoneAuthService, phoneAuthService } from './phone-auth'
export { OTPService, otpService } from './otp-service'
export { JWTService, jwtService } from './jwt-service'
export { RoleService, roleService } from './role-service'

export type { 
  AuthResult, 
  PhoneValidationResult 
} from './phone-auth'

export type { 
  RateLimitResult, 
  OTPAttempt 
} from './otp-service'

export type { 
  SessionInfo, 
  SessionValidationResult 
} from './jwt-service'

export type { 
  UserRole, 
  AccessControlResult, 
  RolePermissions 
} from './role-service'