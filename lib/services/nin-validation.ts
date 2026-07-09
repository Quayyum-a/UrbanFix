// NIN (National Identification Number) validation service
// Validates Nigerian NIN format and provides verification utilities

export interface NINValidationResult {
  isValid: boolean
  error?: string
  formatted?: string
}

export class NINValidationService {
  // NIN format: 11 digits (e.g., 12345678901)
  private static readonly NIN_REGEX = /^\d{11}$/

  /**
   * Validate NIN format
   * Requirements: 4.1 - NIN collection and validation
   */
  public static validateNIN(nin: string): NINValidationResult {
    // Remove whitespace
    const cleaned = nin.trim().replace(/\s/g, '')

    // Check if empty
    if (!cleaned) {
      return {
        isValid: false,
        error: 'NIN is required'
      }
    }

    // Check format
    if (!this.NIN_REGEX.test(cleaned)) {
      return {
        isValid: false,
        error: 'NIN must be exactly 11 digits'
      }
    }

    return {
      isValid: true,
      formatted: cleaned
    }
  }

  /**
   * Format NIN for display (with spaces for readability)
   * Example: 12345678901 → 123 4567 8901
   */
  public static formatNINForDisplay(nin: string): string {
    const cleaned = nin.replace(/\s/g, '')
    if (cleaned.length !== 11) return nin
    
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 7)} ${cleaned.slice(7)}`
  }

  /**
   * Mask NIN for privacy (show first 3 and last 2 digits)
   * Example: 12345678901 → 123****01
   */
  public static maskNIN(nin: string): string {
    const cleaned = nin.replace(/\s/g, '')
    if (cleaned.length !== 11) return '***********'
    
    return `${cleaned.slice(0, 3)}******${cleaned.slice(-2)}`
  }
}

/**
 * BVN (Bank Verification Number) validation
 */
export interface BVNValidationResult {
  isValid: boolean
  error?: string
  formatted?: string
}

export class BVNValidationService {
  // BVN format: 11 digits
  private static readonly BVN_REGEX = /^\d{11}$/

  public static validateBVN(bvn: string): BVNValidationResult {
    const cleaned = bvn.trim().replace(/\s/g, '')

    if (!cleaned) {
      return {
        isValid: false,
        error: 'BVN is required for bank account verification'
      }
    }

    if (!this.BVN_REGEX.test(cleaned)) {
      return {
        isValid: false,
        error: 'BVN must be exactly 11 digits'
      }
    }

    return {
      isValid: true,
      formatted: cleaned
    }
  }

  public static maskBVN(bvn: string): string {
    const cleaned = bvn.replace(/\s/g, '')
    if (cleaned.length !== 11) return '***********'
    
    return `${cleaned.slice(0, 3)}*****${cleaned.slice(-3)}`
  }
}

/**
 * Bank account number validation
 */
export interface AccountNumberValidationResult {
  isValid: boolean
  error?: string
  formatted?: string
}

export class BankAccountValidationService {
  // Nigerian bank account numbers are 10 digits (NUBAN format)
  private static readonly ACCOUNT_NUMBER_REGEX = /^\d{10}$/

  public static validateAccountNumber(accountNumber: string): AccountNumberValidationResult {
    const cleaned = accountNumber.trim().replace(/\s/g, '')

    if (!cleaned) {
      return {
        isValid: false,
        error: 'Account number is required'
      }
    }

    if (!this.ACCOUNT_NUMBER_REGEX.test(cleaned)) {
      return {
        isValid: false,
        error: 'Account number must be exactly 10 digits'
      }
    }

    return {
      isValid: true,
      formatted: cleaned
    }
  }
}

/**
 * Document file validation
 */
export interface FileValidationResult {
  isValid: boolean
  error?: string
  size?: number
  type?: string
}

export class DocumentValidationService {
  // Allowed file types for ID documents
  private static readonly ALLOWED_DOCUMENT_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
  
  // Allowed file types for photos
  private static readonly ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/jpg', 'image/png']
  
  // Max file size: 10MB for documents
  private static readonly MAX_DOCUMENT_SIZE = 10 * 1024 * 1024 // 10MB
  
  // Max file size: 5MB for photos
  private static readonly MAX_PHOTO_SIZE = 5 * 1024 * 1024 // 5MB

  /**
   * Validate document file (ID card, address proof)
   * Requirements: 4.2, 22.1, 22.2
   */
  public static validateDocument(file: { type: string; size: number; name: string }): FileValidationResult {
    // Check file type
    if (!this.ALLOWED_DOCUMENT_TYPES.includes(file.type.toLowerCase())) {
      return {
        isValid: false,
        error: 'Only JPEG, PNG, and PDF files are allowed for documents'
      }
    }

    // Check file size
    if (file.size > this.MAX_DOCUMENT_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
      return {
        isValid: false,
        error: `File size (${sizeMB}MB) exceeds maximum of 10MB`
      }
    }

    return {
      isValid: true,
      size: file.size,
      type: file.type
    }
  }

  /**
   * Validate photo file (job photos, progress photos)
   * Requirements: 5.5, 22.1, 22.2
   */
  public static validatePhoto(file: { type: string; size: number; name: string }): FileValidationResult {
    // Check file type
    if (!this.ALLOWED_PHOTO_TYPES.includes(file.type.toLowerCase())) {
      return {
        isValid: false,
        error: 'Only JPEG and PNG images are allowed'
      }
    }

    // Check file size
    if (file.size > this.MAX_PHOTO_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
      return {
        isValid: false,
        error: `Photo size (${sizeMB}MB) exceeds maximum of 5MB`
      }
    }

    return {
      isValid: true,
      size: file.size,
      type: file.type
    }
  }

  /**
   * Get file extension from filename
   */
  public static getFileExtension(filename: string): string {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase()
  }

  /**
   * Generate safe filename for storage
   */
  public static generateSafeFilename(originalName: string, userId: string): string {
    const extension = this.getFileExtension(originalName)
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `${userId}_${timestamp}_${random}.${extension}`
  }
}
