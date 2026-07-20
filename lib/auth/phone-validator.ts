// Phone Number Validator
// Validates Nigerian phone numbers in +234XXXXXXXXXX format

/**
 * Result of phone validation
 */
export interface PhoneValidationResult {
  isValid: boolean
  formatted?: string
  error?: string
}

/**
 * Phone Validator Service
 * Handles Nigerian phone number validation and formatting
 */
export class PhoneValidator {
  // Nigerian phone number pattern: +234 followed by 10 digits
  private readonly NIGERIAN_PHONE_REGEX = /^\+234[0-9]{10}$/

  /**
   * Validates and formats a phone number
   */
  public validate(phone: string): PhoneValidationResult {
    if (!phone) {
      return {
        isValid: false,
        error: 'Phone number is required'
      }
    }

    // Clean the input (remove spaces, dashes, etc.)
    const cleaned = this.cleanPhoneNumber(phone)

    // Format to international standard
    const formatted = this.formatToInternational(cleaned)

    if (!formatted) {
      return {
        isValid: false,
        error: 'Invalid phone number format. Use Nigerian number (e.g., +2348012345678)'
      }
    }

    // Validate against regex
    if (!this.NIGERIAN_PHONE_REGEX.test(formatted)) {
      return {
        isValid: false,
        error: 'Please enter a valid Nigerian phone number'
      }
    }

    return {
      isValid: true,
      formatted
    }
  }

  /**
   * Checks if a phone number is from Nigeria
   */
  public isNigerian(phone: string): boolean {
    const cleaned = this.cleanPhoneNumber(phone)
    const formatted = this.formatToInternational(cleaned)
    return formatted ? this.NIGERIAN_PHONE_REGEX.test(formatted) : false
  }

  /**
   * Formats a phone number to +234XXXXXXXXXX format
   */
  public format(phone: string): string | null {
    const cleaned = this.cleanPhoneNumber(phone)
    return this.formatToInternational(cleaned)
  }

  /**
   * Removes common phone number formatting characters
   */
  private cleanPhoneNumber(phone: string): string {
    return phone
      .trim()
      .replace(/[\s\-().]/g, '') // Remove spaces, dashes, parentheses
      .replace(/^0/, '') // Remove leading 0
  }

  /**
   * Converts various formats to +234XXXXXXXXXX
   * Handles:
   * - 08012345678 → +2348012345678
   * - 2348012345678 → +2348012345678
   * - +2348012345678 → +2348012345678
   * - +234 80 1234 5678 → +2348012345678
   */
  private formatToInternational(phone: string): string | null {
    const cleaned = phone.replace(/[\s\-().]/g, '')

    // Already in +234 format
    if (cleaned.startsWith('+234')) {
      const number = cleaned.substring(4)
      if (/^[0-9]{10}$/.test(number)) {
        return `+234${number}`
      }
      return null
    }

    // Starts with 234 (no plus)
    if (cleaned.startsWith('234')) {
      const number = cleaned.substring(3)
      if (/^[0-9]{10}$/.test(number)) {
        return `+234${number}`
      }
      return null
    }

    // Starts with 08 or 07 or 09 or 01
    if (/^0[789][0-9]{9}$/.test(cleaned)) {
      return `+234${cleaned.substring(1)}`
    }

    // Just 10 digits (assuming Nigerian)
    if (/^[0-9]{10}$/.test(cleaned)) {
      return `+234${cleaned}`
    }

    return null
  }

  /**
   * Get user-friendly phone number format for display
   * e.g., +234 801 234 5678
   */
  public formatForDisplay(phone: string): string {
    const formatted = this.format(phone)
    if (!formatted) return phone

    // Format as +234 XXX XXX XXXX
    return `${formatted.slice(0, 4)} ${formatted.slice(4, 7)} ${formatted.slice(7, 10)} ${formatted.slice(10)}`
  }

  /**
   * Extract just the digits from a phone number
   */
  public getDigits(phone: string): string {
    return phone.replace(/[^0-9]/g, '')
  }

  /**
   * Get country code from phone number
   */
  public getCountryCode(phone: string): string {
    const formatted = this.format(phone)
    return formatted ? formatted.slice(0, 4) : '+234'
  }

  /**
   * Get national number (without country code)
   */
  public getNationalNumber(phone: string): string {
    const formatted = this.format(phone)
    return formatted ? formatted.slice(4) : ''
  }
}

// Export singleton instance
export const phoneValidator = new PhoneValidator()
