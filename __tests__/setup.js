// Jest setup file for React Native components with mocks

// AsyncStorage mock
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve())
}))

// NetInfo mock
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true }))
}))

// Expo Location mock
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: {
    High: 4
  }
}))

// Expo Haptics mock
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Medium: 1
  }
}))

// React Native Maps mock
jest.mock('react-native-maps', () => ({
  __esModule: true,
  default: 'MapView',
  Marker: 'Marker'
}))

// Ionicons mock
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons'
}))

// Alert mock
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn()
}))

// Location service mock
jest.mock('@/lib/services', () => ({
  locationService: {
    validateNigerianAddress: jest.fn(() => ({ isValid: true })),
    calculateDistance: jest.fn(() => 1.5),
    formatDistance: jest.fn((dist) => `${dist}km`),
    reverseGeocode: jest.fn(() => Promise.resolve({
      success: true,
      address: 'Mock Address'
    }))
  }
}))

// Suppress console warnings during tests
const originalWarn = console.warn
beforeAll(() => {
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('componentWillReceiveProps') ||
        args[0].includes('componentWillUpdate') ||
        args[0].includes('Warning: Each child in a list'))
    ) {
      return
    }
    originalWarn.call(console, ...args)
  }
})

afterAll(() => {
  console.warn = originalWarn
})