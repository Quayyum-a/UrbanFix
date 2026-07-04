# UrbanFix Platform Design Document

## Overview

UrbanFix is a mobile-first repair marketplace platform that connects customers needing device repairs with verified technicians through a managed pricing model and secure escrow payment system. The platform prioritizes trust, transparency, and operational efficiency while maintaining simplicity for MVP scale.

**Vision**: Enable seamless device repairs through verified technicians with zero pricing negotiation and protected payments.

**Key Value Propositions**:
- **Trust**: Verified technicians with ratings and reviews
- **Transparency**: Fixed part pricing with visible technician labor costs
- **Security**: Escrow payment system protecting both parties
- **Convenience**: Device pickup/delivery with real-time communication

## Architecture

### System Architecture

The platform follows a service-oriented architecture built on Supabase's Backend-as-a-Service platform, with React Native mobile apps and a Next.js admin dashboard.

```
┌─────────────────────────────────────────────────────────────┐
│                    UrbanFix Ecosystem                       │
├─────────────────────────────────────────────────────────────┤
│  Client Layer                                               │
│  ┌─────────────────┬─────────────────┬──────────────────┐  │
│  │ React Native    │ React Native    │    Next.js       │  │
│  │ Customer App    │ Technician App  │ Admin Dashboard  │  │
│  └─────────────────┴─────────────────┴──────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  Backend Services (Supabase)                               │
│  ┌─────────────────┬─────────────────┬──────────────────┐  │
│  │   PostgreSQL    │   Auth Service  │  Edge Functions  │  │
│  │   Database      │   (Phone OTP)   │ (Business Logic) │  │
│  │   + RLS         │   + JWT         │   + Webhooks     │  │
│  └─────────────────┴─────────────────┴──────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  External Services                                          │
│  ┌─────────────────┬─────────────────┬──────────────────┐  │
│  │   Paystack      │   Google Maps   │    SMS Gateway   │  │
│  │   Payments      │   Geocoding     │   Notifications  │  │
│  │   + Transfers   │   + Places      │   + OTP Delivery │  │
│  └─────────────────┴─────────────────┴──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Architecture Principles**:
- **Separation of Concerns**: Clear boundaries between presentation, business logic, and data
- **Event-Driven**: Real-time updates via Supabase realtime subscriptions
- **Stateless**: Edge Functions are stateless with database-driven state management
- **Security by Default**: Row Level Security (RLS) enforces data access at database level

### Mobile Application Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Mobile Application                        │
├─────────────────────────────────────────────────────────────┤
│  Presentation Layer (React Native + Expo)                   │
│  ┌─────────────────┬─────────────────┬──────────────────┐  │
│  │    Screens      │   Components    │   Navigation     │  │
│  │  (Route-based)  │   (UI Library)  │   (Expo Router)  │  │
│  └─────────────────┴─────────────────┴──────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  State Management Layer                                      │
│  ┌─────────────────┬─────────────────┬──────────────────┐  │
│  │   Auth Store    │ Booking Store   │  Custom Hooks    │  │
│  │   (Zustand)     │   (Zustand)     │ (Server State)   │  │
│  └─────────────────┴─────────────────┴──────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                 │
│  ┌─────────────────┬─────────────────┬──────────────────┐  │
│  │  Supabase       │   React Query   │   AsyncStorage   │  │
│  │  Client SDK     │  (Query Cache)  │ (Persistence)    │  │
│  └─────────────────┴─────────────────┴──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Key Architectural Decisions**:
- **Single Codebase**: Both customer and technician apps in one React Native codebase with role-based routing
- **Expo Platform**: Managed workflow for faster development and deployment
- **File-Based Routing**: Expo Router for predictable navigation structure
- **Type Safety**: Full TypeScript with generated database types from Supabase

## Components and Interfaces

### Core Components

#### Authentication System
- **Phone-based Authentication**: Nigerian +234 format validation with SMS OTP
- **Role Selection**: Customer/Technician role assignment during registration
- **JWT Session Management**: Automatic token refresh handled by Supabase
- **Multi-factor Security**: Phone verification + password requirement

#### User Management
- **Customer Profiles**: Name, avatar, default pickup location
- **Technician Verification**: NIN validation, bank details, shop address
- **Admin Controls**: Technician approval workflow with document review
- **Role-Based Access**: Immutable role assignment with feature gating

#### Job Management System
- **Booking Flow**: 8-step guided process from device selection to payment
- **Status Workflow**: 9-state lifecycle from booking to completion
- **Assignment Logic**: Automatic technician recommendation with manual override
- **Timeline Tracking**: Detailed status updates with timestamp logging

#### Payment and Escrow
- **Escrow Engine**: Secure payment holding until job completion
- **Paystack Integration**: Payment collection and technician payouts
- **Auto-Release**: 72-hour automatic release if customer doesn't respond
- **Dispute Resolution**: Admin-mediated resolution with flexible payment splitting

#### Communication System
- **Real-time Chat**: Per-job message threads with typing indicators
- **Push Notifications**: Critical status updates with SMS fallback
- **File Sharing**: Photo sharing for device documentation
- **Status Broadcasting**: Automatic updates to all participants

### API Interfaces

#### Supabase PostgREST API
Auto-generated RESTful API from database schema with Row Level Security:

```typescript
// Example: Customer job queries (automatically secured by RLS)
GET /rest/v1/jobs?customer_id=eq.{user_id}&select=*,technician_profiles(*)
POST /rest/v1/jobs
PATCH /rest/v1/jobs?id=eq.{job_id}

// Real-time subscriptions
const subscription = supabase
  .channel('jobs')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'jobs',
    filter: `customer_id=eq.${userId}`
  }, handleJobUpdate)
```

#### Edge Functions API
Custom business logic endpoints for operations requiring server-side processing:

**Payment Release Endpoint**
```typescript
POST /functions/v1/release-payment
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "job_id": "uuid"
}

// Response
{
  "success": true,
  "already_released": false
}
```

**Job Completion Endpoint**
```typescript
POST /functions/v1/mark-complete
Authorization: Bearer {jwt_token}

{
  "job_id": "uuid"
}
```

**Paystack Webhook Handler**
```typescript
POST /functions/v1/paystack-webhook
x-paystack-signature: {hmac_signature}

{
  "event": "charge.success",
  "data": {
    "reference": "payment_reference",
    "amount": 5000000, // kobo
    "metadata": {
      "job_id": "uuid"
    }
  }
}
```

#### External Service Interfaces

**Paystack Payment API**
```typescript
// Payment initialization
POST https://api.paystack.co/transaction/initialize
{
  "email": "customer@email.com",
  "amount": 5000000, // kobo
  "reference": "payment_uuid",
  "callback_url": "urbanfix://payment-callback"
}

// Transfer to technician
POST https://api.paystack.co/transfer
{
  "source": "balance",
  "amount": 4500000, // after commission
  "recipient": "recipient_code",
  "reason": "Job payout",
  "reference": "payout_uuid"
}
```

**Google Maps Integration**
```typescript
// Address geocoding
GET https://maps.googleapis.com/maps/api/geocode/json
?address={pickup_address}
&key={api_key}

// Place autocomplete
GET https://maps.googleapis.com/maps/api/place/autocomplete/json
?input={search_query}
&types=address
&componentRestrictions=country:ng
```

## Data Models

### Core Data Entities

#### User System
```sql
-- Base user authentication (Supabase Auth)
users (
  id UUID PRIMARY KEY,
  phone VARCHAR(15) UNIQUE NOT NULL,
  role user_role NOT NULL, -- customer | technician | admin
  full_name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Customer-specific profile data
customer_profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  location GEOMETRY(POINT), -- PostGIS for spatial queries
  address_text TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Technician verification and business data
technician_profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  nin VARCHAR(11) NOT NULL, -- National ID
  nin_doc_url TEXT, -- Supabase Storage URL
  shop_address TEXT,
  bank_name VARCHAR(100),
  bank_account_number VARCHAR(20),
  bank_account_name VARCHAR(255),
  paystack_recipient_code VARCHAR(50),
  verification_status verification_status DEFAULT 'pending',
  rejection_reason TEXT,
  is_available BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

#### Job and Transaction System
```sql
-- Core business transaction
jobs (
  id UUID PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES users(id),
  technician_id UUID REFERENCES users(id),
  
  -- Device information
  device_brand VARCHAR(100) NOT NULL,
  device_model VARCHAR(200) NOT NULL,
  repair_category VARCHAR(100) NOT NULL,
  
  -- Pricing (stored in kobo - Nigerian currency subunit)
  part_id UUID REFERENCES parts_catalogue(id),
  part_price INTEGER NOT NULL DEFAULT 0,
  labour_price INTEGER NOT NULL DEFAULT 0,
  platform_fee INTEGER NOT NULL DEFAULT 0,
  total_price INTEGER NOT NULL,
  payout_amount INTEGER NOT NULL, -- technician receives after commission
  
  -- Logistics and metadata
  photo_urls TEXT[] DEFAULT '{}',
  pickup_address TEXT NOT NULL,
  status job_status DEFAULT 'booked',
  rider_name VARCHAR(255),
  rider_phone VARCHAR(15),
  notes TEXT,
  
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
)

-- Escrow payment tracking
payments (
  id UUID PRIMARY KEY,
  job_id UUID UNIQUE NOT NULL REFERENCES jobs(id),
  amount INTEGER NOT NULL, -- kobo
  status payment_status DEFAULT 'pending',
  paystack_ref VARCHAR(100) UNIQUE,
  paystack_transfer_ref VARCHAR(100),
  escrowed_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

#### Communication and Reviews
```sql
-- Job-scoped messaging
messages (
  id UUID PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES jobs(id),
  sender_id UUID NOT NULL REFERENCES users(id),
  body TEXT NOT NULL CHECK (LENGTH(body) <= 1000),
  attachment_url TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
)

-- Trust and reputation system
reviews (
  id UUID PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES jobs(id),
  reviewer_id UUID NOT NULL REFERENCES users(id),
  reviewee_id UUID NOT NULL REFERENCES users(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT CHECK (LENGTH(comment) <= 500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, reviewer_id) -- one review per job per reviewer
)
```

#### Business Configuration
```sql
-- Platform-managed part pricing
parts_catalogue (
  id UUID PRIMARY KEY,
  device_brand VARCHAR(100) NOT NULL,
  device_model VARCHAR(200) NOT NULL,
  repair_category VARCHAR(100) NOT NULL,
  part_name VARCHAR(255) NOT NULL,
  part_price INTEGER NOT NULL, -- kobo
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Technician labor pricing
technician_pricing (
  id UUID PRIMARY KEY,
  technician_id UUID NOT NULL REFERENCES technician_profiles(user_id),
  repair_category VARCHAR(100) NOT NULL,
  device_type VARCHAR(50) NOT NULL,
  labour_price INTEGER NOT NULL, -- kobo
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(technician_id, repair_category, device_type)
)
```

### Data Relationships

**Primary Relationships:**
- `users` → `customer_profiles` (1:1)
- `users` → `technician_profiles` (1:1)
- `users` → `jobs` (1:many as customer_id)
- `users` → `jobs` (1:many as technician_id)
- `jobs` → `payments` (1:1)
- `jobs` → `messages` (1:many)
- `jobs` → `reviews` (1:many)

**Business Logic Constraints:**
- Job can only have one active technician at a time
- Payment must be escrowed before job assignment
- Reviews can only be created after job completion
- Messages are scoped to job participants only

### Database Performance Optimization

**Critical Indexes:**
```sql
-- High-traffic query optimization
CREATE INDEX idx_jobs_customer_status ON jobs(customer_id, status);
CREATE INDEX idx_jobs_technician_status ON jobs(technician_id, status);
CREATE INDEX idx_jobs_created_desc ON jobs(created_at DESC);
CREATE INDEX idx_messages_job_sent ON messages(job_id, sent_at DESC);
CREATE INDEX idx_reviews_reviewee_rating ON reviews(reviewee_id, rating);
CREATE INDEX idx_parts_device_category ON parts_catalogue(device_brand, device_model, repair_category);

-- Spatial queries for location-based matching
CREATE INDEX idx_customer_location ON customer_profiles USING GIST(location);
```

**Computed Fields:**
```sql
-- Technician reputation metrics (called as functions)
CREATE OR REPLACE FUNCTION technician_avg_rating(t_user_id UUID)
RETURNS DECIMAL(3,2) AS $$
  SELECT COALESCE(AVG(rating), 0.0) FROM reviews WHERE reviewee_id = t_user_id;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION technician_job_count(t_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*) FROM jobs WHERE technician_id = t_user_id AND status = 'complete';
$$ LANGUAGE SQL STABLE;
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, the following properties represent universal behaviors that should hold across all valid system executions:

### Property 1: Phone Number Format Validation

*For any* input string, the authentication system SHALL accept only strings matching the exact format +234XXXXXXXXXX where X represents digits 0-9, and reject all other formats before OTP generation.

**Validates: Requirements 1.1**

### Property 2: JWT Session Creation for Valid OTP

*For any* correct OTP entered within the 5-minute validity window, the authentication system SHALL create a valid JWT session token.

**Validates: Requirements 1.3**

### Property 3: Role Immutability

*For any* user with an assigned role, the platform SHALL prevent role modification and maintain the original role assignment throughout the user's lifecycle.

**Validates: Requirements 2.4**

### Property 4: Role-Based Access Control

*For any* user attempting to access features outside their assigned role, the platform SHALL deny access and provide appropriate messaging.

**Validates: Requirements 2.5**

### Property 5: Repair Category Display Consistency

*For any* valid device model selection, the platform SHALL display all available repair categories with consistent pricing preview format.

**Validates: Requirements 5.3**

### Property 6: Parts Catalogue Pricing Retrieval

*For any* part existing in the parts catalogue, the platform SHALL retrieve and display the current pricing information accurately.

**Validates: Requirements 5.4**

### Property 7: Photo Upload Validation

*For any* valid image file (JPEG/PNG) under 5MB, the platform SHALL accept up to 3 files per booking, and reject files exceeding size limits or invalid formats.

**Validates: Requirements 5.5**

### Property 8: Technician Recommendation Algorithm

*For any* repair category with available technicians, the platform SHALL recommend the technician with the highest average rating who is currently available.

**Validates: Requirements 5.7**

### Property 9: Payment Escrow Status Management

*For any* successful payment transaction, the escrow system SHALL set the payment status to 'escrowed' and maintain this status until authorized release or dispute resolution.

**Validates: Requirements 9.2**

### Property 10: Fund Protection During Repair

*For any* job with status 'repair_started' or 'device_received', the escrow system SHALL prevent fund release to technician until completion is confirmed.

**Validates: Requirements 9.3**

### Property 11: Dispute Fund Holding

*For any* customer-reported issue on a completed job, the escrow system SHALL immediately set payment status to 'disputed' and prevent automatic fund release.

**Validates: Requirements 9.5**

### Property 12: Auto-Release Timing Compliance

*For any* job marked complete with no customer action, the escrow system SHALL automatically release payment to the technician after exactly 72 hours.

**Validates: Requirements 9.6**

### Property 13: Job Status Lifecycle Consistency

*For any* job state transition trigger, the platform SHALL update the job status to the correct next state according to the defined workflow sequence.

**Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8**

### Property 14: Chat Thread Creation

*For any* job assignment between customer and technician, the platform SHALL create a unique chat thread accessible only to the job participants.

**Validates: Requirements 11.1**

### Property 15: Message Delivery Completeness

*For any* message sent within an active job chat thread, the communication system SHALL deliver the message to all authorized recipients in real-time.

**Validates: Requirements 11.2**

### Property 16: Message Length Enforcement

*For any* text message submission, the communication system SHALL accept messages up to 1000 characters and reject longer messages with appropriate error messaging.

**Validates: Requirements 11.3**

### Property 17: Image File Sharing Validation

*For any* image file upload attempt, the communication system SHALL accept JPEG/PNG files under 10MB and reject files that don't meet format or size requirements.

**Validates: Requirements 11.4**

### Property 18: Message History Persistence

*For any* job with an active chat thread, the communication system SHALL preserve all message history for the complete duration of the job lifecycle.

**Validates: Requirements 11.5**

### Property 19: Message Delivery Confirmation

*For any* successfully delivered message, the communication system SHALL provide delivery confirmation to the sender.

**Validates: Requirements 11.6**

### Property 20: Row Level Security Enforcement

*For any* database access attempt, the security system SHALL enforce row-level security policies and prevent unauthorized data access across all tables.

**Validates: Requirements 28.3**

### Property 21: Audit Log Generation

*For any* access to sensitive user data or financial information, the platform SHALL generate a corresponding audit log entry with timestamp and user identification.

**Validates: Requirements 28.4**

### Property 22: Data Deletion Compliance

*For any* user data deletion request, the platform SHALL complete the deletion within 30 days while preserving legally required business records.

**Validates: Requirements 28.5**

## Error Handling

### Error Classification and Response Strategy

The platform implements a comprehensive error handling architecture with clear categorization and user-appropriate responses:

#### Client-Side Error Handling

**Network Errors**
- **Connection Timeouts**: Retry mechanism with exponential backoff (3 attempts)
- **Network Unavailable**: Offline mode with cached data display and sync queue
- **API Rate Limiting**: Automatic retry with jitter to prevent thundering herd

**Authentication Errors**  
- **Expired JWT**: Automatic refresh using stored refresh token
- **Invalid Session**: Graceful redirect to login with context preservation
- **Permission Denied**: Clear messaging with suggested actions

**Validation Errors**
- **Form Input**: Real-time validation with inline error messages
- **File Upload**: Size/format validation with specific error guidance
- **Business Rule Violations**: Clear explanation of rule and resolution steps

**Example Error Component:**
```typescript
interface ErrorBoundaryState {
  hasError: boolean
  errorMessage: string
  errorCode?: string
}

class AppErrorBoundary extends Component<Props, ErrorBoundaryState> {
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message,
      errorCode: error.name
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to monitoring service
    logError(error, errorInfo, { userId: this.props.userId })
  }

  render() {
    if (this.state.hasError) {
      return <ErrorRecoveryScreen 
        message={this.state.errorMessage}
        onRetry={() => this.setState({ hasError: false })}
      />
    }
    return this.props.children
  }
}
```

#### Server-Side Error Handling

**Database Errors**
- **Connection Pool Exhaustion**: Queue requests with timeout handling
- **Query Timeouts**: Fallback to cached results where appropriate
- **Constraint Violations**: Return user-friendly constraint violation messages

**Payment Processing Errors**
- **Paystack API Failures**: Exponential backoff retry with admin notification
- **Insufficient Balance**: Clear messaging with retry option after funding
- **Invalid Recipient**: Immediate failure with corrective instructions

**External Service Failures**
- **SMS Gateway Down**: Fallback to email delivery with user notification
- **Google Maps Unavailable**: Allow manual address entry with validation
- **Storage Service Issues**: Local temporary storage with background sync

#### Edge Function Error Patterns

```typescript
// Standard error response format
interface ApiErrorResponse {
  error: {
    code: string
    message: string
    details?: Record<string, any>
  }
  timestamp: string
  requestId: string
}

// Error handling wrapper for Edge Functions
export function withErrorHandling(
  handler: (req: Request) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    try {
      return await handler(req)
    } catch (error) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: error.code || 'INTERNAL_ERROR',
          message: error.message || 'An unexpected error occurred',
          details: error.details
        },
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
      
      // Log error for debugging
      console.error('Edge Function Error:', errorResponse)
      
      return new Response(JSON.stringify(errorResponse), {
        status: error.status || 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
}
```

### Graceful Degradation Strategies

**Core Feature Protection**
- **Payment Processing**: Multiple fallbacks (different payment providers, manual processing)
- **Authentication**: Offline authentication with sync when connection restored
- **Job Management**: Local state maintenance with server synchronization

**Non-Critical Feature Handling**
- **Real-time Chat**: Falls back to polling if websocket fails
- **Push Notifications**: Email fallback if push service unavailable
- **Image Upload**: Compression fallback if original upload fails

**Data Recovery Mechanisms**
- **Partial Form Completion**: Auto-save draft with restoration on return
- **Network Interruption**: Resume capability for file uploads and data sync
- **Crash Recovery**: State restoration from persistent storage

## Testing Strategy

### Testing Philosophy

The UrbanFix platform employs a dual testing approach that balances comprehensive coverage with development velocity:

1. **Property-Based Testing**: Validates universal behaviors across all possible inputs
2. **Example-Based Testing**: Covers specific scenarios and edge cases
3. **Integration Testing**: Ensures external services work correctly with our system

### Property-Based Testing Implementation

**Technology Stack**:
- **Mobile App**: `fast-check` library for React Native/TypeScript
- **Edge Functions**: Deno's built-in property testing capabilities
- **Database**: Custom property generators for SQL data validation

**Property Test Configuration**:
- **Minimum iterations**: 100 per property test
- **Test timeout**: 30 seconds per property
- **Shrinking enabled**: Automatic failure case minimization

**Example Property Test:**
```typescript
// Property test for phone validation
import fc from 'fast-check'

describe('Phone Validation Property Tests', () => {
  it('should accept only valid Nigerian phone numbers', () => {
    fc.assert(fc.property(
      fc.string(),
      (input) => {
        const isValid = validateNigerianPhone(input)
        const isCorrectFormat = /^\+234[0-9]{10}$/.test(input)
        
        // Property: validation result should match format check
        expect(isValid).toBe(isCorrectFormat)
      }
    ), { numRuns: 100 })
  })
  
  it('should handle escrow status transitions correctly', () => {
    fc.assert(fc.property(
      fc.oneof(
        fc.constant('pending'),
        fc.constant('escrowed'), 
        fc.constant('released'),
        fc.constant('disputed')
      ),
      fc.oneof(
        fc.constant('authorize_release'),
        fc.constant('report_dispute'),
        fc.constant('admin_resolve')
      ),
      (initialStatus, action) => {
        const finalStatus = processEscrowAction(initialStatus, action)
        
        // Property: valid transitions should never result in invalid states
        expect(['pending', 'escrowed', 'released', 'disputed', 'refunded'])
          .toContain(finalStatus)
      }
    ))
  })
})
```

**Property Test Coverage**:
- **Authentication**: Phone format validation, OTP generation, session management
- **Payment Processing**: Escrow state transitions, amount calculations, currency conversion
- **Job Workflow**: Status transitions, assignment logic, completion validation
- **Communication**: Message delivery, file upload validation, thread management
- **Security**: Access control enforcement, data encryption, audit logging

### Example-Based Testing

**Unit Tests**:
```typescript
describe('Job Assignment Logic', () => {
  it('should assign highest-rated available technician', () => {
    const technicians = [
      { id: '1', rating: 4.5, available: true },
      { id: '2', rating: 4.8, available: true },
      { id: '3', rating: 4.9, available: false }
    ]
    
    const assignment = assignTechnician(technicians, 'screen_replacement')
    expect(assignment.technicianId).toBe('2') // Highest rated available
  })
  
  it('should handle auto-release after 72 hours', () => {
    const completionTime = new Date('2024-01-01T10:00:00Z')
    const currentTime = new Date('2024-01-04T10:30:00Z') // 72.5 hours later
    
    const shouldRelease = isEligibleForAutoRelease(completionTime, currentTime)
    expect(shouldRelease).toBe(true)
  })
})
```

**Integration Tests**:
```typescript
describe('Payment Integration Tests', () => {
  it('should process complete payment flow', async () => {
    // Test with Paystack test environment
    const paymentRef = await initializePayment({
      amount: 5000000, // ₦50,000 in kobo
      customer: 'test@example.com'
    })
    
    // Simulate webhook callback
    const webhook = await simulatePaystackWebhook({
      event: 'charge.success',
      data: { reference: paymentRef }
    })
    
    // Verify escrow status update
    const payment = await getPaymentByRef(paymentRef)
    expect(payment.status).toBe('escrowed')
  })
})
```

### End-to-End Testing

**Critical User Journeys**:
1. **Customer Booking Flow**: Device selection → Technician assignment → Payment → Completion
2. **Technician Workflow**: Job acceptance → Status updates → Payment receipt  
3. **Admin Operations**: Technician approval → Dispute resolution → System monitoring
4. **Communication Flow**: Real-time messaging → File sharing → Status notifications

**Test Environment**:
- **Staging Database**: Production replica with anonymized data
- **Test Payment Gateway**: Paystack test environment
- **Mock External Services**: SMS, push notifications, maps
- **Automated Testing**: Playwright for web admin, Detox for mobile app

**Performance Testing**:
- **Load Testing**: 100 concurrent users, 1000 requests/minute
- **Database Performance**: Query response time < 200ms for 95th percentile  
- **API Response Time**: < 500ms for 90th percentile of Edge Function calls
- **Real-time Features**: Message delivery < 1 second end-to-end

### Test Data Management

**Property Test Generators**:
```typescript
// Custom generators for domain objects
export const jobGenerator = fc.record({
  id: fc.uuid(),
  customerId: fc.uuid(),
  deviceBrand: fc.constantFrom('Apple', 'Samsung', 'Google'),
  deviceModel: fc.string({ minLength: 3, maxLength: 50 }),
  repairCategory: fc.constantFrom('screen_replacement', 'battery_replacement'),
  totalPrice: fc.integer({ min: 100000, max: 10000000 }), // ₦1,000 - ₦100,000
  status: fc.constantFrom('booked', 'paid', 'complete')
})

export const userGenerator = fc.record({
  id: fc.uuid(),
  phone: fc.string().map(s => `+234${s.slice(0, 10).replace(/\D/g, '0')}`),
  role: fc.constantFrom('customer', 'technician'),
  fullName: fc.string({ minLength: 2, maxLength: 100 })
})
```

**Test Database Seeding**:
- **Deterministic Seeds**: Consistent test data across environments  
- **Factory Pattern**: Generate test objects with realistic relationships
- **Cleanup Strategy**: Transaction rollback for isolated test runs
- **Data Privacy**: No production data in test environments

### Continuous Testing Integration

**GitHub Actions Workflow**:
```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  property-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:property -- --coverage
      
  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: password
    steps:
      - run: npm run test:integration
      
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:e2e:headless
```

**Quality Gates**:
- **Property Test Coverage**: All correctness properties must have corresponding tests
- **Code Coverage**: 80% minimum for business logic, 60% for UI components  
- **Performance Regression**: No response time degradation > 20%
- **Security Scanning**: No high-severity vulnerabilities in dependencies

## Security Architecture

### Authentication and Authorization

**Multi-Layer Security Model**:
1. **Phone Verification**: Nigerian mobile number validation with SMS OTP
2. **JWT Session Management**: Stateless authentication with automatic refresh
3. **Role-Based Access Control**: Immutable user roles with feature-level permissions
4. **Row Level Security**: Database-level access control enforced on all queries

**Authentication Flow Security**:
```typescript
// Secure OTP validation with rate limiting
interface OTPValidation {
  phone: string
  otp: string
  attemptCount: number
  lastAttempt: Date
  blocked: boolean
  blockExpiry?: Date
}

export async function validateOTP(phone: string, otp: string): Promise<AuthResult> {
  // Check rate limiting (3 attempts per 15 minutes)
  const validation = await getOTPValidation(phone)
  if (validation.blocked && validation.blockExpiry! > new Date()) {
    throw new AuthError('TOO_MANY_ATTEMPTS', 'Please try again later')
  }
  
  // Verify OTP with constant-time comparison
  const isValid = await verifyOTPSecurely(phone, otp)
  if (!isValid) {
    await incrementFailedAttempts(phone)
    throw new AuthError('INVALID_OTP', 'Invalid verification code')
  }
  
  // Generate secure JWT with appropriate claims
  const token = await generateJWT({
    sub: userId,
    role: userRole,
    phone: phone,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    iat: Math.floor(Date.now() / 1000)
  })
  
  return { token, user, refreshToken }
}
```

**Row Level Security Implementation**:
```sql
-- Example RLS policies for job access control
CREATE POLICY "customers_own_jobs" ON jobs
  FOR ALL USING (auth.uid() = customer_id);

CREATE POLICY "technicians_assigned_jobs" ON jobs  
  FOR ALL USING (auth.uid() = technician_id);

CREATE POLICY "technicians_view_available_jobs" ON jobs
  FOR SELECT USING (
    technician_id IS NULL 
    AND status = 'paid'
    AND EXISTS (
      SELECT 1 FROM technician_profiles tp
      WHERE tp.user_id = auth.uid()
      AND tp.verification_status = 'approved'
      AND tp.is_available = true
    )
  );

-- Prevent unauthorized payment operations
CREATE POLICY "payment_release_customer_only" ON payments
  FOR UPDATE USING (
    status = 'escrowed'
    AND EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = job_id 
      AND j.customer_id = auth.uid()
    )
  );
```

### Data Protection

**Encryption Standards**:
- **Data at Rest**: AES-256 encryption for all PII and financial data
- **Data in Transit**: TLS 1.3 for all API communications
- **Key Management**: Supabase managed encryption keys with rotation
- **Database Encryption**: PostgreSQL transparent data encryption enabled

**Sensitive Data Handling**:
```typescript
// Example secure data handling patterns
interface SecureUserData {
  id: string
  phone_hash: string    // SHA-256 hash for lookups
  nin_encrypted: string // AES-256 encrypted NIN
  bank_details_encrypted: string // Encrypted bank information
}

// Secure bank detail storage
export async function storeBankDetails(
  userId: string, 
  bankDetails: BankDetails
): Promise<void> {
  const encryptedDetails = await encryptData(JSON.stringify(bankDetails))
  
  await supabase
    .from('technician_profiles')
    .update({
      bank_details_encrypted: encryptedDetails,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
}
```

**Privacy Controls**:
- **Data Minimization**: Collect only necessary information for business operations
- **Purpose Limitation**: Data used only for specified purposes in privacy policy
- **Retention Limits**: Automatic data deletion after retention period expires
- **User Rights**: GDPR-compliant data access, correction, and deletion capabilities

### Payment Security

**Escrow Protection Mechanisms**:
```typescript
// Secure payment release with multiple verification layers
export async function releasePayment(jobId: string, customerId: string): Promise<void> {
  // 1. Verify customer ownership
  const job = await verifyJobOwnership(jobId, customerId)
  if (!job) throw new SecurityError('UNAUTHORIZED_RELEASE')
  
  // 2. Idempotency check with row locking
  const payment = await lockPaymentForUpdate(jobId)
  if (payment.status !== 'escrowed') {
    throw new BusinessError('INVALID_PAYMENT_STATE')
  }
  
  // 3. Secure transfer with fraud detection
  const transferResult = await executeSecureTransfer({
    amount: job.payout_amount,
    recipientCode: job.technician_recipient_code,
    reference: `payout_${payment.id}`,
    metadata: { jobId, customerId }
  })
  
  // 4. Atomic state update
  await updatePaymentStatusAtomically(payment.id, 'released', transferResult.reference)
}

// Fraud detection for payment operations
interface FraudCheckResult {
  riskScore: number
  flags: string[]
  approved: boolean
}

export async function performFraudCheck(
  payment: Payment, 
  job: Job
): Promise<FraudCheckResult> {
  const checks = [
    await checkVelocityLimits(payment.customer_id),
    await validatePaymentPattern(payment),
    await verifyTechnicianCredentials(job.technician_id),
    await checkBlacklistStatus([payment.customer_id, job.technician_id])
  ]
  
  const riskScore = calculateRiskScore(checks)
  const approved = riskScore < FRAUD_THRESHOLD
  
  return { riskScore, flags: checks.flatMap(c => c.flags), approved }
}
```

**PCI DSS Compliance** (via Paystack):
- **No Card Storage**: All payment details stored by certified payment processor
- **Tokenization**: Card details replaced with secure tokens for reference
- **Secure Transmission**: End-to-end encryption for payment data
- **Regular Audits**: Third-party security assessments of payment infrastructure

### Infrastructure Security

**Network Security**:
- **WAF Protection**: Web Application Firewall for DDoS and injection prevention
- **Rate Limiting**: API endpoint protection against abuse and scraping
- **IP Whitelisting**: Admin dashboard access restricted to approved IP ranges
- **SSL Termination**: TLS certificates with automatic renewal

**Application Security**:
```typescript
// Input validation and sanitization
import { z } from 'zod'

export const jobCreationSchema = z.object({
  deviceBrand: z.string().min(1).max(100).regex(/^[a-zA-Z0-9\s-]+$/),
  deviceModel: z.string().min(1).max(200).regex(/^[a-zA-Z0-9\s-]+$/),
  repairCategory: z.enum(['screen_replacement', 'battery_replacement', 'charging_port']),
  pickupAddress: z.string().min(10).max(500),
  photoUrls: z.array(z.string().url()).max(3).optional()
})

// SQL injection prevention through parameterized queries
export async function getJobsByStatus(userId: string, status: string): Promise<Job[]> {
  // Supabase automatically parameterizes queries, preventing SQL injection
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('customer_id', userId)  // Parameterized
    .eq('status', status)       // Parameterized
    .order('created_at', { ascending: false })
    
  if (error) throw new DatabaseError(error.message)
  return data
}

// XSS prevention through output encoding
export function sanitizeUserInput(input: string): string {
  return input
    .replace(/[<>'"&]/g, (char) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      }
      return entities[char] || char
    })
}
```

### Security Monitoring and Incident Response

**Security Event Monitoring**:
```typescript
// Security event logging
interface SecurityEvent {
  eventType: 'auth_failure' | 'suspicious_activity' | 'data_access' | 'permission_denied'
  userId?: string
  ipAddress: string
  userAgent: string
  timestamp: Date
  details: Record<string, any>
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  // Log to secure audit trail
  await supabase
    .from('security_events')
    .insert(event)
    
  // Alert on high-risk events
  if (event.riskLevel === 'high' || event.riskLevel === 'critical') {
    await alertSecurityTeam(event)
  }
  
  // Automatic blocking for critical events
  if (event.riskLevel === 'critical') {
    await blockIPAddress(event.ipAddress)
  }
}
```

**Incident Response Procedures**:
1. **Detection**: Automated monitoring alerts security team within 5 minutes
2. **Assessment**: Incident severity classification and impact analysis
3. **Containment**: Immediate threat mitigation and system isolation if needed
4. **Investigation**: Root cause analysis and evidence preservation
5. **Recovery**: Service restoration with security improvements
6. **Lessons Learned**: Post-incident review and security enhancement

### Compliance and Auditing

**Audit Trail Requirements**:
- **Data Access**: Log all access to personal and financial information
- **Administrative Actions**: Track all admin operations with user identification
- **Payment Operations**: Complete audit trail for all financial transactions
- **Security Events**: Comprehensive logging of authentication and authorization events

**Compliance Standards**:
- **GDPR**: European data protection regulation compliance
- **NDPR**: Nigeria Data Protection Regulation adherence  
- **PCI DSS**: Payment security standards (via Paystack)
- **SOC 2**: Service organization control compliance (Supabase infrastructure)

## Performance Considerations

### Scalability Architecture

**Current Scale (MVP)**:
- **Users**: 100 customers, 50 technicians
- **Jobs**: 50 completed jobs monthly
- **Messages**: ~1,000 messages monthly
- **Database**: <10GB total data

**Growth Scale (12 months)**:
- **Users**: 5,000 customers, 500 technicians
- **Jobs**: 5,000 completed jobs monthly  
- **Messages**: ~50,000 messages monthly
- **Database**: ~100GB total data

**Scaling Strategy**:
```typescript
// Database optimization for scale
// Current: Single PostgreSQL instance with connection pooling
// Growth: Read replicas + connection pooling + query optimization

// Current query pattern
const jobs = await supabase
  .from('jobs')
  .select('*, technician_profiles(*)')
  .eq('customer_id', userId)
  .order('created_at', { ascending: false })
  .limit(20)

// Optimized for scale with selective loading
const jobs = await supabase
  .from('jobs') 
  .select(`
    id, 
    device_model, 
    repair_category, 
    status, 
    total_price,
    created_at,
    technician_profiles(full_name, avatar_url)
  `)
  .eq('customer_id', userId)
  .order('created_at', { ascending: false })
  .range(offset, offset + pageSize - 1)
```

### Caching Strategy

**Application-Level Caching**:
```typescript
// React Query configuration for smart caching
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,        // 5 minutes
      cacheTime: 10 * 60 * 1000,       // 10 minutes
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
    }
  }
})

// Smart invalidation on mutations
export function useCreateJob() {
  const queryClient = useQueryClient()
  
  return useMutation(createJob, {
    onSuccess: (newJob) => {
      // Invalidate customer's job list
      queryClient.invalidateQueries(['jobs', newJob.customer_id])
      
      // Invalidate available jobs for technicians
      queryClient.invalidateQueries(['available-jobs'])
      
      // Update optimistically
      queryClient.setQueryData(['job', newJob.id], newJob)
    }
  })
}
```

**Database Query Optimization**:
```sql
-- Composite indexes for common query patterns
CREATE INDEX idx_jobs_customer_status_created 
  ON jobs(customer_id, status, created_at DESC);

CREATE INDEX idx_jobs_technician_active 
  ON jobs(technician_id, status) 
  WHERE status IN ('paid', 'device_received', 'repair_started');

CREATE INDEX idx_messages_job_thread 
  ON messages(job_id, sent_at DESC);

-- Partial indexes for specific use cases
CREATE INDEX idx_available_jobs 
  ON jobs(repair_category, created_at DESC) 
  WHERE technician_id IS NULL AND status = 'paid';

CREATE INDEX idx_technicians_available 
  ON technician_profiles(verification_status, is_available)
  WHERE verification_status = 'approved' AND is_available = true;
```

### Real-Time Performance

**WebSocket Connection Management**:
```typescript
// Efficient real-time subscriptions with connection pooling
class RealtimeManager {
  private connections = new Map<string, RealtimeChannel>()
  
  subscribeToJob(jobId: string, callback: (update: any) => void): () => void {
    const channelKey = `job:${jobId}`
    
    if (!this.connections.has(channelKey)) {
      const channel = supabase
        .channel(channelKey)
        .on('postgres_changes', {
          event: '*',
          schema: 'public', 
          table: 'jobs',
          filter: `id=eq.${jobId}`
        }, callback)
        .subscribe()
        
      this.connections.set(channelKey, channel)
    }
    
    // Return unsubscribe function
    return () => {
      const channel = this.connections.get(channelKey)
      if (channel) {
        channel.unsubscribe()
        this.connections.delete(channelKey)
      }
    }
  }
}
```

**Message Delivery Optimization**:
- **Connection Reuse**: Single WebSocket connection per user with multiplexed channels
- **Message Batching**: Group multiple messages in single transmission when possible  
- **Offline Queuing**: Store messages locally and sync when connection restored
- **Typing Indicators**: Debounced updates to reduce network traffic

### Mobile App Performance

**Bundle Size Optimization**:
```javascript
// Expo/Metro configuration for optimized bundles
module.exports = {
  resolver: {
    assetExts: ['bin', 'txt', 'jpg', 'png', 'json', 'webp'],
  },
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
    minifierConfig: {
      mangle: { keep_fnames: true },
      output: { ascii_only: true, quote_keys: true, wrap_iife: true },
      sourceMap: { includeSources: false }
    }
  },
  serializer: {
    customSerializer: require('@expo/metro-config/serializer-plugins/build-splitting-serializer.js')
  }
}
```

**Image Optimization**:
```typescript
// Automatic image compression and format selection
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'

export async function optimizeImageForUpload(uri: string): Promise<string> {
  const { uri: optimizedUri } = await manipulateAsync(
    uri,
    [{ resize: { width: 1024 } }], // Max width 1024px
    { 
      compress: 0.8,
      format: SaveFormat.WEBP, // Modern format for smaller size
      base64: false
    }
  )
  
  return optimizedUri
}
```

**Memory Management**:
- **Image Caching**: Limit cached images to 50MB with LRU eviction
- **List Virtualization**: Render only visible items in long job/message lists
- **Component Unmounting**: Clean up subscriptions and timers on component unmount
- **Background Processing**: Move heavy operations to background threads when possible

This completes the comprehensive UrbanFix platform design document, covering all aspects from high-level architecture to detailed implementation considerations for security, performance, and scalability.
