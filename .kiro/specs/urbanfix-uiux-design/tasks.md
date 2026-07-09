# Implementation Plan: UrbanFix UI/UX Design

## Overview

This implementation plan converts the comprehensive UrbanFix UI/UX design specification into actionable coding tasks. The implementation follows a layered approach: establishing the design system foundation, building reusable components, implementing authentication flows, creating customer and technician experiences, and ensuring accessibility and performance standards.

The plan prioritizes early validation through incremental development, property-based testing for universal behaviors, and thorough integration testing. Each task builds on previous components while maintaining the Corporate Modernism aesthetic and trust-focused user experience.

## Tasks

- [x] 1. Establish design system foundation and core constants
  - Create design system constants file with color palette, typography scale, and spacing tokens
  - Set up theme configuration with Deep Trust Blue (#031636) and Emergency Orange (#FF5722)
  - Define spacing system based on 8-point grid (8px, 16px, 24px, etc.)
  - Configure typography using Inter font family with 7 distinct text styles
  - Implement elevation system with tonal layering and ambient shadows
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]* 1.1 Write property test for design system compliance
  - **Property 3: Spacing System Compliance**
  - **Validates: Requirements 2.3**

- [x] 2. Build atomic UI components with accessibility standards
  - [x] 2.1 Implement Button component with variants and accessibility
    - Create Primary, Secondary, Ghost, and Danger button variants
    - Implement 44px minimum touch target compliance for accessibility
    - Add press animation with 0.95 scale transform and haptic feedback
    - Include loading state with activity indicator
    - _Requirements: 2.6, 8.1, 8.2, 9.1_

  - [ ]* 2.2 Write property tests for Button component
    - **Property 4: Button Touch Target Accessibility**
    - **Validates: Requirements 2.6**

  - [x] 2.3 Implement Input component with floating labels
    - Create input with floating label animation and focus states
    - Implement real-time validation with inline error messaging
    - Add support for helper text and error states with Emergency Orange
    - Ensure proper keyboard navigation and accessibility labels
    - _Requirements: 2.7, 10.1, 10.4, 9.2, 9.6_

  - [ ]* 2.4 Write property tests for Input component validation
    - **Property 5: Input Component State Consistency**
    - **Validates: Requirements 2.7**

  - [x] 2.5 Implement Card component with elevation variants
    - Create Default, Outlined, and Elevated card variants
    - Implement 12px border radius and proper drop shadows
    - Add press animation for interactive cards
    - Ensure accessibility compliance with semantic roles
    - _Requirements: 2.8, 8.2, 9.2_

- [x] 3. Build molecular components for data display
  - [x] 3.1 Implement StatusBadge component with semantic colors
    - Create status badge with color-coded indicators (success, warning, error)
    - Map job statuses to appropriate colors and text
    - Implement proper contrast ratios for accessibility
    - _Requirements: 7.3, 9.3_

  - [ ]* 3.2 Write property tests for StatusBadge color consistency
    - **Property 27: Status Badge Color Consistency**
    - **Validates: Requirements 7.3**

  - [x] 3.3 Implement JobCard component for repair display
    - Create job card with device info, status, and pricing display
    - Include device icon selection based on category
    - Add progress indicators for active jobs
    - Format pricing in Nigerian Naira with proper localization
    - _Requirements: 7.1, 7.8_

  - [ ]* 3.4 Write property tests for JobCard data display
    - **Property 25: Job Card Data Display**
    - **Validates: Requirements 7.1**

  - [x] 3.5 Implement TechnicianCard component
    - Create technician card with avatar, rating, and verification status
    - Include distance calculation and availability indicators
    - Add specialty tags as pill-shaped badges
    - Implement proper fallback for missing avatar images
    - _Requirements: 7.2, 5.6_

  - [ ]* 3.6 Write property tests for TechnicianCard rendering
    - **Property 26: Technician Card Information Rendering**
    - **Validates: Requirements 7.2**

- [x] 4. Checkpoint - Core components validation
  - Ensure all atomic and molecular components pass tests
  - Verify accessibility compliance with screen reader testing
  - Ask the user if questions arise about component behavior

- [x] 5. Implement authentication flow screens
  - [x] 5.1 Create SplashScreen with animated logo reveal
    - Implement 2.5-second animation with UrbanFix logo
    - Add fade-slide transition to phone login screen
    - Use Deep Trust Blue background with proper branding
    - _Requirements: 1.1, 1.2_

  - [x] 5.2 Implement PhoneLoginScreen with validation
    - Create country picker with Nigeria (+234) default
    - Add phone number input with format validation and real-time feedback
    - Implement navigation to OTP screen after validation
    - _Requirements: 1.3, 10.1, 10.4_

  - [ ]* 5.3 Write property tests for phone number validation
    - **Property 1: Phone Number Validation Consistency**
    - **Validates: Requirements 1.3**

  - [x] 5.4 Implement OTPVerificationScreen with timer
    - Create 6-digit OTP input with auto-advance functionality
    - Add countdown timer with resend functionality
    - Implement visual feedback for correct/incorrect codes
    - _Requirements: 1.4, 1.5_

  - [ ]* 5.5 Write property tests for timer countdown accuracy
    - **Property 2: Timer Countdown Accuracy**
    - **Validates: Requirements 1.5**

  - [x] 5.6 Implement RoleSelectionScreen
    - Create high-contrast cards for Customer/Technician selection
    - Add clear iconography and descriptive text for each role
    - Implement smooth transition animations to profile setup
    - _Requirements: 1.6, 1.7, 1.8_

- [x] 6. Implement profile management interfaces
  - [x] 6.1 Create AvatarUpload component with image processing
    - Implement camera/gallery selection modal
    - Add circular image cropping functionality
    - Provide upload progress indicators and completion feedback
    - Handle image validation and error states
    - _Requirements: 4.1, 4.8_

  - [ ]* 6.2 Write property tests for avatar upload processing
    - **Property 10: Avatar Upload Processing**
    - **Validates: Requirements 4.1**

  - [x] 6.3 Implement CustomerProfileSetup screen
    - Create form with full name input and real-time validation
    - Integrate AvatarUpload component
    - Add location permission request with benefit explanation
    - Implement form validation with inline error messaging
    - _Requirements: 4.1, 4.2, 4.3, 4.7_

  - [ ]* 6.4 Write property tests for form validation consistency
    - **Property 11: Form Validation Consistency**
    - **Validates: Requirements 4.2, 4.7**

  - [x] 6.5 Implement TechnicianProfileSetup screen
    - Add additional verification fields for NIN and bank details
    - Create document upload interface with progress tracking
    - Implement multi-step form with progress indicators
    - Add confirmation flows for profile modifications
    - _Requirements: 4.4, 4.5, 4.6, 4.8_

  - [ ]* 6.6 Write property tests for document upload interface
    - **Property 12: Document Upload Interface Robustness**
    - **Validates: Requirements 4.5**

- [x] 7. Implement location services and address management
  - [x] 7.1 Create AddressPicker component with map integration
    - Integrate Google Maps with current location detection
    - Implement drag-to-adjust pin functionality
    - Add manual address entry with autocomplete suggestions
    - Handle location permission requests with clear explanations
    - _Requirements: 5.1, 5.2, 5.3, 5.7_

  - [ ]* 7.2 Write property tests for address autocomplete
    - **Property 15: Address Autocomplete Functionality**
    - **Validates: Requirements 5.3**

  - [x] 7.3 Implement AddressManagement component
    - Create interface for saving multiple addresses with custom labels
    - Add address validation with visual confirmation
    - Implement distance calculations for technician matching
    - Handle offline scenarios with appropriate messaging
    - _Requirements: 5.4, 5.5, 5.6, 5.8_

  - [ ]* 7.4 Write property tests for address validation
    - **Property 16: Address Validation Consistency**
    - **Validates: Requirements 5.4**

- [x] 8. Checkpoint - Authentication and profile flows complete
  - Test complete authentication flow from splash to profile setup
  - Verify location services integration and permissions
  - Ensure all form validation and error handling works correctly
  - Ask the user if questions arise about authentication behavior

- [x] 9. Implement customer home screen experience
  - [x] 9.1 Create CustomerHomeScreen layout structure
    - Implement header section with location toggle and user greeting
    - Add prominent search bar with "What needs fixing?" placeholder
    - Create 4-column grid layout for repair categories
    - Add promotional banner with Corporate Modernism styling
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 9.2 Write property tests for location toggle functionality
    - **Property 6: Location Toggle Functionality**
    - **Validates: Requirements 3.1**

  - [ ]* 9.3 Write property tests for grid layout preservation
    - **Property 7: Grid Layout Preservation**
    - **Validates: Requirements 3.3**

  - [x] 9.4 Implement nearby technicians horizontal scroll
    - Create horizontal scrollable TechnicianCard list
    - Add rating and availability status display
    - Implement distance and ETA information
    - _Requirements: 3.5_

  - [ ]* 9.5 Write property tests for technician card consistency
    - **Property 8: Technician Card Rendering Consistency**
    - **Validates: Requirements 3.5**

  - [x] 9.6 Add active repair status and pull-to-refresh
    - Display active repair status card for ongoing jobs
    - Implement floating action button for quick repair requests
    - Add pull-to-refresh gesture with visual feedback
    - _Requirements: 3.6, 3.7, 3.8_

  - [ ]* 9.7 Write property tests for pull-to-refresh behavior
    - **Property 9: Pull-to-Refresh Behavior**
    - **Validates: Requirements 3.8**

- [ ] 10. Implement navigation system and app structure
  - [x] 10.1 Create bottom tab navigation structure
    - Implement 5-section bottom tab bar for customers
    - Add Material Design icons with active state indicators
    - Create role-based navigation adaptation
    - _Requirements: 6.1, 6.2, 6.7_

  - [x] 10.2 Implement screen transitions and stack navigation
    - Add consistent animation curves for screen transitions
    - Create stack navigation within each tab section
    - Implement proper headers with back navigation
    - Handle deep linking for notification navigation
    - _Requirements: 6.3, 6.4, 6.5, 6.6_

  - [ ]* 10.3 Write property tests for navigation animation consistency
    - **Property 20: Navigation Animation Consistency**
    - **Validates: Requirements 6.3**

  - [-] 10.4 Add navigation state persistence
    - Maintain navigation state across app backgrounding
    - Implement proper navigation history management
    - Handle app state restoration correctly
    - _Requirements: 6.8_

  - [ ]* 10.5 Write property tests for navigation state persistence
    - **Property 24: Navigation State Persistence**
    - **Validates: Requirements 6.8**

- [ ] 11. Implement error handling and feedback systems
  - [-] 11.1 Create error state components
    - Implement EmptyState component with illustrations and messaging
    - Create LoadingSkeleton components matching content layout
    - Add ErrorState component with retry functionality
    - Implement NetworkErrorState for connection issues
    - _Requirements: 7.4, 7.5, 7.6, 10.2_

  - [ ]* 11.2 Write property tests for loading skeleton layout matching
    - **Property 28: Loading Skeleton Layout Matching**
    - **Validates: Requirements 7.5**

  - [-] 11.3 Implement validation and feedback systems
    - Create inline validation with real-time feedback
    - Add success confirmations for completed actions
    - Implement snackbar notifications for system feedback
    - Add offline indicators for network connectivity loss
    - _Requirements: 10.1, 10.4, 10.5, 10.7, 10.8_

  - [ ]* 11.4 Write property tests for inline validation display
    - **Property 46: Inline Validation Error Display**
    - **Validates: Requirements 10.1**

- [ ] 12. Implement accessibility and interaction patterns
  - [~] 12.1 Add haptic feedback and microinteractions
    - Implement haptic feedback for primary actions and confirmations
    - Add press animations with consistent timing (300ms cubic-bezier)
    - Create loading states with skeleton screens
    - Add typing indicators and real-time status updates
    - _Requirements: 8.1, 8.3, 8.4, 8.8_

  - [ ]* 12.2 Write property tests for haptic feedback consistency
    - **Property 32: Haptic Feedback Consistency**
    - **Validates: Requirements 8.1**

  - [~] 12.3 Ensure accessibility compliance
    - Verify all touch targets meet 44px minimum requirements
    - Add proper semantic labels for interactive elements
    - Implement focus indicators with proper visual contrast
    - Support dynamic text sizing for readability needs
    - _Requirements: 9.1, 9.2, 9.7, 9.8_

  - [ ]* 12.4 Write property tests for accessibility touch targets
    - **Property 38: Accessibility Touch Target Compliance**
    - **Validates: Requirements 9.1**

  - [ ]* 12.5 Write property tests for color contrast compliance
    - **Property 40: Color Contrast Compliance**
    - **Validates: Requirements 9.3**

- [ ] 13. Implement responsive layout and performance optimization
  - [~] 13.1 Add responsive layout support
    - Implement screen size adaptation (iPhone SE to Pro Max)
    - Add safe area handling for notched devices
    - Create adaptive margins and padding for different densities
    - Ensure content remains readable at various text sizes
    - _Requirements: 11.1, 11.3, 11.4, 11.5_

  - [ ]* 13.2 Write property tests for screen size adaptation
    - **Property 54: Screen Size Adaptation Range**
    - **Validates: Requirements 11.1**

  - [~] 13.3 Implement performance optimizations
    - Add image optimization with appropriate compression
    - Implement lazy loading for off-screen content
    - Optimize list rendering for large data sets
    - Cache frequently accessed images and data
    - _Requirements: 12.1, 12.2, 12.4, 12.5_

  - [ ]* 13.4 Write property tests for image optimization
    - **Property 62: Image Optimization Processing**
    - **Validates: Requirements 12.1**

  - [~] 13.5 Add keyboard and gesture handling
    - Implement proper content adjustment for keyboard appearance
    - Add swipe gestures for appropriate list interactions
    - Ensure horizontal scrolling for content exceeding screen width
    - Optimize animation performance to maintain 60fps
    - _Requirements: 11.8, 8.7, 11.7, 12.8_

  - [ ]* 13.6 Write property tests for animation performance
    - **Property 68: Animation Performance Standards**
    - **Validates: Requirements 12.8**

- [ ] 14. Integration testing and final validation
  - [~] 14.1 Create integration tests for complete user flows
    - Test complete authentication flow from splash to home screen
    - Verify customer home screen functionality with all components
    - Test profile setup and editing flows for both roles
    - Validate location services integration and address management
    - _Requirements: All requirements integration validation_

  - [ ]* 14.2 Write property tests for complete flow consistency
    - **Property 41: Screen Reader Navigation Consistency**
    - **Validates: Requirements 9.4**

  - [~] 14.3 Performance and accessibility validation
    - Run accessibility audits with screen reader testing
    - Validate performance benchmarks on various devices
    - Test responsive behavior across all supported screen sizes
    - Verify offline functionality and error recovery
    - _Requirements: 9.1-9.8, 11.1-11.8, 12.1-12.8_

- [~] 15. Final checkpoint - Complete UI/UX implementation
  - Ensure all components pass property-based and unit tests
  - Verify complete authentication and customer home flows work end-to-end
  - Validate accessibility compliance meets WCAG 2.1 AA standards
  - Test performance optimization and responsive design
  - Ask the user if questions arise about the complete implementation

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability and validation
- Property tests validate universal correctness properties from the design document
- Integration tests ensure complete user flows work as specified
- The implementation prioritizes accessibility compliance and performance optimization
- All visual elements follow the Corporate Modernism aesthetic with Deep Trust Blue and Emergency Orange
- Components are built following atomic design principles for maintainability and reusability

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.3", "2.5"] },
    { "id": 2, "tasks": ["2.2", "2.4", "3.1", "3.3", "3.5"] },
    { "id": 3, "tasks": ["3.2", "3.4", "3.6", "5.1", "5.2"] },
    { "id": 4, "tasks": ["5.3", "5.4", "5.6", "6.1"] },
    { "id": 5, "tasks": ["5.5", "6.2", "6.3", "6.5"] },
    { "id": 6, "tasks": ["6.4", "6.6", "7.1", "7.3"] },
    { "id": 7, "tasks": ["7.2", "7.4", "9.1", "9.4"] },
    { "id": 8, "tasks": ["9.2", "9.3", "9.5", "9.6", "10.1"] },
    { "id": 9, "tasks": ["9.7", "10.2", "10.4", "11.1"] },
    { "id": 10, "tasks": ["10.3", "10.5", "11.2", "11.3", "12.1"] },
    { "id": 11, "tasks": ["11.4", "12.2", "12.3", "13.1"] },
    { "id": 12, "tasks": ["12.4", "12.5", "13.2", "13.3", "13.5"] },
    { "id": 13, "tasks": ["13.4", "13.6", "14.1", "14.3"] },
    { "id": 14, "tasks": ["14.2"] }
  ]
}
```