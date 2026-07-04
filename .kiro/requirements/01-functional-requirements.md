# UrbanFix Functional Requirements
*Based on MVP Specification and Engineering Guide*

## 1. User Authentication & Onboarding

### 1.1 Phone-Based Authentication
- **FR-001**: Users must register/login using Nigerian phone numbers (+234 format)
- **FR-002**: OTP verification required for all phone numbers
- **FR-003**: Role selection: Customer or Technician (Admin via separate system)
- **FR-004**: Persistent session management across app restarts

### 1.2 Customer Onboarding
- **FR-005**: Profile setup with full name
- **FR-006**: Location permission and address capture
- **FR-007**: Optional avatar upload

### 1.3 Technician Onboarding
- **FR-008**: NIN (National ID) verification with document upload
- **FR-009**: Shop address and business details
- **FR-010**: Bank account details for payouts
- **FR-011**: Pricing setup for repair categories
- **FR-012**: Admin approval workflow before activation

## 2. Customer Journey

### 2.1 Device Repair Booking
- **FR-013**: Device type selection (Smartphone, Laptop, Tablet, Desktop, Other)
- **FR-014**: Brand and model selection with search functionality
- **FR-015**: Repair category selection with pricing preview
- **FR-016**: Photo upload for device documentation (multiple images)
- **FR-017**: Pickup address specification
- **FR-018**: Technician selection with ratings and pricing
- **FR-019**: Pricing breakdown display (Parts + Labour + Service Fee)
- **FR-020**: Payment via Paystack (Card/Bank Transfer/USSD)

### 2.2 Job Management
- **FR-021**: Job status tracking through all stages
- **FR-022**: Real-time chat with assigned technician
- **FR-023**: Repair progress updates and photos from technician
- **FR-024**: Release payment authorization after completion
- **FR-025**: Dispute initiation if unsatisfied
- **FR-026**: Technician rating and review submission

### 2.3 Job History
- **FR-027**: View all past repair jobs
- **FR-028**: Re-book same device/repair type
- **FR-029**: Download repair receipts

## 3. Technician Journey

### 3.1 Job Management
- **FR-030**: View available jobs in geographic area
- **FR-031**: Accept/decline job requests
- **FR-032**: Update job status through workflow stages
- **FR-033**: Upload repair progress photos
- **FR-034**: Mark jobs as complete
- **FR-035**: Request additional parts if needed

### 3.2 Communication
- **FR-036**: Real-time chat with customers
- **FR-037**: Update customers on repair timeline
- **FR-038**: Notify customers of pickup/delivery

### 3.3 Financial Management
- **FR-039**: View earnings and payout history
- **FR-040**: Automatic payouts after job completion
- **FR-041**: Pricing management for different repair types

## 4. Job Workflow States

### 4.1 Status Progression
- **FR-042**: `booked` → Customer pays and books
- **FR-043**: `paid` → Payment confirmed, waiting pickup
- **FR-044**: `pickup_scheduled` → Rider assigned for pickup
- **FR-045**: `device_received` → Technician has device
- **FR-046**: `repair_started` → Work in progress
- **FR-047**: `awaiting_release` → Complete, waiting customer approval
- **FR-048**: `complete` → Payment released, job closed
- **FR-049**: `disputed` → Customer disputed, admin intervention
- **FR-050**: `cancelled` → Job cancelled (various reasons)

## 5. Communication System

### 5.1 Real-time Messaging
- **FR-051**: Text messaging between customer and technician
- **FR-052**: Image sharing in chat (repair photos, receipts)
- **FR-053**: Typing indicators and read receipts
- **FR-054**: Message history preservation

### 5.2 Notifications
- **FR-055**: Push notifications for job status changes
- **FR-056**: SMS fallback for critical updates
- **FR-057**: In-app notification center

## 6. Payment & Escrow System

### 6.1 Customer Payments
- **FR-058**: Upfront payment before technician assignment
- **FR-059**: Funds held in escrow during repair
- **FR-060**: Release payment after satisfaction
- **FR-061**: Refund capability for cancelled jobs

### 6.2 Technician Payouts
- **FR-062**: Automatic payout after job completion
- **FR-063**: Payout holds during disputes
- **FR-064**: Bank transfer integration via Paystack

## 7. Location & Logistics

### 7.1 Location Services
- **FR-065**: GPS location for customer address
- **FR-066**: Technician distance calculation
- **FR-067**: Pickup address validation

### 7.2 Rider Integration
- **FR-068**: Third-party rider assignment for pickup/delivery
- **FR-069**: Rider contact information sharing
- **FR-070**: Delivery confirmation and tracking

## 8. Admin Capabilities (Future)

### 8.1 Technician Management
- **FR-071**: Approve/reject technician applications
- **FR-072**: Monitor technician performance metrics
- **FR-073**: Suspend problematic accounts

### 8.2 Dispute Resolution
- **FR-074**: Review disputed jobs
- **FR-075**: Make refund/payout decisions
- **FR-076**: Communication with both parties

### 8.3 Platform Management
- **FR-077**: Parts catalog management
- **FR-078**: Pricing policy updates
- **FR-079**: Platform analytics and reporting

## 9. Data & Analytics

### 9.1 Performance Metrics
- **FR-080**: Job completion rates by technician
- **FR-081**: Customer satisfaction scores
- **FR-082**: Average repair times by category
- **FR-083**: Revenue and commission tracking

## 10. Security & Privacy

### 10.1 Data Protection
- **FR-084**: Personal data encryption at rest and in transit
- **FR-085**: Secure file upload and storage
- **FR-086**: PII access controls and audit logs

### 10.2 Authentication Security
- **FR-087**: Session timeout and refresh
- **FR-088**: Device binding for sensitive operations
- **FR-089**: Fraud detection patterns