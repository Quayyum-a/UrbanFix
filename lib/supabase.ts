import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { AppState, Platform } from 'react-native'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

/** False when .env is missing; the app shows setup instructions instead of crashing. */
export const isConfigured = /^https:\/\/.+/.test(url) && anonKey.length > 20

export const supabase: SupabaseClient = createClient(
  isConfigured ? url : 'https://not-configured.supabase.co',
  isConfigured ? anonKey : 'not-configured',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
)

// Refresh the session only while the app is in the foreground (Supabase's RN guidance).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh()
    else supabase.auth.stopAutoRefresh()
  })
}
