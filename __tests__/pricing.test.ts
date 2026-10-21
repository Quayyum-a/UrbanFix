import { DEFAULT_FEES, platformFee } from '@/lib/fees'

describe('platformFee (preview; the database is tested to use the same formula)', () => {
  test.each([
    [0, false, 150_000], [800_000, false, 200_000], [3_700_000, false, 350_000], [15_000_000, false, 900_000],
    [100_000_000, false, 1_500_000], [800_000, true, 100_000], [-500, false, 150_000],
  ])('part %d, repeat %p → %d', (part, repeat, fee) => expect(platformFee(part, repeat)).toBe(fee))

  test('grows slightly with the part price and never exceeds the cap', () => {
    let last = 0
    for (let part = 0; part <= 500_000_000; part += 1_000_000) {
      const f = platformFee(part, false)
      expect(f).toBeGreaterThanOrEqual(last)
      expect(f).toBeLessThanOrEqual(DEFAULT_FEES.fee_cap_kobo)
      expect(f % DEFAULT_FEES.fee_round_kobo).toBe(0)
      last = f
    }
  })
})
