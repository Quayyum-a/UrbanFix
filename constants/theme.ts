// UrbanFix design tokens: Deep Trust Blue, Emergency Orange, Success Green.
export const colors = {
  primary: '#031636',
  primarySoft: '#E8EDF7',
  accent: '#FF5722',
  accentSoft: '#FFE9E1',
  success: '#12A150',
  successSoft: '#E3F6EA',
  warning: '#B26A00',
  warningSoft: '#FFF3DC',
  danger: '#BA1A1A',
  dangerSoft: '#FFE4E1',
  background: '#F5F7FA',
  surface: '#FFFFFF',
  border: '#E1E5EA',
  text: '#181C1E',
  textMuted: '#5A6068',
  textFaint: '#8A9098',
  onPrimary: '#FFFFFF',
} as const

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const

export const font = {
  title: { fontSize: 26, lineHeight: 32, fontWeight: '700' as const, color: colors.text },
  heading: { fontSize: 19, lineHeight: 26, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' as const, color: colors.text },
  bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: '600' as const, color: colors.text },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const, color: colors.textMuted },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' as const, color: colors.textMuted },
} as const

export const shadow = {
  shadowColor: '#031636',
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
} as const

/** Minimum touch target (accessibility). */
export const TOUCH = 48
