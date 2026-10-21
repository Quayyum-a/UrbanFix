// UrbanFix fee formula (pure). The database computes the real amount with the
// same formula; database/test/parity.test.ts checks they match.
export interface FeeSettings {
  fee_base_kobo: number
  fee_rate_bps: number
  fee_cap_kobo: number
  fee_round_kobo: number
  repeat_fee_discount_bps: number
}

export const DEFAULT_FEES: FeeSettings = {
  fee_base_kobo: 150_000, fee_rate_bps: 500, fee_cap_kobo: 1_500_000, fee_round_kobo: 50_000, repeat_fee_discount_bps: 5000,
}

export function platformFee(partKobo: number, repeat: boolean, s: FeeSettings = DEFAULT_FEES): number {
  let v = s.fee_base_kobo + (Math.max(0, partKobo) * s.fee_rate_bps) / 10000
  if (repeat) v = (v * (10000 - s.repeat_fee_discount_bps)) / 10000
  v = Math.ceil(v / s.fee_round_kobo) * s.fee_round_kobo
  return Math.min(v, s.fee_cap_kobo)
}
