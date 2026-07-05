/**
 * Test script to verify SMS authentication with Supabase
 * Run with: npx ts-node scripts/test-sms.ts
 */

import { createClient } from '@supabase/supabase-js'

// Load environment variables
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env file')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testSendOTP(phone: string) {
  console.log('📱 Testing SMS OTP with Supabase...')
  console.log(`Phone: ${phone}`)
  console.log('---')

  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      phone: phone,
      options: {
        shouldCreateUser: true,
      }
    })

    if (error) {
      console.error('❌ Error sending OTP:', error.message)
      console.error('Error details:', error)
      
      // Check for common issues
      if (error.message.includes('SMS')) {
        console.log('\n⚠️  SMS Provider Issue Detected')
        console.log('Twilio needs to be configured in Supabase Dashboard:')
        console.log('1. Go to https://app.supabase.com')
        console.log('2. Select your project')
        console.log('3. Navigate to: Authentication → Providers')
        console.log('4. Enable "Phone" provider')
        console.log('5. Go to: Project Settings → Auth')
        console.log('6. Scroll to "Phone Auth" section')
        console.log('7. Add your Twilio credentials:')
        console.log(`   - Account SID: ${process.env.TWILIO_ACCOUNT_SID || 'Not set'}`)
        console.log(`   - Auth Token: ${process.env.TWILIO_AUTH_TOKEN || 'Not set'}`)
        console.log(`   - Message Service SID: ${process.env.TWILIO_MESSAGE_SERVICE_SID || 'Not set'}`)
      }
      
      return false
    }

    console.log('✅ OTP sent successfully!')
    console.log('Data:', data)
    console.log('\n📬 Check your phone for the verification code')
    console.log('The code should arrive within 30 seconds')
    
    return true
  } catch (err) {
    console.error('❌ Unexpected error:', err)
    return false
  }
}

async function testVerifyOTP(phone: string, token: string) {
  console.log('\n🔐 Testing OTP Verification...')
  console.log(`Phone: ${phone}`)
  console.log(`Token: ${token}`)
  console.log('---')

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: phone,
      token: token,
      type: 'sms'
    })

    if (error) {
      console.error('❌ Error verifying OTP:', error.message)
      return false
    }

    console.log('✅ OTP verified successfully!')
    console.log('Session:', data.session ? 'Created' : 'Not created')
    console.log('User ID:', data.user?.id)
    
    return true
  } catch (err) {
    console.error('❌ Unexpected error:', err)
    return false
  }
}

// Main test flow
async function main() {
  const testPhone = '+2348066025051' // Your test number
  
  console.log('🚀 UrbanFix SMS Authentication Test\n')
  
  // Test sending OTP
  const sendSuccess = await testSendOTP(testPhone)
  
  if (sendSuccess) {
    console.log('\n✨ Test completed!')
    console.log('\nNext steps:')
    console.log('1. Check your phone for the verification code')
    console.log('2. Enter the code in the app to complete authentication')
    console.log('3. If you want to test verification programmatically, run:')
    console.log(`   npx ts-node scripts/test-sms.ts verify ${testPhone} YOUR_CODE`)
  } else {
    console.log('\n❌ Test failed!')
    console.log('Please check the error messages above and configure Twilio in Supabase Dashboard')
  }
}

// Check if running verification test
if (process.argv[2] === 'verify') {
  const phone = process.argv[3]
  const token = process.argv[4]
  
  if (!phone || !token) {
    console.error('Usage: npx ts-node scripts/test-sms.ts verify <phone> <token>')
    process.exit(1)
  }
  
  testVerifyOTP(phone, token).then(success => {
    process.exit(success ? 0 : 1)
  })
} else {
  main().then(() => {
    process.exit(0)
  })
}
