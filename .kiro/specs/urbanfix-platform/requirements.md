# Requirements Document

## Introduction

UrbanFix is a mobile-first repair marketplace platform that connects customers needing device repairs with verified technicians. The platform operates on a managed pricing model with an escrow payment system, focusing on trust, transparency, and operational efficiency. This requirements specification consolidates the functional, business, and technical requirements from the existing MVP specification, engineering guide, and documentation into formal, testable requirements following EARS patterns and INCOSE quality standards.

## Glossary

- **Customer**: A user who requests device repair services through the platform
- **Technician**: A verified repair professional who provides repair services
- **Admin**: A platform administrator who manages operations and disputes
- **Job**: A complete repair request from booking to completion
- **Escrow_System**: Payment holding mechanism that secures funds until job completion
- **Parts_Catalogue**: Platform-managed database of device parts and pricing
- **OTP**: One-Time Password for authentication
- **RLS**: Row Level Security for database access control
- **Paystack**: Third-party payment processing service
- **Supabase**: Backend-as-a-Service platform providing database, auth, and real-time features

## Requirements

### Requirement 1: User Authentication System

**User Story:** As a user, I want to authenticate using my phone number, so that I can securely access the platform.

#### Acceptance Criteria

1. WHEN a user enters a Nigerian phone number in +234XXXXXXXXXX format, THE Authentication_System SHALL validate the format before sending OTP
2. WHEN a valid phone number is submitted, THE Authentication_System SHALL send a 6-digit OTP via SMS within 30 seconds
3. WHEN a user enters the correct OTP within 5 minutes, THE Authentication_System SHALL create a JWT session token
4. WHERE a user has not completed registration, THE Authentication_System SHALL redirect to role selection
5. IF an invalid OTP is entered 3 times, THEN THE Authentication_System SHALL block further attempts for 15 minutes

### Requirement 2: User Role Management

**User Story:** As a new user, I want to select my role on the platform, so that I can access role-specific features.

#### Acceptance Criteria

1. WHEN a new user completes OTP verification, THE Platform SHALL present role selection screen with Customer and Technician options
2. WHEN a user selects Customer role, THE Platform SHALL redirect to customer profile setup
3. WHEN a user selects Technician role, THE Platform SHALL redirect to technician verification workflow
4. THE Platform SHALL store the selected role immutably in the user record
5. WHERE a user attempts to access features outside their role, THE Platform SHALL deny access with appropriate messaging

### Requirement 3: Customer Profile Management

**User Story:** As a customer, I want to complete my profile setup, so that I can book repair services.

#### Acceptance Criteria

1. WHEN a customer selects their role, THE Platform SHALL require full name entry with minimum 2 characters
2. WHERE a customer wants to add a profile photo, THE Platform SHALL accept JPEG or PNG files up to 5MB
3. WHEN profile setup is complete, THE Platform SHALL request location permission for address services
4. THE Platform SHALL store the customer's default pickup address for future bookings
5. WHEN customer profile is complete, THE Platform SHALL redirect to the home screen

### Requirement 4: Technician Verification System

**User Story:** As a technician, I want to complete verification, so that I can receive and accept repair jobs.

#### Acceptance Criteria

1. WHEN a technician selects their role, THE Platform SHALL require NIN (National ID Number) entry with 11-digit validation
2. THE Platform SHALL require upload of NIN document photograph with file size validation up to 10MB
3. THE Platform SHALL require shop address entry with minimum 10 characters
4. THE Platform SHALL require bank account details including bank name, account number, and account holder name
5. WHEN all verification documents are submitted, THE Platform SHALL set verification status to 'pending'
6. WHILE verification is pending, THE Platform SHALL prevent job assignment to the technician
7. WHEN admin approves verification, THE Platform SHALL set status to 'approved' and enable job reception
8. IF admin rejects verification, THEN THE Platform SHALL provide rejection reason and allow resubmission

### Requirement 5: Device Repair Booking System

**User Story:** As a customer, I want to book a device repair, so that I can get my device fixed by a qualified technician.

#### Acceptance Criteria

1. WHEN a customer initiates booking, THE Platform SHALL present device type selection with Smartphone, Laptop, Tablet, Desktop, and Other options
2. WHEN a device type is selected, THE Platform SHALL provide searchable brand and model selection
3. WHEN a device model is selected, THE Platform SHALL display available repair categories with pricing preview
4. THE Platform SHALL retrieve part pricing from Parts_Catalogue and display fixed pricing breakdown
5. WHERE a customer wants to document device condition, THE Platform SHALL accept up to 3 photographs with 5MB limit each
6. WHEN pricing is confirmed, THE Platform SHALL require pickup address specification
7. THE Platform SHALL recommend the highest-rated available technician for the repair category
8. WHEN customer confirms booking, THE Platform SHALL initiate payment via Paystack integration

### Requirement 6: Parts Catalogue System

**User Story:** As the platform, I want to maintain standardized parts pricing, so that customers receive consistent and fair pricing.

#### Acceptance Criteria

1. THE Parts_Catalogue SHALL contain device brand, model, repair category, part name, and fixed pricing
2. WHEN a customer selects a repair category, THE Platform SHALL retrieve current part pricing from Parts_Catalogue
3. THE Platform SHALL display part pricing alongside technician labor pricing for transparency
4. WHERE a requested part is not in the catalogue, THE Platform SHALL allow technician to request part addition
5. THE Platform SHALL support admin management of part pricing updates

### Requirement 7: Technician Pricing Management

**User Story:** As a technician, I want to set my labor pricing for different repair types, so that I can earn according to my expertise.

#### Acceptance Criteria

1. WHEN a technician completes verification, THE Platform SHALL require labor pricing setup for supported repair categories
2. THE Platform SHALL allow technicians to set different labor prices per device type and repair category combination
3. WHEN a customer views technician selection, THE Platform SHALL display the technician's labor pricing clearly
4. THE Platform SHALL allow technicians to update their labor pricing at any time
5. WHEN pricing is updated, THE Platform SHALL apply new pricing to future bookings only

### Requirement 8: Job Assignment and Management

**User Story:** As a technician, I want to receive and manage repair jobs, so that I can provide services and earn income.

#### Acceptance Criteria

1. WHEN a customer completes payment, THE Platform SHALL notify available technicians matching the repair category
2. WHEN a technician accepts a job, THE Platform SHALL assign the job exclusively to that technician
3. WHERE multiple technicians attempt to accept simultaneously, THE Platform SHALL assign to the first acceptance
4. WHEN a job is assigned, THE Platform SHALL update job status to 'paid' and notify customer
5. THE Platform SHALL allow technicians to view job details including customer contact and device information
6. WHILE a job is active, THE Platform SHALL restrict technician's ability to accept conflicting jobs

### Requirement 9: Payment and Escrow System

**User Story:** As a customer, I want my payment held securely until repair completion, so that I'm protected against poor service.

#### Acceptance Criteria

1. WHEN a customer confirms booking, THE Escrow_System SHALL collect full payment via Paystack
2. WHEN payment is successful, THE Escrow_System SHALL hold funds with status 'escrowed'
3. WHILE repair is in progress, THE Escrow_System SHALL prevent fund release to technician
4. WHEN customer authorizes payment release, THE Escrow_System SHALL transfer funds to technician's bank account
5. IF customer reports issues, THEN THE Escrow_System SHALL hold funds with status 'disputed' until admin resolution
6. WHERE customer takes no action within 72 hours of completion, THE Escrow_System SHALL auto-release payment to technician

### Requirement 10: Job Status Workflow

**User Story:** As a user, I want to track repair progress through clear status updates, so that I know what's happening with my device.

#### Acceptance Criteria

1. WHEN a job is created, THE Platform SHALL set initial status to 'booked'
2. WHEN payment is confirmed, THE Platform SHALL update status to 'paid'
3. WHEN rider is assigned, THE Platform SHALL update status to 'pickup_scheduled'
4. WHEN technician confirms device receipt, THE Platform SHALL update status to 'device_received'
5. WHEN repair work begins, THE Platform SHALL update status to 'repair_started'
6. WHEN technician marks complete, THE Platform SHALL update status to 'awaiting_release'
7. WHEN customer releases payment, THE Platform SHALL update status to 'complete'
8. IF customer disputes completion, THEN THE Platform SHALL update status to 'disputed'

### Requirement 11: Real-time Communication System

**User Story:** As a customer and technician, I want to communicate in real-time about the repair, so that we can coordinate effectively.

#### Acceptance Criteria

1. WHEN a job is assigned, THE Platform SHALL create a chat thread between customer and technician
2. WHEN either party sends a message, THE Communication_System SHALL deliver it in real-time to the other party
3. THE Communication_System SHALL support text messages with maximum 1000 characters
4. WHERE users want to share images, THE Communication_System SHALL accept JPEG/PNG files up to 10MB
5. THE Communication_System SHALL preserve message history for the duration of the job
6. WHEN messages are delivered, THE Communication_System SHALL show delivery confirmation
7. WHILE users are typing, THE Communication_System SHALL display typing indicators

### Requirement 12: Push Notification System

**User Story:** As a user, I want to receive timely notifications about job updates, so that I stay informed of important changes.

#### Acceptance Criteria

1. WHEN job status changes, THE Notification_System SHALL send push notification to relevant users
2. WHEN a new message is received, THE Notification_System SHALL notify the recipient if app is not active
3. WHERE push notifications fail, THE Notification_System SHALL fall back to SMS for critical updates
4. THE Notification_System SHALL respect user preferences for notification types
5. WHEN user taps a notification, THE Platform SHALL navigate directly to the relevant screen

### Requirement 13: Technician Job Discovery

**User Story:** As a technician, I want to see available jobs in my area, so that I can choose work that fits my schedule and expertise.

#### Acceptance Criteria

1. WHEN jobs become available, THE Platform SHALL show them to technicians matching the repair category
2. THE Platform SHALL display job details including device type, repair category, location, and total payment
3. WHERE multiple jobs are available, THE Platform SHALL sort by creation time with newest first
4. THE Platform SHALL allow technicians to view customer location distance before accepting
5. WHEN a technician views job details, THE Platform SHALL show estimated completion time based on repair type

### Requirement 14: Customer Job History and Management

**User Story:** As a customer, I want to view my repair history and manage active jobs, so that I can track all my interactions with the platform.

#### Acceptance Criteria

1. THE Platform SHALL provide a 'My Repairs' section showing all customer jobs
2. WHEN viewing job history, THE Platform SHALL display jobs sorted by creation date (newest first)
3. THE Platform SHALL show job status, device information, technician details, and total cost for each job
4. WHEN a customer selects an active job, THE Platform SHALL display detailed status timeline
5. WHERE a job is awaiting release, THE Platform SHALL provide clear payment release controls

### Requirement 15: Payment Release and Completion

**User Story:** As a customer, I want to authorize payment release after repair completion, so that I can confirm satisfaction before payment.

#### Acceptance Criteria

1. WHEN a technician marks job complete, THE Platform SHALL notify customer to inspect and release payment
2. THE Platform SHALL display clear release authorization with confirmation dialog
3. WHEN customer authorizes release, THE Escrow_System SHALL immediately transfer payment to technician
4. AFTER payment release, THE Platform SHALL prompt customer to rate and review technician
5. WHERE customer is unsatisfied, THE Platform SHALL provide dispute initiation option

### Requirement 16: Dispute Resolution System

**User Story:** As a customer, I want to report issues with completed work, so that I can seek resolution for unsatisfactory repairs.

#### Acceptance Criteria

1. WHERE customer is unsatisfied with repair, THE Platform SHALL provide dispute initiation interface
2. WHEN dispute is initiated, THE Platform SHALL require issue description with minimum 30 characters
3. THE Platform SHALL allow dispute evidence upload including photographs
4. WHEN dispute is submitted, THE Escrow_System SHALL freeze payment with status 'held'
5. THE Platform SHALL notify admin immediately for dispute review and resolution

### Requirement 17: Rating and Review System

**User Story:** As a customer, I want to rate and review technicians, so that I can share feedback and help other customers make informed choices.

#### Acceptance Criteria

1. WHEN payment is released, THE Platform SHALL prompt customer for technician rating using 5-star scale
2. THE Platform SHALL allow optional written review with maximum 500 characters
3. WHERE customer provides review, THE Platform SHALL display it on technician profile for future customers
4. THE Platform SHALL calculate and display average technician rating based on all completed jobs
5. THE Platform SHALL show total completed job count alongside technician rating

### Requirement 18: Technician Performance Tracking

**User Story:** As a technician, I want to view my earnings and performance metrics, so that I can track my business success on the platform.

#### Acceptance Criteria

1. THE Platform SHALL display technician total earnings from completed jobs
2. THE Platform SHALL show average job completion time for performance monitoring
3. THE Platform SHALL display current average rating and total jobs completed
4. WHERE technician has recent reviews, THE Platform SHALL show latest customer feedback
5. THE Platform SHALL provide earnings history showing payment dates and amounts

### Requirement 19: Admin Technician Management

**User Story:** As an admin, I want to manage technician verification and performance, so that I can maintain platform quality standards.

#### Acceptance Criteria

1. THE Admin_System SHALL display pending technician verifications requiring review
2. WHEN reviewing verification, THE Admin_System SHALL show all submitted documents and information
3. THE Admin_System SHALL allow approval with immediate technician activation
4. WHERE verification is rejected, THE Admin_System SHALL require rejection reason entry
5. THE Admin_System SHALL allow admin to suspend active technicians for policy violations

### Requirement 20: Admin Dispute Resolution

**User Story:** As an admin, I want to resolve customer disputes fairly, so that I can maintain trust and satisfaction on both sides.

#### Acceptance Criteria

1. WHEN disputes are submitted, THE Admin_System SHALL notify admin immediately
2. THE Admin_System SHALL display complete dispute context including chat history, photos, and descriptions
3. THE Admin_System SHALL provide resolution options: full customer refund, full technician payment, or custom split
4. WHEN admin makes resolution decision, THE Escrow_System SHALL execute the payment according to admin choice
5. THE Admin_System SHALL notify both parties of dispute resolution with explanation

### Requirement 21: Location and Address Services

**User Story:** As a customer, I want to specify pickup locations accurately, so that technicians can find and collect my device efficiently.

#### Acceptance Criteria

1. WHEN customer enters address, THE Platform SHALL validate address using Google Maps geocoding
2. THE Platform SHALL allow address entry via text input or map pin placement
3. WHEN address is confirmed, THE Platform SHALL store coordinates for distance calculations
4. THE Platform SHALL calculate and display distance between customer and available technicians
5. WHERE GPS is available, THE Platform SHALL offer current location as pickup address option

### Requirement 22: File Upload and Storage Management

**User Story:** As a user, I want to upload photos and documents securely, so that I can provide necessary visual information.

#### Acceptance Criteria

1. WHEN users upload files, THE Platform SHALL validate file type as JPEG or PNG only
2. THE Platform SHALL restrict individual file size to maximum 10MB
3. WHEN files are uploaded, THE Storage_System SHALL compress images to optimize storage and bandwidth
4. THE Storage_System SHALL generate secure URLs for file access with appropriate permissions
5. THE Platform SHALL scan uploaded files for malicious content before storage

### Requirement 23: SMS and Communication Integration

**User Story:** As a user, I want to receive important updates via SMS when I'm not using the app, so that I don't miss critical information.

#### Acceptance Criteria

1. WHEN OTP is requested, THE SMS_System SHALL deliver verification code within 60 seconds
2. WHERE push notifications fail, THE SMS_System SHALL send critical job updates to user's phone number
3. THE SMS_System SHALL use Nigerian-local SMS provider for reliable delivery
4. WHEN technician is assigned, THE SMS_System SHALL notify customer with technician contact details
5. THE SMS_System SHALL format messages clearly with UrbanFix branding and relevant job information

### Requirement 24: Rider Management System

**User Story:** As an admin, I want to coordinate device pickup and delivery, so that customers don't need to travel to technician locations.

#### Acceptance Criteria

1. WHEN job payment is confirmed, THE Platform SHALL flag job for rider assignment in admin dashboard
2. THE Admin_System SHALL allow manual rider assignment with rider name and contact information
3. WHEN rider is assigned, THE Platform SHALL update job status to 'pickup_scheduled'
4. THE Platform SHALL notify customer with rider contact details and expected pickup time
5. THE Admin_System SHALL track pickup and delivery completion for operational monitoring

### Requirement 25: Parts Request System

**User Story:** As a technician, I want to request additional parts not in the standard catalogue, so that I can complete repairs requiring special components.

#### Acceptance Criteria

1. WHERE required parts are not in Parts_Catalogue, THE Platform SHALL provide part request interface
2. WHEN technician requests new part, THE Platform SHALL require device model, repair type, part description, and estimated cost
3. THE Platform SHALL submit part requests to admin for catalogue addition review
4. WHERE part request is approved, THE Admin_System SHALL add part to catalogue with appropriate pricing
5. THE Platform SHALL notify requesting technician when part is added to catalogue

### Requirement 26: Auto-Release Payment System

**User Story:** As a technician, I want payment to be released automatically if customer doesn't respond, so that I'm not held hostage by unresponsive customers.

#### Acceptance Criteria

1. WHEN job status is 'awaiting_release' for 72 hours, THE Escrow_System SHALL automatically release payment
2. THE Auto_Release_System SHALL run hourly checks for eligible payment releases
3. WHEN auto-release occurs, THE Escrow_System SHALL transfer payment to technician bank account
4. THE Platform SHALL notify both customer and technician of automatic payment release
5. THE Auto_Release_System SHALL log all automatic releases for admin monitoring

### Requirement 27: Business Analytics and Reporting

**User Story:** As an admin, I want to monitor platform performance metrics, so that I can make informed business decisions.

#### Acceptance Criteria

1. THE Analytics_System SHALL track job completion rates by technician and repair category
2. THE Platform SHALL monitor customer satisfaction scores and review sentiment
3. THE Analytics_System SHALL calculate average repair times and identify performance trends
4. THE Platform SHALL track revenue, commission amounts, and payout volumes
5. WHERE metrics indicate issues, THE Analytics_System SHALL flag anomalies for admin attention

### Requirement 28: Data Security and Privacy

**User Story:** As a user, I want my personal information protected, so that I can trust the platform with sensitive data.

#### Acceptance Criteria

1. THE Platform SHALL encrypt all personal data at rest using AES-256 encryption
2. WHEN data is transmitted, THE Platform SHALL use TLS 1.3 for all communications
3. THE Security_System SHALL implement Row Level Security policies preventing unauthorized data access
4. THE Platform SHALL log all access to sensitive data for audit purposes
5. WHERE users request data deletion, THE Platform SHALL comply within 30 days while preserving necessary business records