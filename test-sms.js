/**
 * Simple test script to verify SMS authentication
 * Run with: node test-sms.js
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testSendOTP() {
  const phone = '+2348066025051'
  
  console.log('📱 Testing SMS OTP...')
  console.log(`Phone: ${phone}\n`)

  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      phone: phone,
      options: {
        shouldCreateUser: true,
      }
    })

    if (error) {
      console.error('❌ Error:', error.message)
      console.log('\n⚠️  TWILIO CONFIGURATION NEEDED IN SUPABASE DASHBOARD')
      console.log('\nSteps to configure:')
      console.log('1. Go to: https://app.supabase.com')
      console.log('2. Select your project: lebgmhdfmndvlxayzyhs')
      console.log('3. Navigate to: Authentication → Providers')
      console.log('4. Enable "Phone" provider')
      console.log('5. Go to: Project Settings → Auth')
      console.log('6. Configure Twilio with these credentials:')
      console.log(`   Account SID: ${process.env.TWILIO_ACCOUNT_SID}`)
      console.log(`   Auth Token: ${process.env.TWILIO_AUTH_TOKEN}`)
      console.log(`   Message Service SID: ${process.env.TWILIO_MESSAGE_SERVICE_SID}`)
      return
    }

    console.log('✅ OTP sent successfully!')
    console.log('📬 Check phone +2348066025051 for the code')
  } catch (err) {
    console.error('❌ Error:', err.message)
  }
}

testSendOTP()
