# UrbanFix UI/UX Design Document

## Overview

The UrbanFix UI/UX design implementation provides a comprehensive visual and interaction layer for the mobile repair marketplace platform. Built on React Native + Expo, the design system emphasizes trust, transparency, and operational efficiency through a Corporate Modernism aesthetic that projects reliability and technical expertise.

This design covers the complete user interface architecture for authentication flows, customer home experience, profile management, location services, navigation patterns, and reusable component library. The implementation prioritizes accessibility, performance, and maintainable code patterns while delivering a cohesive user experience across both customer and technician personas.

The design integrates with the established UrbanFix platform architecture, leveraging Supabase for backend services, Expo Router for navigation, and Zustand for state management. All visual elements follow the documented design system with Deep Trust Blue (#031636) and Emergency Orange (#FF5722) as primary brand colors, Corporate Modernism typography, and systematic spacing based on an 8-point grid.

## Architecture

### Frontend Architecture

The UI/UX layer follows a layered architecture pattern with clear separation of concerns:

```
📱 Presentation Layer
├── Screens (app/*)
│   ├── Authentication Flow
│   ├── Customer Experience
│   ├── Technician Dashboard
│   └── Shared Screens
│
🎨 Component Layer
├── UI Components (components/ui/*)
│   ├── Atomic Components (Button, Input, Card)
│   ├── Molecular Components (JobCard, TechnicianCard)
│   └── Organism Components (ProfileSetup, AddressPicker)
│
📐 Design System Layer
├── Theme Constants (constants/theme.ts)
│   ├── Colors & Typography
│   ├── Spacing & Radius
│   ├── Shadows & Animations
│   └── Touch Targets
│
🔄 State Management Layer
├── Auth Store (Zustand)
├── Booking Flow Store (Ephemeral)
└── Component State (React Hooks)
```

### Navigation Architecture

The app uses Expo Router with file-based routing for type-safe navigation:

```
app/
├── _layout.tsx                 # Root layout with AuthGuard
├── index.tsx                   # Entry point with role redirection
├── (auth)/                     # Authentication flow group
│   ├── _layout.tsx
│   ├── login.tsx              # Phone number entry
│   ├── otp.tsx                # OTP verification
│   ├── role.tsx               # Role selection
│   └── profile.tsx            # Profile setup
├── (customer)/                 # Customer experience group
│   ├── _layout.tsx            # Bottom tabs navigation
│   ├── home.tsx               # Customer dashboard
│   ├── repairs/               # Repair management
│   └── profile.tsx
└── (technician)/               # Technician experience group
    ├── _layout.tsx
    ├── dashboard.tsx
    └── profile.tsx
```
### Component Architecture

Components follow atomic design principles with strict props interfaces:

**Atomic Level**: Base UI elements with single responsibilities
- Button (Primary, Secondary, Ghost variants)
- Input (with floating labels and validation)
- Card (Default, Outlined, Elevated variants)
- Badge (Status indicators with semantic colors)

**Molecular Level**: Composed components with specific domain logic
- JobCard (Device info, status, pricing display)
- TechnicianCard (Avatar, rating, verification status)
- StatusBadge (Color-coded status with proper semantics)
- PhotoUploader (Camera/gallery integration with validation)

**Organism Level**: Complex components managing multiple molecules
- ProfileSetup (Complete profile creation flow)
- AddressPicker (Map integration with validation)
- ChatThread (Real-time messaging interface)
- PricingBreakdown (Transparent cost display)

## Components and Interfaces

### Core UI Components

#### Button Component

```typescript
interface ButtonProps {
  title: string
  variant: 'primary' | 'secondary' | 'danger' | 'ghost'
  size: 'small' | 'medium' | 'large'
  disabled?: boolean
  loading?: boolean
  onPress: () => void
}
```

**Design Specifications:**
- Primary: Deep Trust Blue (#031636) background, white text
- Secondary: White background with Primary blue border and text
- Ghost: Transparent background with Primary blue text
- Minimum touch target: 44px (WCAG compliance)
- Border radius: 8px (medium)
- Animation: 0.95 scale on press with 150ms duration

#### Input Component

```typescript
interface InputProps extends TextInputProps {
  label?: string
  error?: string
  helperText?: string
  containerStyle?: ViewStyle
}
```

**Design Specifications:**
- Floating label animation with Primary blue focus color
- 56px height for proper touch targets
- Outline border (1px default, 2px focused)
- Error state with Emergency Orange (#FF5722)
- Real-time validation feedback
#### Card Component

```typescript
interface CardProps {
  variant: 'default' | 'outlined' | 'elevated'
  children: React.ReactNode
  onPress?: () => void
}
```

**Design Specifications:**
- Default: White background with subtle border
- Outlined: Enhanced border for emphasis
- Elevated: Drop shadow with tonal layering
- 12px border radius for approachable geometry
- Press animation with 0.95 scale transform

### Domain-Specific Components

#### JobCard Component

```typescript
interface JobCardProps {
  deviceModel: string
  repairCategory: string
  status: JobStatus
  totalPrice: number
  technicianName?: string
  estimatedCompletion?: Date
  onPress: () => void
}
```

**Visual Elements:**
- Device icon based on category (iPhone, Android, Laptop)
- Status badge with semantic colors
- Price formatted in Naira with proper localization
- Progress indicators for active jobs
- Technician avatar and rating when assigned

#### TechnicianCard Component

```typescript
interface TechnicianCardProps {
  id: string
  fullName: string
  avatarUrl?: string
  rating: number
  reviewCount: number
  verificationStatus: 'verified' | 'pending' | 'rejected'
  availability: 'available' | 'busy' | 'offline'
  specialties: string[]
  distance?: number
  onSelect: (technicianId: string) => void
}
```

**Visual Elements:**
- Circular avatar with fallback initials
- Verification badge (green checkmark for verified)
- Star rating with numeric display
- Availability indicator with color coding
- Distance display with location icon
- Specialty tags as pill-shaped badges
### Screen Components

#### Customer Home Screen

```typescript
interface CustomerHomeProps {
  user: User
  activeJobs: Job[]
  nearbyTechnicians: Technician[]
  repairCategories: RepairCategory[]
  onRefresh: () => void
}
```

**Layout Structure:**
1. **Header Section**
   - Location toggle (Home/Work addresses)
   - User greeting with avatar
   - Notification bell with badge count

2. **Search Section**
   - Prominent search bar "What needs fixing?"
   - Voice search integration
   - Recent search suggestions

3. **Quick Actions**
   - 4-column grid of repair categories
   - Device icons with labels
   - Category-based filtering

4. **Active Repairs**
   - Status card for ongoing jobs
   - Progress tracking with timeline
   - Quick actions (Message, Track)

5. **Nearby Technicians**
   - Horizontal scrollable cards
   - Rating and availability display
   - Distance and ETA information

6. **Promotional Content**
   - Corporate Modernism styled banner
   - Seasonal offers and new services
   - Call-to-action buttons

#### Authentication Flow Components

**Splash Screen:**
- UrbanFix logo with animated reveal
- Deep Trust Blue background
- 2.5-second animation with fade-slide transition
- Loading indicator with brand colors

**Phone Login Screen:**
- Country picker with Nigeria (+234) default
- Phone number input with format validation
- International format display
- Clear error messaging for invalid numbers

**OTP Verification Screen:**
- 6-digit input with auto-advance
- Countdown timer with resend functionality
- Visual feedback for correct/incorrect codes
- Accessibility labels for screen readers

**Role Selection Screen:**
- High-contrast cards for Customer/Technician
- Clear iconography and descriptive text
- Role-specific feature highlights
- Smooth transition animations

**Profile Setup Screen:**
- Avatar upload with circular crop
- Camera/gallery selection modal
- Form validation with inline errors
- Progress indicators for multi-step flow
## Data Models

### User Interface State Models

#### Authentication State

```typescript
interface AuthState {
  user: User | null
  role: 'customer' | 'technician' | 'admin' | null
  isLoading: boolean
  phoneNumber: string | null
  verificationId: string | null
  sessionToken: string | null
}
```

#### Booking Flow State

```typescript
interface BookingState {
  deviceType: DeviceType | null
  deviceBrand: string | null
  deviceModel: string | null
  repairCategory: RepairCategory | null
  partId: string | null
  partPrice: number | null
  labourPrice: number | null
  technicianId: string | null
  photoUris: string[]
  pickupAddress: Address | null
  customerNotes: string | null
  currentStep: BookingStep
  isValid: boolean
}
```

#### UI Component State Models

```typescript
interface FormState<T> {
  values: T
  errors: Partial<Record<keyof T, string>>
  touched: Partial<Record<keyof T, boolean>>
  isSubmitting: boolean
  isValid: boolean
}

interface ListState<T> {
  items: T[]
  loading: boolean
  error: string | null
  hasMore: boolean
  refreshing: boolean
}

interface ModalState {
  isVisible: boolean
  content: React.ReactNode | null
  onDismiss: () => void
}
```

### Theme Configuration Model

```typescript
interface ThemeConfig {
  colors: {
    primary: string
    primaryLight: string
    secondary: string
    surface: string
    background: string
    text: {
      primary: string
      secondary: string
      disabled: string
    }
    status: {
      success: string
      warning: string
      error: string
    }
  }
  typography: {
    [key: string]: {
      fontFamily: string
      fontSize: number
      lineHeight: number
      fontWeight: string
      letterSpacing?: number
    }
  }
  spacing: Record<string, number>
  radius: Record<string, number>
  shadows: Record<string, ViewStyle>
}
```
## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

After analyzing the acceptance criteria, the following properties are suitable for property-based testing as they describe universal behaviors that should hold across varying inputs:

### Property 1: Phone Number Validation Consistency

*For any* phone number string input, the validation function SHALL consistently apply Nigerian phone number format rules (+234 followed by 10 digits) and return appropriate validation results

**Validates: Requirements 1.3**

### Property 2: Timer Countdown Accuracy

*For any* initial timer value greater than zero, the countdown timer SHALL decrement by 1 each second until reaching zero, then stop and enable resend functionality

**Validates: Requirements 1.5**

### Property 3: Spacing System Compliance

*For any* defined spacing value in the design system, it SHALL be a multiple of 8 pixels to maintain the 8-point grid system

**Validates: Requirements 2.3**

### Property 4: Button Touch Target Accessibility

*For any* button variant (primary, secondary, ghost), the touch target area SHALL be at least 44px in both width and height to meet accessibility standards

**Validates: Requirements 2.6**

### Property 5: Input Component State Consistency

*For any* input component state (focused/unfocused, valid/invalid), the floating label position and visual styling SHALL be consistent with the design system specifications

**Validates: Requirements 2.7**

### Property 6: Location Toggle Functionality

*For any* set of configured addresses (home, work, custom), the location toggle component SHALL display all addresses and allow switching between them correctly

**Validates: Requirements 3.1**

### Property 7: Grid Layout Preservation

*For any* number of repair categories, they SHALL be displayed in a 4-column grid layout with consistent spacing and alignment

**Validates: Requirements 3.3**

### Property 8: Technician Card Rendering Consistency

*For any* list of technicians with valid data, each technician card SHALL display rating, availability status, and distance information in the correct format

**Validates: Requirements 3.5**

### Property 9: Pull-to-Refresh Behavior

*For any* screen state with scrollable content, the pull-to-refresh gesture SHALL trigger the refresh action and display appropriate loading feedback

**Validates: Requirements 3.8**
### Property 10: Avatar Upload Processing

*For any* valid image input, the avatar upload component SHALL apply circular cropping correctly and generate a properly formatted preview

**Validates: Requirements 4.1**

### Property 11: Form Validation Consistency

*For any* form field with validation rules, invalid input SHALL trigger inline error messages with clear descriptions according to the validation specification

**Validates: Requirements 4.2, 4.7**

### Property 12: Document Upload Interface Robustness

*For any* valid document input, the upload interface SHALL handle file processing correctly and provide appropriate progress feedback

**Validates: Requirements 4.5**

### Property 13: Profile Modification Confirmation Flow

*For any* profile field modification, the system SHALL trigger appropriate confirmation flows before applying changes

**Validates: Requirements 4.6**

### Property 14: Upload Progress Feedback Consistency

*For any* file upload operation, the system SHALL display progress indicators during upload and completion states when finished

**Validates: Requirements 4.8**

### Property 15: Address Autocomplete Functionality

*For any* partial address input string, the autocomplete system SHALL provide relevant address suggestions from the geocoding service

**Validates: Requirements 5.3**

### Property 16: Address Validation Consistency

*For any* address input format, the validation system SHALL apply consistent validation rules and provide appropriate visual feedback

**Validates: Requirements 5.4**

### Property 17: Multi-Address Management

*For any* address and custom label combination, the system SHALL save the address with the correct label and allow retrieval

**Validates: Requirements 5.5**

### Property 18: Distance Calculation Accuracy

*For any* pair of valid geographic coordinates (customer and technician locations), the distance calculation SHALL return consistent and accurate results

**Validates: Requirements 5.6**

### Property 19: Map Pin Interaction Consistency

*For any* coordinate position on the map, dragging the pin SHALL update the address information appropriately and consistently

**Validates: Requirements 5.7**

### Property 20: Navigation Animation Consistency

*For any* screen transition within the app, the animation SHALL use consistent timing curves and duration according to design specifications

**Validates: Requirements 6.3**
### Property 21: Stack Navigation Behavior

*For any* tab section with multiple screens, stack navigation SHALL correctly handle push and pop operations maintaining proper navigation history

**Validates: Requirements 6.4**

### Property 22: Navigation Header Display Logic

*For any* screen position in the navigation stack, the header SHALL display appropriate back navigation and contextual title based on stack depth

**Validates: Requirements 6.5**

### Property 23: Deep Link Navigation Consistency

*For any* valid deep link URL, the navigation system SHALL direct users to the correct screen regardless of current app state

**Validates: Requirements 6.6**

### Property 24: Navigation State Persistence

*For any* navigation state, it SHALL be preserved correctly through app backgrounding and foregrounding cycles

**Validates: Requirements 6.8**

### Property 25: Job Card Data Display

*For any* valid job data object, the JobCard component SHALL display device information, status, and pricing in the correct format

**Validates: Requirements 7.1**

### Property 26: Technician Card Information Rendering

*For any* valid technician data object, the TechnicianCard component SHALL display avatar, rating, availability, and verification status correctly

**Validates: Requirements 7.2**

### Property 27: Status Badge Color Consistency

*For any* status value, the StatusBadge component SHALL display the correct semantic color and text according to status mapping

**Validates: Requirements 7.3**

### Property 28: Loading Skeleton Layout Matching

*For any* content layout structure, the LoadingSkeleton component SHALL match the geometric structure of the content it represents

**Validates: Requirements 7.5**

### Property 29: Error State Recovery Functionality

*For any* error condition, the ErrorState component SHALL display appropriate messaging and provide functional retry capabilities

**Validates: Requirements 7.6**

### Property 30: Photo Upload Validation Processing

*For any* image input, the PhotoUploader component SHALL validate file format and size correctly, then display appropriate preview

**Validates: Requirements 7.7**
### Property 31: Pricing Display Accuracy

*For any* pricing data structure, the PricingBreakdown component SHALL display all cost components accurately formatted in Nigerian Naira

**Validates: Requirements 7.8**

### Property 32: Haptic Feedback Consistency

*For any* primary action or confirmation interaction, the system SHALL trigger appropriate haptic feedback consistently

**Validates: Requirements 8.1**

### Property 33: Press Animation Uniformity

*For any* pressable element, the touch feedback SHALL apply 0.95 scale transform animation consistently across all components

**Validates: Requirements 8.2**

### Property 34: Animation Timing Standards

*For any* state change animation, the system SHALL use 300ms cubic-bezier transitions for smooth visual feedback

**Validates: Requirements 8.3**

### Property 35: Loading State Display Logic

*For any* asynchronous data fetching operation, loading skeleton screens SHALL appear consistently during the operation

**Validates: Requirements 8.4**

### Property 36: Gesture Interaction Consistency

*For any* scrollable content, pull-to-refresh and swipe gestures SHALL work consistently and provide appropriate visual feedback

**Validates: Requirements 8.5, 8.7**

### Property 37: Real-time Status Update Accuracy

*For any* text input with real-time features, typing indicators and status updates SHALL reflect current state accurately

**Validates: Requirements 8.8**

### Property 38: Accessibility Touch Target Compliance

*For any* interactive UI element, the touch target area SHALL meet or exceed 44px minimum size in both dimensions

**Validates: Requirements 9.1**

### Property 39: Semantic Labeling Completeness

*For any* interactive element, appropriate accessibility labels SHALL be provided for screen reader compatibility

**Validates: Requirements 9.2**

### Property 40: Color Contrast Compliance

*For any* text and background color combination, the contrast ratio SHALL meet WCAG 2.1 AA standards (minimum 4.5:1 for normal text)

**Validates: Requirements 9.3**
### Property 41: Screen Reader Navigation Consistency

*For any* screen content, the heading hierarchy and navigation order SHALL be logically structured for screen readers

**Validates: Requirements 9.4**

### Property 42: Image Alternative Text Provision

*For any* meaningful image content, appropriate alternative text SHALL be provided for accessibility

**Validates: Requirements 9.5**

### Property 43: Keyboard Navigation Functionality

*For any* interactive element, keyboard navigation SHALL work correctly allowing users to navigate without touch input

**Validates: Requirements 9.6**

### Property 44: Focus Indicator Visibility

*For any* focusable element, focus indicators SHALL be visible with proper contrast ratios meeting accessibility standards

**Validates: Requirements 9.7**

### Property 45: Dynamic Text Size Support

*For any* text element, the layout SHALL accommodate system text size changes without breaking or becoming unreadable

**Validates: Requirements 9.8**

### Property 46: Inline Validation Error Display

*For any* form validation failure, inline error messages SHALL display with clear, actionable descriptions

**Validates: Requirements 10.1**

### Property 47: Network Error Recovery Consistency

*For any* network error condition, the error state SHALL provide retry functionality and appropriate user guidance

**Validates: Requirements 10.2**

### Property 48: Asynchronous Operation Feedback

*For any* asynchronous operation, appropriate loading messages SHALL be displayed based on the operation context

**Validates: Requirements 10.3**

### Property 49: Real-time Form Validation

*For any* form field input, real-time validation feedback SHALL be provided immediately upon input changes

**Validates: Requirements 10.4**

### Property 50: Success Action Confirmation

*For any* successfully completed action, appropriate success confirmation feedback SHALL be displayed to the user

**Validates: Requirements 10.5**
### Property 51: Empty State Guidance Helpfulness

*For any* empty content state, helpful guidance for next steps SHALL be provided to users

**Validates: Requirements 10.6**

### Property 52: Offline State Detection Accuracy

*For any* network connectivity loss, offline indicators SHALL appear consistently to inform users of connection status

**Validates: Requirements 10.7**

### Property 53: System Notification Display

*For any* system feedback event, snackbar notifications SHALL display consistently with appropriate messaging

**Validates: Requirements 10.8**

### Property 54: Screen Size Adaptation Range

*For any* screen size within the iPhone SE (375px) to iPhone Pro Max (428px) range, layouts SHALL adapt appropriately

**Validates: Requirements 11.1**

### Property 55: Aspect Ratio Preservation

*For any* media content across different screen sizes, aspect ratios SHALL be maintained correctly

**Validates: Requirements 11.2**

### Property 56: Safe Area Handling

*For any* device with notches or safe area constraints, content SHALL respect safe areas appropriately

**Validates: Requirements 11.3**

### Property 57: Screen Density Adaptation

*For any* screen density variation, margins and padding SHALL scale appropriately to maintain visual consistency

**Validates: Requirements 11.4**

### Property 58: Text Size Readability Preservation

*For any* system text size setting, content SHALL remain readable and layouts SHALL not break

**Validates: Requirements 11.5**

### Property 59: Grid Layout Responsiveness

*For any* available screen width, grid layouts SHALL adapt to display the appropriate number of columns

**Validates: Requirements 11.6**

### Property 60: Content Overflow Handling

*For any* content that exceeds screen width, horizontal scrolling SHALL be enabled appropriately

**Validates: Requirements 11.7**
### Property 61: Keyboard Content Adjustment

*For any* screen with text input, content SHALL adjust appropriately when the keyboard appears to maintain usability

**Validates: Requirements 11.8**

### Property 62: Image Optimization Processing

*For any* image, appropriate compression SHALL be applied while maintaining acceptable visual quality

**Validates: Requirements 12.1**

### Property 63: Lazy Loading Implementation

*For any* scrollable list with off-screen content, lazy loading SHALL work correctly to improve performance

**Validates: Requirements 12.2**

### Property 64: List Performance Maintenance

*For any* large data set rendering, list performance SHALL maintain 60fps frame rate consistently

**Validates: Requirements 12.4**

### Property 65: Resource Caching Consistency

*For any* frequently accessed resource (images, data), appropriate caching SHALL be implemented for performance

**Validates: Requirements 12.5**

### Property 66: Interaction Response Immediacy

*For any* user interaction, visual feedback SHALL be provided within acceptable performance thresholds

**Validates: Requirements 12.6**

### Property 67: Background Refresh Functionality

*For any* critical data that requires updates, background app refresh SHALL work appropriately when enabled

**Validates: Requirements 12.7**

### Property 68: Animation Performance Standards

*For any* animation or transition, 60fps performance SHALL be maintained consistently across all devices

**Validates: Requirements 12.8**

## Error Handling

### User Input Validation

The UI implements comprehensive client-side validation with real-time feedback:

**Form Validation Strategy:**
- Field-level validation with immediate feedback on blur
- Form-level validation before submission
- Clear, actionable error messages in Emergency Orange (#FF5722)
- Validation state preservation during navigation
- Accessibility-compliant error announcements

**Common Validation Patterns:**
```typescript
interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  customValidator?: (value: string) => boolean
  errorMessage: string
}
```

### Network Error Management

**Connection State Handling:**
- Offline detection with visual indicators
- Request timeout handling (30-second default)
- Retry mechanisms with exponential backoff
- Graceful degradation for offline scenarios
- Cache-first strategies for critical data

**Error State Components:**
- NetworkErrorState: Connection issues with retry
- ServerErrorState: 5xx errors with support contact
- NotFoundState: 404 errors with navigation options
- TimeoutState: Request timeouts with retry options
### Loading and Skeleton States

**Progressive Loading Strategy:**
- Skeleton screens matching content structure
- Shimmer animations with brand colors
- Progressive image loading with placeholders
- Staggered content reveals for perceived performance
- Loading timeouts with fallback states

**Implementation Pattern:**
```typescript
interface LoadingStateConfig {
  skeleton: boolean
  shimmer: boolean
  timeout: number
  fallbackComponent: React.ComponentType
  loadingText: string
}
```

### Permission and Security Errors

**Permission Flow Handling:**
- Location permission denied graceful fallback
- Camera/gallery access denied alternatives  
- Notification permission optional flow
- Clear benefit explanations before requests
- Settings deep-linking for permission changes

**Security Error Response:**
- Authentication session expiry handling
- Unauthorized access graceful redirect
- Rate limiting user-friendly messaging
- Data validation security feedback
- Secure error logging (no sensitive data)

## Testing Strategy

The UrbanFix UI/UX testing strategy employs a dual approach combining property-based testing for universal behaviors with example-based testing for specific scenarios and visual consistency.

### Property-Based Testing Implementation

**Testing Library Selection:**
- **React Native**: `@fast-check/jest` for property-based testing
- **Component Testing**: `@testing-library/react-native` for UI interactions
- **Accessibility**: `@testing-library/jest-native` for a11y assertions
- **Visual Regression**: `react-native-testing-library` with snapshots

**Property Test Configuration:**
```typescript
// jest.config.js property test setup
module.exports = {
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    './test-setup/property-tests.ts'
  ],
  testMatch: ['**/*.property.test.ts', '**/*.test.ts'],
}

// Property test configuration
const propertyTestConfig = {
  numRuns: 100, // Minimum iterations per property
  timeout: 30000, // 30 second timeout
  seed: process.env.FAST_CHECK_SEED,
}
```

**Property Test Examples:**

```typescript
// Property 3: Spacing System Compliance
describe('Spacing System Properties', () => {
  test('Property: All spacing values are multiples of 8', () => {
    fc.assert(fc.property(
      fc.constantFrom(...Object.values(spacing)),
      (spacingValue) => {
        expect(spacingValue % 8).toBe(0)
      }
    ), propertyTestConfig)
  })
})

// Property 40: Color Contrast Compliance  
describe('Accessibility Color Contrast', () => {
  test('Property: All text/background combinations meet WCAG AA', () => {
    fc.assert(fc.property(
      fc.constantFrom(...Object.values(colors.text)),
      fc.constantFrom(colors.surface, colors.background),
      (textColor, backgroundColor) => {
        const contrastRatio = calculateContrastRatio(textColor, backgroundColor)
        expect(contrastRatio).toBeGreaterThanOrEqual(4.5)
      }
    ), propertyTestConfig)
  })
})

// Property 54: Screen Size Adaptation
describe('Responsive Layout Properties', () => {
  test('Property: Layouts adapt within iPhone screen size range', () => {
    fc.assert(fc.property(
      fc.integer({ min: 375, max: 428 }), // iPhone SE to Pro Max
      (screenWidth) => {
        const { getByTestId } = render(<CustomerHome />, {
          screenWidth
        })
        const container = getByTestId('customer-home-container')
        expect(container).toHaveStyle({
          maxWidth: screenWidth - (spacing.margin * 2)
        })
      }
    ), propertyTestConfig)
  })
})
```

### Example-Based Unit Testing

**Specific Scenario Coverage:**
- Authentication flow progression testing
- Role-specific navigation verification  
- Error state component snapshots
- Accessibility compliance spot checks
- Performance benchmark validation

**Component Testing Pattern:**
```typescript
// Example-based tests for deterministic behaviors
describe('Splash Screen Component', () => {
  test('displays logo with 2.5 second animation', async () => {
    const { getByTestId } = render(<SplashScreen />)
    
    expect(getByTestId('urbanfix-logo')).toBeVisible()
    
    // Animation timing verification
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('auth/login')
    }, { timeout: 3000 })
  })
})

describe('Role Selection Component', () => {
  test('displays both customer and technician cards', () => {
    const { getByText } = render(<RoleSelection />)
    
    expect(getByText('Customer')).toBeVisible()
    expect(getByText('Technician')).toBeVisible()
  })
})
```

### Visual Regression Testing

**Snapshot Testing Strategy:**
- Component-level snapshots for stable UI elements
- Screen-level snapshots for layout verification
- Accessibility tree snapshots for screen reader testing
- Theme variation snapshots for dark/light modes

**Test Tagging Convention:**
Every property-based test includes a tag linking to its design document property:
```typescript
test('Property 25: Job Card Data Display', () => {
  // **Feature: urbanfix-uiux-design, Property 25: For any valid job data object, the JobCard component SHALL display device information, status, and pricing in the correct format**
  
  fc.assert(fc.property(
    arbitraryJobData(),
    (jobData) => {
      const { getByTestId } = render(<JobCard {...jobData} />)
      // Property assertions...
    }
  ), propertyTestConfig)
})
```

### Integration Testing Approach

**Cross-Component Testing:**
- Authentication flow integration tests
- Navigation stack integration verification
- Form submission end-to-end testing
- Real-time feature integration testing
- Performance integration benchmarks

**Testing Environment Setup:**
- Mock Supabase client for consistent data
- Mock location services for predictable testing
- Mock camera/gallery for file upload testing
- Mock network conditions for error state testing
- Accessibility testing with screen reader simulation

This comprehensive testing strategy ensures the UI/UX implementation maintains consistency, accessibility, and performance standards while providing confidence in the user experience across all supported scenarios and device configurations.