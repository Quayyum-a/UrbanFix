# Task 7: Customer Booking Flow (Device Selection → Payment)

**Status**: ✅ COMPLETED  
**Commit**: 79a34de

## Overview

Task 7 implements the complete customer repair booking workflow from device selection through payment confirmation. The flow integrates with:
- Parts catalogue system
- Technician pricing
- Payment processing (Paystack)
- Booking service with escrow

## Architecture

### Services

#### BookingService (`lib/services/booking-service.ts`)

```typescript
BookingService.createBooking(request: BookingRequest)
  → Creates job with 'booked' status
  → Returns job ID for payment

BookingService.confirmPayment(jobId: string, paymentReference: string)
  → Updates job status to 'paid'
  → Triggers technician notifications

BookingService.getCustomerBookings(customerId: string, status?: string)
  → Retrieves all customer bookings
  → Filter by status: booked, paid, complete, cancelled

BookingService.calculateTotalPrice(partPrice, labourPrice, platformFeePercentage)
  → Calculates pricing breakdown
  → Splits: parts + labour + platform fee
  → Returns: totalPrice, payoutAmount
```

### Hooks

#### useBooking Hook (`hooks/useBooking.ts`)

State management for booking operations:
- `createBooking()` - Create new booking
- `confirmPayment()` - Confirm payment after Paystack
- `cancelBooking()` - Cancel before payment
- `getBooking()` - Fetch single booking
- `getCustomerBookings()` - Fetch all customer bookings
- `calculatePrice()` - Pricing utilities

## Complete Booking Flow

### Step 1: Device Type Selection
**Screen**: `/customer/repair/device-type`
- User selects device type: Smartphone, Laptop, Tablet, Desktop, Other
- Navigates to brand selection

### Step 2: Brand Selection
**Screen**: `/customer/repair/brand`
- Shows searchable list of brands for selected device type
- Filters brands in real-time as user searches
- Prefetches models on selection

### Step 3: Model Selection
**Screen**: `/customer/repair/brand-model`
- Shows all models for selected brand
- Displays device image if available
- Allows scrolling through large lists

### Step 4: Repair Category Selection
**Screen**: `/customer/repair/category`
- Shows available repair categories for device
- Displays estimated repair time
- Shows parts available for each category
- User selects part and category

**Data collected at this point**:
- Device: brand, model, type
- Repair: category, part
- Pricing: part price from catalogue

### Step 5: Technician Selection
**Screen**: `/customer/repair/technicians`
- Shows available technicians for repair category
- Displays:
  - Technician name
  - Average rating
  - Jobs completed
  - Labour price for this category
  - Pickup location distance (if available)
- Sorts by: rating (highest first), or distance (closest first)

**Data collected**:
- Technician: id, name, labour price

### Step 6: Booking Confirmation
**Screen**: `/customer/repair/confirm`
- Complete order summary with:
  - Device details (brand, model)
  - Repair type
  - Part name and price
  - Technician name and rating
  - Labour price
  - Platform fee
  - **Total price**
- Shows booking terms
- "Confirm Booking" button creates the booking

**Backend action**:
```typescript
await BookingService.createBooking({
  customer_id: userProfile.id,
  device_brand: 'Samsung',
  device_model: 'Galaxy S21',
  repair_category: 'screen',
  part_id: 'SP001',
  part_price: 25000,      // ₦25,000
  labour_price: 15000,    // ₦15,000 (technician's rate)
  platform_fee: 4000,     // 10% of (parts + labour)
  total_price: 44000,     // Total to pay
  payout_amount: 40000,   // What technician gets (escrow)
  pickup_address: 'Ikoyi, Lagos',
  photo_urls: []
})
```

Returns: **Job ID** and **"booked" status**

### Step 7: Payment
**Screen**: `/customer/repair/payment`
- Shows order summary again
- Payment method selection:
  - **Card**: Debit/Credit (Visa, Mastercard, Verve)
  - **Bank Transfer**: Direct bank account
  - **USSD**: Mobile money (*737*50# etc.)
- All methods integrated via Paystack
- Shows security info (funds in escrow until repair complete)

**Payment Flow**:
1. User taps "Pay ₦44,000"
2. Paystack payment modal opens
3. User selects payment method
4. Payment confirmation from Paystack
5. `confirmPayment()` updates job status to 'paid'
6. Success screen with job ID
7. Redirect to `/customer/repairs` to track booking

## Database Schema

### jobs table (booking records)

```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES users(id),
  technician_id UUID REFERENCES users(id) -- NULL until accepted
  
  -- Device Info
  device_brand TEXT,
  device_model TEXT,
  
  -- Repair Info
  repair_category TEXT REFERENCES repair_categories(id),
  
  -- Pricing
  part_id UUID REFERENCES parts(id),
  part_price DECIMAL,
  labour_price DECIMAL,
  platform_fee DECIMAL,
  total_price DECIMAL,
  payout_amount DECIMAL,
  
  -- Documentation
  photo_urls TEXT[] -- Device photos
  
  -- Location
  pickup_address TEXT,
  
  -- Status & Timeline
  status: 'booked' | 'paid' | 'pickup_scheduled' | 'device_received' 
        | 'repair_started' | 'awaiting_release' | 'complete' | 'disputed' | 'cancelled'
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  completed_at TIMESTAMP
)
```

## Pricing Breakdown Example

For Samsung Galaxy S21 screen repair:

```
Device:        Samsung Galaxy S21
Repair:        Screen Replacement
Part:          S21 Screen Module
Part Price:    ₦25,000
                
Technician:    John Tech
Labour Price:  ₦15,000
                
Platform Fee:  ₦4,000 (10% of parts + labour)
               
─────────────────
TOTAL:         ₦44,000

Money Flow:
Customer pays:     ₦44,000
Platform keeps:    ₦4,000
Technician gets:   ₦40,000 (after completion & release)
```

## Key Features

✅ **Complete Booking Workflow**
- From device selection to payment confirmation
- All steps validated with proper error handling

✅ **Real-Time Pricing**
- Parts from catalogue
- Technician labour prices
- Automatic platform fee calculation

✅ **Escrow System**
- Customer funds held safely
- Released only after technician marks complete
- Protected transaction

✅ **Multiple Payment Methods**
- Card (Visa, Mastercard, Verve)
- Bank Transfer
- USSD (mobile money)

✅ **Booking Management**
- Retrieve booking details
- View booking history
- Cancel before payment
- Track status updates

## Integration Points

### With JobsService
- After payment, technician sees job in "Available Jobs"
- Uses same job ID to accept

### With PricingService
- Shows technician labour prices
- Sorts by rating/availability
- Validates technician can do repair category

### With PartsCatalogue
- Retrieves brands, models, categories
- Gets part prices

### With Paystack
- Payment processing
- Multiple payment methods
- Webhook verification (can be added)

## Payment Status Flow

```
Booking Created
    ↓
customer_view: "Confirm Order"
    ↓ [Customer taps "Pay ₦44,000"]
Payment Screen (Paystack)
    ↓
Paystack Payment Modal
    ↓ [Customer completes payment]
Payment Confirmed by Paystack
    ↓
Update job.status = 'paid'
    ↓
Success Screen with Job ID
    ↓
Customer can track in /customer/repairs
```

## Testing the Flow

### Test Credentials

```
Customer 1: +2348066025051 (OTP: 123456)
  - Can book repairs
  - Can pay with test card
  
Technician: +2348012345678 (OTP: 654321)
  - Already verified
  - Can accept bookings
```

### Manual Test Steps

1. ✅ Login as customer
2. ✅ Navigate to "Book Repair"
3. ✅ Select device type (e.g., Smartphone)
4. ✅ Select brand (e.g., Samsung)
5. ✅ Select model (e.g., Galaxy S21)
6. ✅ Select repair category (e.g., Screen)
7. ✅ Select part (e.g., Screen Module)
8. ✅ View pricing breakdown
9. ✅ Select technician (highest rated)
10. ✅ Review order summary
11. ✅ Confirm booking (creates job with 'booked' status)
12. ✅ Select payment method
13. ✅ Complete payment
14. ✅ See success screen
15. ✅ View job in customer's booking history
16. ✅ Technician sees job in "Available Jobs"
17. ✅ Technician can accept job

## What's Already Built

✅ Device Type Screen - Full implementation  
✅ Brand Selection - With search  
✅ Model Selection - With image preview  
✅ Repair Category - With part selection  
✅ Technician Selection - With ratings and pricing  
✅ Booking Confirmation - Full summary  
✅ Payment Screen - Beautiful Paystack UI  
✅ Success Screen - With job tracking  

## What Was Added (Task 7)

✅ `BookingService` - Complete booking logic  
✅ `useBooking` hook - State management  
✅ Booking service methods - CRUD operations  
✅ Price calculation utilities  
✅ Payment confirmation flow  

## Next Steps (Task 8)

Task 8 will implement:
- Payment Release Workflow
- Dispute Handling
- Rating & Reviews
- Technician Payouts

---

**Branch**: main  
**Commit**: 79a34de  
**Date**: July 11, 2026
