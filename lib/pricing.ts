// Fee preview for technicians: reads the live fee settings, falls back to defaults.
import { DEFAULT_FEES, type FeeSettings } from './fees'
import { supabase } from './supabase'

export { DEFAULT_FEES, platformFee, type FeeSettings } from './fees'

export async function getFeeSettings(): Promise<FeeSettings> {
  const { data, error } = await supabase.from('settings')
    .select('fee_base_kobo, fee_rate_bps, fee_cap_kobo, fee_round_kobo, repeat_fee_discount_bps').eq('id', 1).maybeSingle()
  if (error || !data) return DEFAULT_FEES
  return data as FeeSettings
}
