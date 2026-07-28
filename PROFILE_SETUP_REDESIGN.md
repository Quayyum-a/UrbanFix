# Profile Setup Redesign - Single, Unified Screen

## Problem

The profile setup flow had **2 separate screens**:
1. **ProfileSetup.tsx** - Name input only
2. **CompleteProfile.tsx** - Location collection

This caused:
- User confusion with multiple screens
- Complex navigation flow
- "Failed to create customer profile" error at end
- Inconsistent UX

## Solution: Unified Profile Setup

Created a **single, comprehensive profile screen** that handles everything in one place: `UnifiedProfileSetup.tsx`

### Single Screen Features

#### For Customers:
- ✅ Full name input (validated for first + last name)
- ✅ Phone number display (read-only, verified badge)
- ✅ Location button (with permission handling)
- ✅ Address display (from reverse geocoding)
- ✅ Error messaging
- ✅ Clean, professional UI

#### For Technicians:
- ✅ Full name input
- ✅ Phone number display
- ✅ No location required (simpler flow)

### Design Improvements

**Cleaner Layout:**
```
[Icon Badge]
Title + Subtitle
─────────────────
Full Name input
Phone Number (verified)
Location button (if customer)
Address display (if customer)
─────────────────
Continue button
─────────────────
Info box
```

**Visual Polish:**
- Clear section spacing
- Color-coded badges (green for verified, orange for location)
- Smooth loading states with spinners
- Professional error handling with red boxes
- Info messages in blue boxes
- Icon indicators (📍 for location, 👤 for customer, 🔧 for tech)

## Files Changed

### 1. New File: `components/auth/UnifiedProfileSetup.tsx`
- Single screen combining name + location
- Role-aware (customer vs technician)
- Location permissions handling
- Reverse geocoding integration
- Complete form validation

### 2. Updated: `app/auth/register.tsx`
- Removed import of old `ProfileSetup` component
- Added import of new `UnifiedProfileSetup` component
- Changed flow: `pin → role-selection → profile-setup-unified → dashboard`
- Updated `handleProfileComplete` to accept location params
- Simplified navigation logic

### 3. Updated: `stores/authStore.ts`
- Fixed customer profile creation error
- Changed from PostGIS geometry to simple address_text storage
- Set `onboarding_completed: true` on profile creation
- Improved error logging

## Auth Flow After Changes

### New User Registration (Customer)
```
Phone Entry
    ↓
PIN Creation
    ↓
Role Selection (choose: Customer)
    ↓
┌─────────────────────────────┐
│  UNIFIED PROFILE SETUP      │
│  ✓ Name input validated     │
│  ✓ Location captured        │
│  ✓ Address reverse-geocoded │
└─────────────────────────────┘
    ↓
Dashboard (automatically logged in)
```

### New User Registration (Technician)
```
Phone Entry
    ↓
PIN Creation
    ↓
Role Selection (choose: Technician)
    ↓
┌─────────────────────────────┐
│  UNIFIED PROFILE SETUP      │
│  ✓ Name input validated     │
│  (Location optional/skipped)│
└─────────────────────────────┘
    ↓
Dashboard (automatically logged in)
```

## Technical Details

### Location Handling
- **Permission Request**: Asks user permission (Android/iOS aware)
- **Geocoding**: Gets readable address from coordinates
- **Fallback**: Shows coordinates if reverse geocoding fails
- **Display**: Shows address in green confirmation box

### Validation
- **Name**: 2-100 chars, letters/spaces/hyphens/apostrophes only
- **Customer Name**: Requires first + last name (space check)
- **Location**: Required for customers, optional for technicians
- **Real-time**: Errors clear when user starts typing

### Database
- Creates `users` entry with name and role
- Creates `customer_profiles` entry with address (if customer)
- Sets `onboarding_completed: true` to skip future onboarding
- Marks `phone` as verified

## Benefits

✅ **Simpler UX**: One screen instead of two
✅ **Fewer errors**: Combined error handling in one place
✅ **Faster**: No extra navigation steps
✅ **Professional**: Polished UI with clear visual hierarchy
✅ **Role-aware**: Different flows for customer vs technician
✅ **Better feedback**: Real-time validation and loading states
✅ **Accessible**: Large touch targets, clear labels

## Testing

### Test Case 1: New Customer
1. Enter phone: `+2348055555555`
2. Create PIN: `1234`
3. Select role: Customer
4. Should see: Unified profile with name + location
5. Enter name: "John Doe"
6. Click "Share My Location"
7. Allow location permission
8. Should see address populated (e.g., "Lagos, Nigeria")
9. Click "Continue to Dashboard"
10. Should be on customer dashboard

### Test Case 2: New Technician
1. Enter phone: `+2348044444444`
2. Create PIN: `1234`
3. Select role: Technician
4. Should see: Unified profile with name only (no location)
5. Enter name: "Jane Smith"
6. Click "Continue to Dashboard"
7. Should be on technician dashboard

### Test Case 3: Error Cases
1. **No name**: Click continue → error "Please enter your full name"
2. **Name too short**: "J" → error "Name must be at least 2 characters"
3. **Customer without location**: Click continue → error "Please share your location"
4. **Location permission denied**: Click location → shows error message

## Old Files (Can Be Removed Later)

- `components/auth/ProfileSetup.tsx` - No longer used
- `components/auth/CompleteProfile.tsx` - No longer used
- `app/auth/complete-profile.tsx` - No longer routed to

These are kept for now but can be deleted once verified the new flow works.

## Migration Notes

**For existing customers:**
- Current customers already have profiles
- Their `onboarding_completed` flag is set (migration 003)
- They won't see this screen again (goes straight to dashboard)

**For new registrations:**
- All new customers will use this unified flow
- Profile created with `onboarding_completed: true`
- Seamless transition to dashboard

## Next Steps

1. ✅ Create unified component
2. ✅ Update register flow
3. ✅ Fix database profile creation
4. ⏳ Test both customer and technician paths
5. ⏳ Verify location capture works
6. ⏳ Clean up old components (optional)
