/** Two test suites:
 *  - app: React Native code (jest-expo)
 *  - db:  the real database schema on a throwaway Postgres (needs no Supabase project)
 */
module.exports = {
  testTimeout: 30000,
  projects: [
    {
      displayName: 'app',
      preset: 'jest-expo',
      roots: ['<rootDir>/__tests__'],
      testMatch: ['**/*.test.ts', '**/*.test.tsx'],
      setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
    },
    {
      displayName: 'db',
      testEnvironment: 'node',
      roots: ['<rootDir>/database/test'],
      testMatch: ['**/*.test.ts'],
      transform: { '^.+\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
      globalSetup: '<rootDir>/database/test/globalSetup.js',
      globalTeardown: '<rootDir>/database/test/globalTeardown.js',
    },
  ],
}
