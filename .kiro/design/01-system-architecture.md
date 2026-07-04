# UrbanFix System Architecture
*High-Level System Design and Component Relationships*

## 1. Architecture Overview

### 1.1 System Architecture Pattern
```
┌─────────────────────────────────────────────────────────────┐
│                    UrbanFix Ecosystem                       │
├─────────────────────────────────────────────────────────────┤
│  Mobile App (React Native)                                 │
│  ┌─────────────────┬─────────────────┬──────────────────┐  │
│  │   Customer      │   Technician    │      Auth        │  │
│  │   Flows         │   Flows         │      System      │  │
│  └─────────────────┴─────────────────┴──────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  Backend Services (Supabase)                               │
│  ┌─────────────────┬─────────────────┬──────────────────┐  │
│  │   Database      │   Auth Service  │   Edge Functions │  │
│  │   (PostgreSQL)  │   (JWT)         │   (Business Logic) │  │
│  └─────────────────┴─────────────────┴──────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  External Services                                          │
│  ┌─────────────────┬─────────────────┬──────────────────┐  │
│  │   Paystack      │   Google Maps   │      SMS         │  │
│  │   (Payments)    │   (Location)    │   (Notifications) │  │
│  └─────────────────┴─────────────────┴──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Architecture Principles
- **Separation of Concerns**: Clear boundaries between UI, business logic, and data
- **Single Responsibility**: Each component has one clear purpose
- **Dependency Inversion**: High-level modules don't depend on low-level modules
- **Event-Driven**: Real-time updates via subscriptions and events

## 2. Application Architecture

### 2.1 Frontend Architecture (React Native)
```
┌─────────────────────────────────────────────────────────────┐
│                   Mobile Application                        │
├─────────────────────────────────────────────────────────────┤
│  Presentation Layer                                         │
│  ┌─────────────────┬─────────────────┬──────────────────┐  │
│  │    Screens      │   Components    │   Navigation     │  │
│  │  (Pages/Views)  │   (UI Library)  │   (Routing)      │  │
│  └─────────────────┴─────────────────┴──────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  Business Logic Layer                                       │
│  ┌─────────────────┬─────────────────┬──────────────────┐  │
│  │     Hooks       │     Stores      │    Services      │  │
│  │ (Data Fetching) │ (State Mgmt)    │  (API Calls)     │  │
│  └─────────────────┴─────────────────┴──────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                 │
│  ┌─────────────────┬─────────────────┬──────────────────┐  │
│  │  Supabase       │     Cache       │   Local Storage  │  │
│  │   Client        │   (Query Cache) │   (Persistence)  │  │
│  └─────────────────┴─────────────────┴──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Component Hierarchy
```
App
├── AuthLayout (Authentication Guard)
│   ├── SplashScreen
│   ├── OnboardingScreen
│   └── AuthFlows
│       ├── PhoneLogin
│       ├── OTPVerification  
│       ├── RoleSelection
│       └── ProfileSetup
├── CustomerLayout (Bottom Tabs)
│   ├── HomeScreen
│   ├── RepairFlow
│   │   ├── DeviceSelection
│   │   ├── CategorySelection
│   │   ├── PhotoUpload
│   │   ├── TechnicianSelection
│   │   └── PaymentConfirmation
│   ├── RepairsScreen
│   ├── MessagesScreen
│   └── ProfileScreen
└── TechnicianLayout (Bottom Tabs)
    ├── DashboardScreen
    ├── JobsScreen
    ├── MessagesScreen
    └── ProfileScreen
```

## 3. Data Architecture

### 3.1 Database Design Patterns
```sql
-- Entity Relationship Pattern
users (1) ←→ (1) customer_profiles
users (1) ←→ (1) technician_profiles
users (1) ←→ (∞) jobs (as customer)
users (1) ←→ (∞) jobs (as technician)
jobs (1) ←→ (∞) messages
jobs (1) ←→ (1) payments
jobs (1) ←→ (∞) reviews
```

### 3.2 Data Flow Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                      Data Flow                              │
├─────────────────────────────────────────────────────────────┤
│  User Action (UI)                                           │
│           ↓                                                 │
│  Hook/Store (Business Logic)                                │
│           ↓                                                 │
│  Supabase Client (Data Layer)                               │
│           ↓                                                 │
│  Database/Auth/Storage (Backend)                            │
│           ↓                                                 │
│  Real-time Updates (Subscriptions) ────┐                   │
│           ↓                             │                   │
│  UI Update (State Change)               │                   │
│           ↑─────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

## 4. Security Architecture

### 4.1 Authentication Flow
```
┌─────────────────────────────────────────────────────────────┐
│                 Authentication Architecture                 │
├─────────────────────────────────────────────────────────────┤
│  Phone Number Input                                         │
│           ↓                                                 │
│  OTP Generation (Supabase Auth)                             │
│           ↓                                                 │
│  OTP Verification                                           │
│           ↓                                                 │
│  JWT Token Generation                                       │
│           ↓                                                 │
│  User Session Creation                                      │
│           ↓                                                 │
│  Role-Based Access Control (RLS)                            │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Authorization Layers
```
┌─────────────────────────────────────────────────────────────┐
│                   Authorization Layers                      │
├─────────────────────────────────────────────────────────────┤
│  1. Application Level (React Native)                        │
│     - Role-based routing                                    │
│     - Component-level permissions                           │
│     - UI element visibility                                 │
├─────────────────────────────────────────────────────────────┤
│  2. API Level (Supabase RLS)                                │
│     - Row-level security policies                           │
│     - Column-level permissions                              │
│     - Function execution permissions                        │
├─────────────────────────────────────────────────────────────┤
│  3. Database Level (PostgreSQL)                             │
│     - Schema permissions                                    │
│     - Function security definer                             │
│     - Audit logging                                         │
└─────────────────────────────────────────────────────────────┘
```

## 5. Integration Architecture

### 5.1 External Service Integration
```
┌─────────────────────────────────────────────────────────────┐
│                Service Integration Pattern                  │
├─────────────────────────────────────────────────────────────┤
│  Mobile App                                                 │
│       ↓ (Direct API calls)                                  │
│  ┌─────────────────┬─────────────────┬──────────────────┐  │
│  │   Paystack      │   Google Maps   │   Expo Push      │  │
│  │   (Payments)    │   (Location)    │ (Notifications)  │  │
│  └─────────────────┴─────────────────┴──────────────────┘  │
│       ↓ (Webhooks)                                          │
│  Edge Functions (Business Logic)                            │
│       ↓                                                     │
│  Supabase Database (State Updates)                          │
│       ↓                                                     │
│  Real-time Subscriptions (UI Updates)                       │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Event-Driven Architecture
```
Payment Event → Webhook → Edge Function → Database Update → Real-time Push
   ↓
Mobile App Receives → State Update → UI Refresh
```

## 6. State Management Architecture

### 6.1 State Distribution Strategy
```
┌─────────────────────────────────────────────────────────────┐
│                   State Management                          │
├─────────────────────────────────────────────────────────────┤
│  Global State (Zustand)                                     │
│  ├── Auth State (user, role, tokens)                        │
│  └── Booking State (ephemeral form data)                    │
├─────────────────────────────────────────────────────────────┤
│  Server State (Custom Hooks)                                │
│  ├── Jobs Data (useJobs, useJob)                           │
│  ├── Messages Data (useMessages)                            │
│  ├── Profile Data (useProfile)                              │
│  └── Technician Data (useTechnicians)                       │
├─────────────────────────────────────────────────────────────┤
│  Component State (React useState)                           │
│  ├── Form State (React Hook Form)                           │
│  ├── UI State (modals, loading, etc.)                       │
│  └── Local Component Data                                   │
├─────────────────────────────────────────────────────────────┤
│  Persistent State (AsyncStorage)                            │
│  ├── User Preferences                                       │
│  ├── Auth Tokens                                            │
│  └── Cache Data                                             │
└─────────────────────────────────────────────────────────────┘
```

## 7. Performance Architecture

### 7.1 Optimization Strategies
```
┌─────────────────────────────────────────────────────────────┐
│                Performance Optimization                     │
├─────────────────────────────────────────────────────────────┤
│  Frontend Optimizations                                     │
│  ├── Code Splitting (Route-based)                           │
│  ├── Lazy Loading (Components & Images)                     │
│  ├── Memoization (React.memo, useMemo)                     │
│  └── Virtual Lists (Large data sets)                        │
├─────────────────────────────────────────────────────────────┤
│  Backend Optimizations                                      │
│  ├── Database Indexing                                      │
│  ├── Query Optimization                                     │
│  ├── Connection Pooling                                     │
│  └── Caching Strategies                                     │
├─────────────────────────────────────────────────────────────┤
│  Network Optimizations                                      │
│  ├── Image Compression (WebP)                               │
│  ├── API Response Caching                                   │
│  ├── CDN for Static Assets                                  │
│  └── Request Batching                                       │
└─────────────────────────────────────────────────────────────┘
```

## 8. Error Handling Architecture

### 8.1 Error Boundary Strategy
```
┌─────────────────────────────────────────────────────────────┐
│                    Error Handling                           │
├─────────────────────────────────────────────────────────────┤
│  UI Layer                                                   │
│  ├── Error Boundaries (Component crashes)                   │
│  ├── Form Validation (User input errors)                    │
│  └── Loading/Error States (Network issues)                  │
├─────────────────────────────────────────────────────────────┤
│  Business Logic Layer                                       │
│  ├── Try/Catch Blocks (Async operations)                    │
│  ├── Error Logging (Development debugging)                  │
│  └── Fallback Mechanisms (Graceful degradation)             │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                 │
│  ├── Network Error Handling                                 │
│  ├── Database Error Handling                                │
│  └── Authentication Error Handling                          │
└─────────────────────────────────────────────────────────────┘
```

## 9. Monitoring Architecture

### 9.1 Observability Stack
```
┌─────────────────────────────────────────────────────────────┐
│                      Monitoring                             │
├─────────────────────────────────────────────────────────────┤
│  Application Monitoring                                     │
│  ├── Error Tracking (Sentry)                               │
│  ├── Performance Metrics (Custom)                           │
│  ├── User Analytics (Privacy-compliant)                     │
│  └── Crash Reporting (Native crashes)                       │
├─────────────────────────────────────────────────────────────┤
│  Infrastructure Monitoring                                  │
│  ├── Database Performance (Supabase)                        │
│  ├── API Response Times                                     │
│  ├── Storage Usage                                          │
│  └── Connection Metrics                                     │
├─────────────────────────────────────────────────────────────┤
│  Business Metrics                                           │
│  ├── Job Completion Rates                                   │
│  ├── User Engagement Metrics                                │
│  ├── Revenue Tracking                                       │
│  └── Customer Satisfaction                                  │
└─────────────────────────────────────────────────────────────┘
```

## 10. Deployment Architecture

### 10.1 Environment Strategy
```
┌─────────────────────────────────────────────────────────────┐
│                    Deployment Environments                  │
├─────────────────────────────────────────────────────────────┤
│  Development Environment                                    │
│  ├── Local Supabase Instance                               │
│  ├── Expo Development Build                                 │
│  ├── Mock External Services                                 │
│  └── Hot Reloading                                          │
├─────────────────────────────────────────────────────────────┤
│  Staging Environment                                        │
│  ├── Staging Supabase Project                              │
│  ├── TestFlight/Internal Testing                           │
│  ├── Real External Services (Test Mode)                     │
│  └── Production-like Data                                   │
├─────────────────────────────────────────────────────────────┤
│  Production Environment                                     │
│  ├── Production Supabase Project                            │
│  ├── App Store Distribution                                 │
│  ├── Live External Services                                 │
│  └── Monitoring & Analytics                                 │
└─────────────────────────────────────────────────────────────┘
```