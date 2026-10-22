// Shared mocks for app tests: no real Supabase, router or native modules.
import React from 'react'

jest.mock('@/lib/supabase', () => ({
  isConfigured: true,
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(),
    auth: {
      signInWithPassword: jest.fn(), signUp: jest.fn(), signOut: jest.fn(), getUser: jest.fn(), getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    storage: { from: jest.fn() },
  },
}))

// Icons load a font asynchronously; render a plain placeholder in tests.
jest.mock('@expo/vector-icons', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react')
  const Icon = ({ name }: { name: string }) => R.createElement('Text', null, `icon:${name}`)
  Icon.glyphMap = {}
  return { Ionicons: Icon }
})
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()), notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' }, NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}))
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'))
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(), getLastKnownPositionAsync: jest.fn(), getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(), Accuracy: { Balanced: 3 },
}))
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }))

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn() }
let mockParams: Record<string, string> = {}
;(globalThis as any).__setParams = (p: Record<string, string>) => { mockParams = p }
;(globalThis as any).__router = mockRouter

jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react')
  return {
    router: mockRouter,
    useRouter: () => mockRouter,
    useLocalSearchParams: () => mockParams,
    useFocusEffect: (cb: () => void | (() => void)) => R.useEffect(cb, [cb]),
    Redirect: ({ href }: { href: string }) => R.createElement('Text', { testID: 'redirect' }, `redirect:${href}`),
    Stack: Object.assign(() => null, { Screen: () => null }),
  }
})

afterEach(() => {
  jest.clearAllMocks()
  // Caches live for the whole app session; each test starts fresh.
  /* eslint-disable @typescript-eslint/no-require-imports */
  require('@/lib/jobCache').forgetJobs()
  require('@/lib/useTechnician').forgetTechnician()
  require('@/lib/live').useLive.getState().reset()
  /* eslint-enable @typescript-eslint/no-require-imports */
})

export {}
void React
