// Design system constants based on UrbanFix Design Specification
// Following Engineering Guide Section 4.2 - Theme Constants

export const colors = {
  // Primary colors - Deep Trust Blue
  primary: "#031636",
  primaryLight: "#1A2B4C",
  primaryContainer: "#1A2B4C",
  onPrimary: "#ffffff",
  onPrimaryContainer: "#8293ba",
  inversePrimary: "#b6c6f0",

  // Secondary colors - Emergency Orange
  secondary: "#ff5722",
  secondaryLight: "#ff7a45",
  secondaryContainer: "#ffe1d1",
  onSecondary: "#ffffff",
  onSecondaryContainer: "#541100",

  // Tertiary colors - Success Green
  tertiary: "#001c09",
  tertiaryLight: "#2ecc71",
  tertiaryContainer: "#003316",
  onTertiary: "#ffffff",
  onTertiaryContainer: "#00a858",

  // Surface colors
  surface: "#ffffff",
  surfaceDim: "#d7dadc",
  surfaceBright: "#f7fafc",
  surfaceContainer: "#ebeef0",
  surfaceContainerLow: "#f1f4f6",
  surfaceContainerHigh: "#e5e9eb",
  surfaceContainerHighest: "#e0e3e5",
  surfaceContainerLowest: "#ffffff",
  onSurface: "#181c1e",
  onSurfaceVariant: "#44474e",
  surfaceVariant: "#e0e3e5",
  surfaceTint: "#4e5e82",

  // Background colors
  background: "#f7fafc", // Soft Gray
  onBackground: "#181c1e",

  // Status colors
  success: "#2ecc71",
  warning: "#e0a030",
  error: "#ba1a1a",
  onError: "#ffffff",
  errorContainer: "#ffdad6",
  onErrorContainer: "#93000a",

  // Text colors
  text: {
    primary: "#181c1e",
    secondary: "#44474e",
    disabled: "#75777f",
    inverse: "#ffffff",
  },

  // Border and outline colors
  border: "#e5e9eb",
  outline: "#75777f",
  outlineVariant: "#c5c6cf",

  // Inverse colors
  inverseSurface: "#2d3133",
  inverseOnSurface: "#eef1f3",
} as const;

// 8px base unit - only use values from this map (Engineering Guide requirement)
export const spacing = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 40,
  xxl: 48,
  xxxl: 64,

  // Semantic spacing names
  unit: 8,
  gutter: 16,
  margin: 24,

  // Numbered spacing (Engineering Guide format)
  1: 8,
  2: 16,
  3: 24,
  4: 32,
  5: 40,
  6: 48,
  7: 56,
  8: 64,
} as const;

// Typography system using Inter font family
export const typography = {
  // Display styles
  displayLg: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700" as const,
    letterSpacing: -0.02,
  },

  // Headline styles
  headlineMd: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600" as const,
    letterSpacing: -0.01,
  },
  headlineSm: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600" as const,
  },

  // Body text styles
  bodyLg: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  bodyMd: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },

  // Label styles
  labelMd: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500" as const,
    letterSpacing: 0.05,
  },

  // Button text
  buttonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600" as const,
  },

  // Engineering Guide format (legacy compatibility)
  heading1: { fontSize: 24, lineHeight: 32, fontFamily: "Inter_700Bold" },
  heading2: { fontSize: 20, lineHeight: 28, fontFamily: "Inter_600SemiBold" },
  body: { fontSize: 16, lineHeight: 24, fontFamily: "Inter_400Regular" },
  caption: { fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular" },
  micro: { fontSize: 12, lineHeight: 16, fontFamily: "Inter_400Regular" },
} as const;

// Border radius values
export const radius = {
  sm: 4, // 0.25rem
  md: 8, // 0.5rem (base radius)
  lg: 12, // 0.75rem
  xl: 16, // 1rem
  xxl: 24, // 1.5rem
  full: 999, // Fully rounded

  // Engineering Guide format
  base: 8,
} as const;

// Elevation/Shadow system
export const shadows = {
  level1: {
    shadowColor: "#031636",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2, // Android
  },
  level2: {
    shadowColor: "#031636",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4, // Android
  },
  level3: {
    shadowColor: "#031636",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8, // Android
  },
} as const;

export const elevation = {
  low: 2,
  medium: 4,
  high: 8,
} as const;

// Animation durations
export const animations = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const;

// Touch target sizes (accessibility compliance)
export const touchTargets = {
  minSize: 44, // Minimum touch target size for accessibility
  buttonHeight: 56,
  inputHeight: 56,
} as const;
