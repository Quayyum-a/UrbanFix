module.exports = {
  projects: [
    // Project 1: Pure TypeScript tests (design-system, utilities) using ts-jest
    {
      displayName: "unit",
      testMatch: [
        "**/__tests__/design-system*.test.ts",
        "**/__tests__/unit/**/*.test.ts",
      ],
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: { strict: false } }],
      },
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/$1",
      },
      testEnvironment: "node",
    },
    // Project 2: React Native unit tests for UI components and accessibility
    {
      displayName: "component",
      preset: "react-native",
      setupFilesAfterEnv: [
        "@testing-library/jest-native/extend-expect",
        "<rootDir>/__tests__/setup.js"
      ],
      testMatch: ["**/__tests__/unit/**/*.test.tsx"],
      transform: {
        "^.+\\.(js|ts|tsx)$": [
          "babel-jest",
          { presets: ["babel-preset-expo"] },
        ],
      },
      transformIgnorePatterns: [
        "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo|@expo|@unimodules)/)",
      ],
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/$1",
      },
    },
    // Project 3: React Native integration tests using react-native preset
    {
      displayName: "react-native",
      preset: "react-native",
      setupFilesAfterEnv: ["@testing-library/jest-native/extend-expect"],
      testMatch: [
        "**/__tests__/integration/**/*.test.ts",
        "**/__tests__/integration/**/*.test.tsx",
      ],
      transform: {
        "^.+\\.(js|ts|tsx)$": [
          "babel-jest",
          { presets: ["babel-preset-expo"] },
        ],
      },
      transformIgnorePatterns: [
        "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo|@expo|@unimodules)/)",
      ],
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/$1",
      },
    },
  ],
};
