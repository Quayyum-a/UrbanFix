# Implementation Plan: UrbanFix Platform

## Overview

This implementation plan builds upon the existing foundation (React Native setup, Supabase configuration, UI components) to deliver the complete UrbanFix platform as specified in the requirements and design documents. The plan focuses on implementing the core business logic, database schema, authentication flows, and feature-complete mobile applications for customers and technicians.

**Implementation Approach**: 
- Build upon existing TypeScript/React Native foundation
- Implement database schema with RLS policies
- Create feature-complete authentication flows
- Develop core business logic for job management and payments
- Implement real-time communication and notifications
- Add comprehensive property-based testing for correctness validation

## Tasks

- [x] 1. Database Schema and Security Implementation
  - Implement complete PostgreSQL schema with 9 tables and constraints
  - Create Row Level Security policies for data protection
  - Set up database functions and triggers for business logic
  - _Requirements: 1.1, 2.4, 28.3_

- [x] 2. Authentication and User Management System
  - [x] 2.1 Implement phone-based authentication with OTP verification
    - Create phone number validation and OTP generation
    - Implement JWT session management with automatic refresh
    - Set up role-based access control system
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [ ]* 2.2 Write property test for phone authentication
    - **Property 1: Phone Number Format Validation**
    - **Validates: Requirements 1.1**
  
  - [ ]* 2.3 Write property test for JWT session creation
    - **Property 2: JWT Session Creation for Valid OTP**
    - **Validates: Requirements 1.3**

  - [x] 2.4 Implement user role management and profile setup
    - Create role selection interface (Customer/Technician)
    - Implement profile creation workflows
    - Set up immutable role assignment system
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [ ]* 2.5 Write property test for role immutability
    - **Property 3: Role Immutability**
    - **Validates: Requirements 2.4**
  
  - [ ]* 2.6 Write property test for role-based access control
    - **Property 4: Role-Based Access Control**
    - **Validates: Requirements 2.5**

- [x] 3. Customer Profile and Location Management
  - [x] 3.1 Implement customer profile management system
    - Create profile setup and editing interfaces
    - Implement avatar upload with file validation
    - Set up location permission and address services
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 3.2 Integrate Google Maps for location services
    - Implement address geocoding and validation
    - Create map-based address picker interface
    - Set up distance calculation for technician matching
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5_

- [~] 4. Checkpoint - Ensure authentication and profiles are working
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Technician Verification and Management
  - [-] 5.1 Implement technician verification workflow
    - Create NIN validation and document upload system
    - Implement bank account details collection
    - Set up admin approval workflow with rejection handling
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_
  
  - [~] 5.2 Implement technician pricing management
    - Create labor pricing setup for repair categories
    - Implement dynamic pricing updates by technicians
    - Set up pricing display for customer selection
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [~] 5.3 Create technician performance tracking system
    - Implement earnings calculation and display
    - Set up job completion metrics tracking
    - Create rating and review aggregation system
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

- [ ] 6. Parts Catalogue and Pricing System
  - [~] 6.1 Implement parts catalogue management
    - Create parts database with brand/model/category structure
    - Implement pricing retrieval and display system
    - Set up admin controls for catalogue management
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ]* 6.2 Write property test for parts catalogue consistency
    - **Property 5: Repair Category Display Consistency**
    - **Validates: Requirements 5.3**
  
  - [ ]* 6.3 Write property test for parts pricing retrieval
    - **Property 6: Parts Catalogue Pricing Retrieval**
    - **Validates: Requirements 5.4**
  
  - [~] 6.4 Implement parts request system for technicians
    - Create part request interface for unlisted items
    - Set up admin review and catalogue addition workflow
    - Implement technician notification when parts added
    - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5_

- [ ] 7. Device Repair Booking System
  - [~] 7.1 Create device selection and repair category interface
    - Implement device type, brand, and model selection
    - Create repair category selection with pricing preview
    - Set up photo upload for device condition documentation
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ]* 7.2 Write property test for photo upload validation
    - **Property 7: Photo Upload Validation**
    - **Validates: Requirements 5.5**
  
  - [~] 7.3 Implement technician recommendation and selection
    - Create technician matching algorithm (highest rating + availability)
    - Implement technician profile display with ratings
    - Set up booking confirmation and address specification
    - _Requirements: 5.6, 5.7, 5.8_
  
  - [ ]* 7.4 Write property test for technician recommendation
    - **Property 8: Technician Recommendation Algorithm**
    - **Validates: Requirements 5.7**

- [ ] 8. Payment Integration and Escrow System
  - [~] 8.1 Implement Paystack payment integration
    - Set up payment initialization and collection
    - Create payment verification and webhook handling
    - Implement error handling and retry mechanisms
    - _Requirements: 9.1, 9.2_
  
  - [ ]* 8.2 Write property test for payment escrow status
    - **Property 9: Payment Escrow Status Management**
    - **Validates: Requirements 9.2**
  
  - [~] 8.3 Implement escrow payment system
    - Create payment holding mechanism until job completion
    - Implement customer payment release authorization
    - Set up automatic release after 72 hours
    - _Requirements: 9.3, 9.4, 9.5, 9.6_
  
  - [ ]* 8.4 Write property test for fund protection during repair
    - **Property 10: Fund Protection During Repair**
    - **Validates: Requirements 9.3**
  
  - [ ]* 8.5 Write property test for dispute fund holding
    - **Property 11: Dispute Fund Holding**
    - **Validates: Requirements 9.5**
  
  - [ ]* 8.6 Write property test for auto-release timing
    - **Property 12: Auto-Release Timing Compliance**
    - **Validates: Requirements 9.6**

- [ ] 9. Job Workflow and Status Management
  - [~] 9.1 Implement job creation and assignment system
    - Create job creation workflow after payment confirmation
    - Implement technician notification and assignment logic
    - Set up job assignment exclusivity and conflict prevention
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  
  - [~] 9.2 Create job status workflow management
    - Implement 8-state job lifecycle (booked → complete)
    - Create status transition validation and automation
    - Set up status update notifications for all parties
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_
  
  - [ ]* 9.3 Write property test for job status lifecycle
    - **Property 13: Job Status Lifecycle Consistency**
    - **Validates: Requirements 10.1-10.8**

- [~] 10. Checkpoint - Ensure core job flow is working
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Real-time Communication System
  - [~] 11.1 Implement job-based chat system
    - Create real-time chat threads between customers and technicians
    - Implement message threading scoped to specific jobs
    - Set up message delivery confirmation and status indicators
    - _Requirements: 11.1, 11.2, 11.6_
  
  - [ ]* 11.2 Write property test for chat thread creation
    - **Property 14: Chat Thread Creation**
    - **Validates: Requirements 11.1**
  
  - [ ]* 11.3 Write property test for message delivery
    - **Property 15: Message Delivery Completeness**
    - **Validates: Requirements 11.2**
  
  - [~] 11.4 Implement message features and file sharing
    - Add message length validation (1000 characters max)
    - Implement image sharing (JPEG/PNG, 10MB max)
    - Set up message history persistence and typing indicators
    - _Requirements: 11.3, 11.4, 11.5, 11.7_
  
  - [ ]* 11.5 Write property test for message length enforcement
    - **Property 16: Message Length Enforcement**
    - **Validates: Requirements 11.3**
  
  - [ ]* 11.6 Write property test for image file sharing
    - **Property 17: Image File Sharing Validation**
    - **Validates: Requirements 11.4**
  
  - [ ]* 11.7 Write property test for message history persistence
    - **Property 18: Message History Persistence**
    - **Validates: Requirements 11.5**
  
  - [ ]* 11.8 Write property test for message delivery confirmation
    - **Property 19: Message Delivery Confirmation**
    - **Validates: Requirements 11.6**

- [ ] 12. Push Notification and SMS System
  - [~] 12.1 Implement push notification infrastructure
    - Set up Expo Push Notification service integration
    - Create notification triggering for job status changes
    - Implement notification preferences and targeting
    - _Requirements: 12.1, 12.2, 12.4, 12.5_
  
  - [~] 12.2 Create SMS backup notification system
    - Integrate SMS gateway for OTP delivery and critical updates
    - Implement SMS fallback for failed push notifications
    - Set up branded SMS templates with job information
    - _Requirements: 12.3, 23.1, 23.2, 23.3, 23.4, 23.5_

- [ ] 13. Customer Job Management Interface
  - [~] 13.1 Implement job discovery and history system
    - Create technician job discovery interface with filtering
    - Implement customer job history ("My Repairs") interface
    - Set up job detail views with status timeline
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 14.1, 14.2, 14.3, 14.4_
  
  - [~] 13.2 Create payment release and completion system
    - Implement customer payment release authorization interface
    - Set up job completion confirmation workflow
    - Create dispute initiation system for unsatisfactory work
    - _Requirements: 14.5, 15.1, 15.2, 15.3, 15.4, 15.5_
  
  - [~] 13.3 Implement rating and review system
    - Create 5-star rating interface with written reviews
    - Implement review display on technician profiles
    - Set up rating aggregation and display system
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

- [ ] 14. Technician Dashboard and Job Management
  - [~] 14.1 Create technician job discovery interface
    - Implement available jobs listing with filters
    - Create job acceptance/decline workflow
    - Set up job details view with customer information
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [~] 14.2 Implement technician job workflow management
    - Create job status update interface for technicians
    - Implement progress photo upload and documentation
    - Set up job completion marking and customer notification
    - _Requirements: 8.5, 8.6_

- [ ] 15. Admin Panel and Management System
  - [~] 15.1 Create technician verification management
    - Implement admin interface for technician document review
    - Create approval/rejection workflow with reason tracking
    - Set up technician suspension and activation controls
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_
  
  - [~] 15.2 Implement dispute resolution system
    - Create dispute management interface for admins
    - Implement resolution options (refund/payment/split)
    - Set up automated payment execution based on admin decisions
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 20.1, 20.2, 20.3, 20.4, 20.5_
  
  - [~] 15.3 Create rider management system
    - Implement rider assignment interface in admin dashboard
    - Set up pickup scheduling and tracking workflow
    - Create rider contact information management
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5_

- [ ] 16. Business Analytics and Reporting
  - [~] 16.1 Implement analytics tracking system
    - Set up job completion rate tracking by technician/category
    - Create customer satisfaction monitoring and sentiment analysis
    - Implement performance metrics and trend analysis
    - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5_

- [ ] 17. Security and Data Protection Implementation
  - [~] 17.1 Implement comprehensive security measures
    - Set up AES-256 encryption for data at rest
    - Implement TLS 1.3 for all data transmission
    - Create comprehensive audit logging system
    - _Requirements: 28.1, 28.2, 28.4_
  
  - [ ]* 17.2 Write property test for RLS enforcement
    - **Property 20: Row Level Security Enforcement**
    - **Validates: Requirements 28.3**
  
  - [ ]* 17.3 Write property test for audit log generation
    - **Property 21: Audit Log Generation**
    - **Validates: Requirements 28.4**
  
  - [~] 17.4 Implement data privacy compliance
    - Create user data deletion workflow (GDPR compliance)
    - Set up data retention policies and automated cleanup
    - Implement privacy controls and consent management
    - _Requirements: 28.5_
  
  - [ ]* 17.5 Write property test for data deletion compliance
    - **Property 22: Data Deletion Compliance**
    - **Validates: Requirements 28.5**

- [ ] 18. File Upload and Storage Management
  - [~] 18.1 Implement secure file upload system
    - Set up file type validation (JPEG/PNG only)
    - Implement file size restrictions (10MB max for docs, 5MB for photos)
    - Create image compression and optimization pipeline
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5_

- [ ] 19. Auto-Release Payment System Implementation
  - [~] 19.1 Create automated payment release system
    - Implement 72-hour automatic payment release logic
    - Set up hourly batch processing for eligible payments
    - Create notification system for auto-releases
    - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5_

- [ ] 20. Edge Functions for Business Logic
  - [~] 20.1 Implement payment release Edge Function
    - Create secure payment release endpoint with auth validation
    - Implement Paystack transfer integration for technician payouts
    - Set up idempotency checking and error handling
    - _Requirements: 9.4, 15.2, 15.3_
  
  - [~] 20.2 Create job completion Edge Function
    - Implement job status update endpoint with validation
    - Set up automatic customer notification on completion
    - Create job completion logging and audit trail
    - _Requirements: 10.6, 12.1_
  
  - [~] 20.3 Implement Paystack webhook handler
    - Create secure webhook endpoint with signature verification
    - Implement payment confirmation and escrow status updates
    - Set up webhook retry handling and failure recovery
    - _Requirements: 9.2, 8.1_
  
  - [~] 20.4 Create admin approval Edge Function
    - Implement technician approval/rejection endpoint
    - Set up automated notification to technicians on status change
    - Create approval audit logging and tracking
    - _Requirements: 4.7, 4.8, 19.3, 19.4_

- [ ] 21. Final Integration and Testing
  - [~] 21.1 Implement end-to-end job workflow testing
    - Test complete customer booking → technician assignment → payment → completion flow
    - Validate real-time communication throughout job lifecycle
    - Test dispute resolution and admin intervention scenarios
    - _All Requirements Integration Testing_
  
  - [ ]* 21.2 Run comprehensive property-based test suite
    - Execute all 22 correctness properties against production-like data
    - Validate system behavior under edge cases and high load
    - Test security properties and access control enforcement
    - _Requirements: All property validations_
  
  - [~] 21.3 Performance optimization and monitoring setup
    - Optimize database queries and add performance indexes
    - Set up application performance monitoring and alerting
    - Implement error tracking and automated recovery systems
    - _Requirements: Performance and reliability validation_

- [~] 22. Final checkpoint - Complete system validation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property-based tests validate the 22 correctness properties defined in the design document
- The implementation builds upon the existing React Native/TypeScript foundation
- All database operations use Row Level Security for data protection
- Real-time features utilize Supabase's built-in realtime subscriptions
- Payment processing uses Paystack with comprehensive error handling
- The system supports both customer and technician mobile applications
- Admin functionality is accessible through a separate admin interface
- All external integrations (SMS, Maps, Payment) include fallback mechanisms

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2.1", "3.1"] },
    { "id": 1, "tasks": ["2.2", "2.3", "2.4", "3.2", "5.1"] },
    { "id": 2, "tasks": ["2.5", "2.6", "5.2", "5.3", "6.1"] },
    { "id": 3, "tasks": ["6.2", "6.3", "6.4", "7.1", "8.1"] },
    { "id": 4, "tasks": ["7.2", "7.3", "8.2", "8.3", "9.1"] },
    { "id": 5, "tasks": ["7.4", "8.4", "8.5", "8.6", "9.2"] },
    { "id": 6, "tasks": ["9.3", "11.1", "12.1"] },
    { "id": 7, "tasks": ["11.2", "11.3", "11.4", "12.2", "13.1"] },
    { "id": 8, "tasks": ["11.5", "11.6", "11.7", "11.8", "13.2", "14.1"] },
    { "id": 9, "tasks": ["13.3", "14.2", "15.1", "18.1"] },
    { "id": 10, "tasks": ["15.2", "15.3", "16.1", "19.1"] },
    { "id": 11, "tasks": ["17.1", "20.1", "20.2"] },
    { "id": 12, "tasks": ["17.2", "17.3", "17.4", "20.3", "20.4"] },
    { "id": 13, "tasks": ["17.5", "21.1"] },
    { "id": 14, "tasks": ["21.2", "21.3"] }
  ]
}
```