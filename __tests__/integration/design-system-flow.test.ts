// Integration Tests for Design System Token Consistency
// Validates that design tokens in constants/theme.ts are internally consistent
// No mocking needed — imports directly from the theme module

import { colors, spacing, typography, animations, touchTargets } from '@/constants/theme'

// ── Contrast ratio helper ────────────────────────────────────────────────────

/**
 * Parse a hex color string to relative luminance (WCAG formula).
 */
function hexToLuminance(hex: string): number {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

/**
 * WCAG contrast ratio between two hex colors.
 */
function contrastRatio(hex1: string, hex2: string): number {
  const l1 = hexToLuminance(hex1)
  const l2 = hexToLuminance(hex2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Design System Integration', () => {

  // ── Color token usage ──────────────────────────────────────────────────────

  describe('Color token usage', () => {
    it('primary color (#031636) matches theme.colors.primary', () => {
      expect(colors.primary).toBe('#031636')
    })

    it('secondary color (#FF5722) matches theme.colors.secondary (case-insensitive)', () => {
      expect(colors.secondary.toLowerCase()).toBe('#ff5722')
    })

    it('error status color has sufficient contrast ratio against white (WCAG AA)', () => {
      // error (#ba1a1a) is used on white backgrounds for critical alerts
      const ratio = contrastRatio(colors.error, '#ffffff')
      expect(ratio).toBeGreaterThanOrEqual(4.5)
    })

    it('all status colors have a positive (non-zero) contrast ratio', () => {
      const white = '#ffffff'
      const statusColors: Record<string, string> = {
        success: colors.success,
        warning: colors.warning,
        error: colors.error,
      }

      for (const [_name, color] of Object.entries(statusColors)) {
        const ratio = contrastRatio(color, white)
        // Each color must at least be distinguishable from white
        expect(ratio).toBeGreaterThan(1)
      }
    })

    it('primary and onPrimary have sufficient contrast', () => {
      const ratio = contrastRatio(colors.primary, colors.onPrimary)
      // WCAG AA: 4.5:1 for normal text
      expect(ratio).toBeGreaterThanOrEqual(4.5)
    })

    it('error and onError have sufficient contrast', () => {
      const ratio = contrastRatio(colors.error, colors.onError)
      expect(ratio).toBeGreaterThanOrEqual(4.5)
    })
  })

  // ── Spacing system ─────────────────────────────────────────────────────────

  describe('Spacing system', () => {
    it('all named spacing values are multiples of 8', () => {
      const namedValues = [
        spacing.xs,
        spacing.sm,
        spacing.md,
        spacing.lg,
        spacing.xl,
        spacing.xxl,
        spacing.xxxl,
        spacing.unit,
        spacing.gutter,
        spacing.margin,
      ]

      for (const value of namedValues) {
        expect(value % 8).toBe(0)
      }
    })

    it('numbered spacing keys are multiples of 8', () => {
      const numberedKeys = [1, 2, 3, 4, 5, 6, 7, 8] as const
      for (const key of numberedKeys) {
        expect(spacing[key] % 8).toBe(0)
      }
    })

    it('touchTargets.minSize is >= 44 (WCAG accessibility requirement)', () => {
      expect(touchTargets.minSize).toBeGreaterThanOrEqual(44)
    })

    it('all spacing values are positive', () => {
      const allValues = [
        spacing.xs, spacing.sm, spacing.md, spacing.lg,
        spacing.xl, spacing.xxl, spacing.xxxl,
      ]
      for (const value of allValues) {
        expect(value).toBeGreaterThan(0)
      }
    })
  })

  // ── Typography scale ───────────────────────────────────────────────────────

  describe('Typography scale', () => {
    const allTypographyEntries = Object.entries(typography) as Array<
      [string, { fontSize: number; lineHeight: number; fontFamily?: string; fontWeight?: string }]
    >

    it('all font sizes are positive integers', () => {
      for (const [name, style] of allTypographyEntries) {
        expect(style.fontSize).toBeGreaterThan(0)
        expect(Number.isInteger(style.fontSize)).toBe(true)
      }
    })

    it('line heights are >= font sizes (for readability)', () => {
      for (const [name, style] of allTypographyEntries) {
        expect(style.lineHeight).toBeGreaterThanOrEqual(style.fontSize)
      }
    })

    it('buttonText font size is >= 14 (accessibility)', () => {
      expect(typography.buttonText.fontSize).toBeGreaterThanOrEqual(14)
    })

    it('display size is larger than body size', () => {
      expect(typography.displayLg.fontSize).toBeGreaterThan(typography.bodyLg.fontSize)
    })

    it('heading sizes decrease from headlineMd to headlineSm', () => {
      expect(typography.headlineMd.fontSize).toBeGreaterThanOrEqual(
        typography.headlineSm.fontSize
      )
    })
  })

  // ── Animation timings ──────────────────────────────────────────────────────

  describe('Animation timings', () => {
    it('fast animation < normal animation', () => {
      expect(animations.fast).toBeLessThan(animations.normal)
    })

    it('normal animation <= 300ms (spec requirement)', () => {
      expect(animations.normal).toBeLessThanOrEqual(300)
    })

    it('slow animation > normal animation', () => {
      expect(animations.slow).toBeGreaterThan(animations.normal)
    })

    it('all animation values are positive', () => {
      expect(animations.fast).toBeGreaterThan(0)
      expect(animations.normal).toBeGreaterThan(0)
      expect(animations.slow).toBeGreaterThan(0)
    })
  })
})
