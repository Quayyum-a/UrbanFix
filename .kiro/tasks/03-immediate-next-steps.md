# UrbanFix Immediate Next Steps
*Ready-to-execute tasks for immediate development start*

## Current Status ✅

### Completed Foundation
- [x] Project structure and configuration
- [x] TypeScript setup with strict mode
- [x] Design system constants and theme
- [x] Basic UI component library
- [x] Supabase client configuration
- [x] Environment variable setup
- [x] Component organization (moved to match Engineering Guide)

## Immediate Action Items (Next 7 Days)

### Day 1-2: Database Schema Implementation
**Priority**: 🔴 Critical - Blocking all backend development

#### Task DB-001: Core Database Tables
```sql
-- Execute these SQL commands in Supabase SQL Editor
```

**Instructions**:
1. Open Supabase SQL Editor
2. Create migration file `20240101_initial_schema.sql`
3. Execute table creation commands from `/design/02-database-design.md`
4. Verify tables created successfully
5. Test basic CRUD operations

**Files to create**:
- `supabase/migrations/20240101_initial_schema.sql`
- `types/database.types.ts` (regenerate from Supabase)

**Command to generate types**:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.types.ts
```

#### Task DB-002: Row Level Security Setup
**Duration**: 4 hours
**Dependencies**: DB-001 complete

1. Enable RLS on all tables
2. Create authentication policies
3. Test policy enforcement
4. Document security rules

### Day 3: Missing Hook Implementation
**Priority**: 🟡 High - Required for data fetching patterns

#### Task HOOKS-001: Create Data Fetching Hooks
**Files to create**:

1. `hooks/useJob.ts` - Single job management
2. `hooks/useJobs.ts` - Job listing and filtering  
3. `hooks/useTechnicianProfile.ts` - Technician data management
4. `hooks/useMessages.ts` - Real-time chat functionality
5. `hooks/usePartsCatalogue.ts` - Parts pricing data
6. `hooks/usePayment.ts` - Payment flow management

**Template for each hook**:
```typescript
// Example: hooks/useJobs.ts
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type Job = Database['public']['Tables']['jobs']['Row']

export function useJobs(customerId: string) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchJobs() {
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })

        if (error) throw error
        setJobs(data ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchJobs()
  }, [customerId])

  return { jobs, loading, error, refetch: fetchJobs }
}
```

### Day 4: Missing Screen Components
**Priority**: 🟡 High - Required for complex UI flows

#### Task SCREENS-001: Create Screen-Specific Components
**Files to create**:

1. `components/screens/JobTimeline.tsx` - Job progress visualization
2. `components/screens/ChatThread.tsx` - Message thread component
3. `components/screens/PhotoUploader.tsx` - Multi-image upload
4. `components/screens/AddressPicker.tsx` - Location selection

**Example implementation**:
```typescript
// components/screens/JobTimeline.tsx
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, typography, spacing } from '@/constants/theme'

interface JobTimelineProps {
  jobId: string
  currentStatus: string
}

export function JobTimeline({ jobId, currentStatus }: JobTimelineProps) {
  const statusSteps = [
    'booked', 'paid', 'pickup_scheduled', 
    'device_received', 'repair_started', 
    'awaiting_release', 'complete'
  ]
  
  return (
    <View style={styles.container}>
      {statusSteps.map((step, index) => (
        <View key={step} style={styles.step}>
          {/* Timeline implementation */}
        </View>
      ))}
    </View>
  )
}
```

### Day 5: Missing Lib Files
**Priority**: 🟡 High - Required for external integrations

#### Task LIB-001: Create Integration Libraries
**Files to create**:

1. `lib/paystack.ts` - Payment processing wrapper
2. `lib/maps.ts` - Google Maps integration helpers

**Example implementation**:
```typescript
// lib/paystack.ts
import { Paystack } from 'react-native-paystack-webview'

interface PaymentConfig {
  email: string
  amount: number // in kobo
  reference: string
}

export class PaystackService {
  private publicKey: string

  constructor() {
    this.publicKey = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY!
    if (!this.publicKey) {
      throw new Error('Paystack public key not configured')
    }
  }

  async initializePayment(config: PaymentConfig) {
    // Implementation
  }

  async verifyPayment(reference: string) {
    // Implementation
  }
}

export const paystack = new PaystackService()
```

### Day 6-7: First Screen Implementation
**Priority**: 🟢 Medium - Start building user-facing features

#### Task SCREENS-002: Implement Authentication Screens

**Files to create/update**:
1. `app/(auth)/_layout.tsx` - Auth stack layout
2. `app/(auth)/phone.tsx` - Phone input screen
3. `app/(auth)/otp.tsx` - OTP verification
4. `app/(auth)/role.tsx` - Role selection
5. `app/(auth)/profile.tsx` - Profile setup

**Example screen implementation**:
```typescript
// app/(auth)/phone.tsx
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { Input, Button, Card } from '@/components/ui'
import { colors, spacing, typography } from '@/constants/theme'

const phoneSchema = z.object({
  phone: z.string().regex(/^\+234[0-9]{10}$/, 'Enter valid Nigerian number')
})

type PhoneForm = z.infer<typeof phoneSchema>

export default function PhoneLoginScreen() {
  const router = useRouter()
  const { control, handleSubmit, formState: { errors } } = useForm<PhoneForm>({
    resolver: zodResolver(phoneSchema)
  })

  const onSubmit = async (data: PhoneForm) => {
    // Send OTP logic
    router.push('/otp')
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter your phone number</Text>
      <Input
        label="Phone Number"
        placeholder="+234 801 234 5678"
        // Add form control props
      />
      <Button 
        title="Send OTP" 
        onPress={handleSubmit(onSubmit)}
      />
    </View>
  )
}
```

## Development Workflow Setup

### Day 1: Development Process
1. **Create development branch**: `git checkout -b feature/database-setup`
2. **Daily commits**: Commit working code daily with descriptive messages
3. **Code review process**: Create PR for each major feature
4. **Testing strategy**: Write tests alongside features

### Environment Management
```bash
# Development commands
npm run start          # Start Expo development server
npm run test          # Run Jest tests  
npm run lint          # Check code quality
npm run type-check    # TypeScript validation

# Database commands (after Supabase CLI setup)
npx supabase start    # Start local Supabase
npx supabase db reset # Reset with migrations
npx supabase gen types # Regenerate TypeScript types
```

## Critical Decisions Needed

### Decision Points (Require immediate input)
1. **SMS Provider**: Choose between Twilio, local Nigerian provider, or Supabase Auth SMS
2. **Push Notifications**: Confirm Expo Push vs Firebase setup
3. **Image Storage**: Supabase Storage vs Cloudinary for optimization
4. **Maps Provider**: Google Maps vs alternative (cost considerations)

### Technical Debt Prevention
1. **Type Safety**: Maintain strict TypeScript throughout
2. **Testing**: Start testing from Day 3 onwards  
3. **Documentation**: Update README with setup instructions
4. **Performance**: Profile and optimize as features are built

## Success Criteria for Week 1

### Must Have (Critical)
- [ ] Database schema fully implemented and tested
- [ ] Authentication system working end-to-end
- [ ] Basic data fetching hooks functional
- [ ] First authentication screen rendering correctly

### Should Have (Important) 
- [ ] All missing hooks implemented
- [ ] Screen components created (even if basic)
- [ ] External service integration started
- [ ] Test framework setup begun

### Could Have (Nice to have)
- [ ] Admin panel planning started
- [ ] Performance monitoring setup
- [ ] Documentation improvements
- [ ] Design system refinements

## Next Week Preview

### Week 2 Focus: Customer Booking Flow
- Complete authentication screens and flow
- Start device selection and repair category screens
- Implement photo upload functionality
- Begin technician discovery system
- Setup real-time communication foundation

### Key Milestones
- **Day 8**: Authentication flow complete
- **Day 10**: Device selection working
- **Day 12**: Photo upload functional  
- **Day 14**: Basic job creation working

## Resources & Support

### Documentation References
- [Supabase Docs](https://supabase.com/docs)
- [Expo Router Guide](https://docs.expo.dev/router/introduction/)
- [React Hook Form](https://react-hook-form.com/get-started)
- [Engineering Guide](/Urbanfix%20Engineering%20Guide.md)

### Contact Points
- **Technical Questions**: Lead Developer
- **Design Questions**: UI/UX Designer  
- **Business Logic**: Product Manager
- **Infrastructure**: DevOps Engineer

---

**📋 Action Required**: Review and confirm these immediate next steps, then begin execution starting with Task DB-001.