// Test user fixtures for development and demo mode
// These are pre-registered test accounts that users can login with immediately

import { isTestPhoneNumber } from './phone-auth'

export const TEST_USER_FIXTURES = {
  '+2348066025051': {
    phone: '+2348066025051',
    role: 'customer' as const,
    fullName: 'John Customer',
    isVerified: true,
    otp: '123456'
  },
  '+2348012345678': {
    phone: '+2348012345678',
    role: 'technician' as const,
    fullName: 'Mike Technician',
    isVerified: true,
    otp: '654321'
  },
  '+2348098765432': {
    phone: '+2348098765432',
    role: 'technician' as const,
    fullName: 'Fresh Technician',
    isVerified: false,
    otp: '111222'
  }
}

/**
 * Seeds test user data to AsyncStorage for demo/development
 * This enables returning user detection for test numbers
 */
export async function seedTestUserToStorage(phone: string): Promise<boolean> {
  if (!isTestPhoneNumber(phone)) {
    return false
  }

  const fixture = TEST_USER_FIXTURES[phone as keyof typeof TEST_USER_FIXTURES]
  if (!fixture) {
    return false
  }

  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default
    
    // Store user info for returning user detection
    await Promise.all([
      AsyncStorage.setItem('@urbanfix_dev_phone', fixture.phone),
      AsyncStorage.setItem('@urbanfix_dev_role', fixture.role),
      AsyncStorage.setItem('@urbanfix_dev_fullname', fixture.fullName),
      AsyncStorage.setItem('@urbanfix_dev_isverified', JSON.stringify(fixture.isVerified))
    ])

    console.log('✅ [Test Fixtures] Seeded test user to storage:', fixture.phone, fixture.role)
    return true
  } catch (error) {
    console.error('❌ [Test Fixtures] Failed to seed test user:', error)
    return false
  }
}

/**
 * Gets test user fixture data for a phone number
 */
export function getTestUserFixture(phone: string) {
  return TEST_USER_FIXTURES[phone as keyof typeof TEST_USER_FIXTURES]
}

/**
 * Initializes test users on app startup
 * Pre-seeds common test numbers so they're recognized as returning users
 */
export async function initializeTestFixtures(): Promise<void> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default
    
    // Check if test fixtures are already seeded
    const isSeed = await AsyncStorage.getItem('@urbanfix_test_fixtures_seeded')
    if (isSeed) {
      console.log('✅ [Test Fixtures] Already seeded')
      return
    }

    // Seed the primary test user (customer)
    await seedTestUserToStorage('+2348066025051')
    
    // Mark as seeded
    await AsyncStorage.setItem('@urbanfix_test_fixtures_seeded', 'true')
    console.log('✅ [Test Fixtures] Initialization complete')
  } catch (error) {
    console.error('❌ [Test Fixtures] Initialization failed:', error)
  }
}
