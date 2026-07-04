// Currency, date, and phone formatting utilities as specified in Engineering Guide

/**
 * Format monetary values from kobo (integers) to Naira display format
 * All monetary values are stored in kobo as per Engineering Guide Section 4.5
 */
export function formatNaira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString('en-NG')}`
}

/**
 * Format phone numbers to Nigerian +234 format
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')
  
  // Handle different input formats
  if (digits.startsWith('234')) {
    return `+${digits}`
  } else if (digits.startsWith('0')) {
    return `+234${digits.slice(1)}`
  } else if (digits.length === 10) {
    return `+234${digits}`
  }
  
  return phone // Return original if format not recognized
}

/**
 * Validate Nigerian phone number format
 */
export function isValidNigerianPhone(phone: string): boolean {
  const phoneRegex = /^\+234[0-9]{10}$/
  return phoneRegex.test(phone)
}

/**
 * Format date to human readable format
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }
  
  return dateObj.toLocaleDateString('en-NG', defaultOptions)
}

/**
 * Format date and time
 */
export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  return dateObj.toLocaleString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return 'Just now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} day${days > 1 ? 's' : ''} ago`
  } else {
    return formatDate(dateObj)
  }
}

/**
 * Format duration in hours to human readable format
 */
export function formatDuration(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)} minutes`
  } else if (hours === 1) {
    return '1 hour'
  } else if (hours < 24) {
    return `${hours} hours`
  } else {
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    
    if (remainingHours === 0) {
      return `${days} day${days > 1 ? 's' : ''}`
    } else {
      return `${days} day${days > 1 ? 's' : ''} ${remainingHours} hour${remainingHours > 1 ? 's' : ''}`
    }
  }
}