# UrbanFix Schema Audit: Database vs Form Fields

## Overview
This audit maps form fields across all onboarding flows to their database columns, identifying mismatches.

---

## 1. USERS TABLE

### Schema Definition
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(15) UNIQUE NOT NULL,
  role user_role NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT phone_format CHECK (phone ~ '^\+234[0-9]{10}$'),
  CONSTRAINT full_name_length CHECK (LENGTH(full_name) >= 2 OR full_name IS NULL)
);
```

### Form Usage & Validation

| Column | Collected By | Client Validation | DB Constraint | Status |
|--------|-------------|------------------|----------------|--------|
| `phone` | PhoneInput | min 2 chars, format +234... | NOT NULL, format CHECK | ✅ MATCH |
| `role` | RoleSelection | enum (customer/technician) | user_role enum | ✅ MATCH |
| `full_name` | UnifiedProfileSetup / TechnicianOnboarding | min 2, max 100 chars | NULL allowed, >= 2 OR NULL | ✅ MATCH |
| `avatar_url` | NOT collected during signup | N/A | NULL allowed | ℹ️ FUTURE |
| `created_at` | DB auto | N/A | auto timestamp | ✅ MATCH |
| `updated_at` | DB auto | N/A | auto timestamp | ✅ MATCH |

**Issues Found:** None. Users table fully synchronized.

---

## 2. CUSTOMER_PROFILES TABLE

### Schema Definition
```sql
CREATE TABLE customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location GEOMETRY(POINT, 4326),
  address_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id),
  CONSTRAINT address_min_length CHECK (LENGTH(address_text) >= 10 OR address_text IS NULL)
);
```

### Form Usage & Validation

| Column | Collected By | Client Validation | DB Constraint | Status |
|--------|-------------|------------------|----------------|--------|
| `user_id` | Auto (linked to users) | N/A | NOT NULL, FK | ✅ MATCH |
| `location` (PostGIS POINT) | ❌ COLLECTED but NOT STORED | Location permission + reverse geocoding (lat/lng available) | NULL allowed | 🔴 **NOT STORED** |
| `address_text` | UnifiedProfileSetup (from reverse geocoding or user picker) | min 10 chars OR NULL enforced in form | >= 10 OR NULL | ✅ MATCH |
| `onboarding_completed` | Auto set to false | N/A | BOOLEAN DEFAULT false | ✅ MATCH (migration 003) |
| `created_at` | DB auto | N/A | auto timestamp | ✅ MATCH |
| `updated_at` | DB auto | N/A | auto timestamp | ✅ MATCH |

**Issues Found:**
- 🔴 **CRITICAL:** Location coordinates collected and passed to auth store, but NEVER written to `customer_profiles.location`
  - Form collects via `Location.getCurrentPositionAsync()` → passes (latitude, longitude) to `completeRegistration()`
  - Auth store receives them but discards them; only writes `address_text`
  - PostGIS POINT is NULL for all new customers

### Field Collection Flow
1. `UnifiedProfileSetup` collects coordinates via `Location.getCurrentPositionAsync()`
2. Reverse geocodes to `address_text` (e.g., "Lagos, Nigeria")
3. **Passes latitude/longitude to completeRegistration()** ← parameters exist
4. Auth store **ignores latitude/longitude**, only writes address_text
5. **Result:** customer_profiles.location is always NULL

**Impact:** Spatial queries ("find technicians near customer") cannot work at signup time. Must re-collect location later.

---

## 3. TECHNICIAN_PROFILES TABLE

### Schema Definition
```sql
CREATE TABLE technician_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nin VARCHAR(11) NOT NULL,
  nin_doc_url TEXT,
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id),
  UNIQUE(nin),
  CONSTRAINT nin_format CHECK (nin ~ '^[0-9]{11}$'),
  CONSTRAINT shop_address_min_length CHECK (LENGTH(shop_address) >= 10 OR shop_address IS NULL),
  ...
);
```

### Form Collection Points

#### A. Registration Step (TechnicianOnboarding.tsx)
**Only collects:**
- `full_name` → stored in users.full_name, NOT technician_profiles

**Auth store creates empty technician_profiles row with:**
```js
{
  user_id: userRow.id,
  nin: '',              // EMPTY
  shop_address: '',     // EMPTY
  bank_name: '',        // EMPTY
  bank_account_number: '',  // EMPTY
  bank_account_name: '', // EMPTY
  verification_status: 'pending'
}
```

#### B. Post-Signup Verification (app/technician/onboarding.tsx)
**Full form collects:**
- `nin` (11 digits)
- `nin_doc_url` (image upload)
- `shop_address` (text)
- `bank_name` (text)
- `bank_account_number` (10 digits)
- `bank_account_name` (text)
- `guarantor_name` (text) ← **NO COLUMN IN SCHEMA**
- `guarantor_phone` (phone) ← **NO COLUMN IN SCHEMA**
- `guarantor_email` (email) ← **NO COLUMN IN SCHEMA**

**These write to:** technician_profiles & technician_verifications tables

### Mapping Matrix

| Column | Registration | Post-Signup Form | Stored In | Status |
|--------|-----------|-----------------|-----------|--------|
| `nin` | ❌ NOT collected | ✅ collected | technician_profiles | ⚠️ EMPTY AT SIGNUP |
| `nin_doc_url` | ❌ NOT collected | ✅ collected | technician_profiles | ⚠️ EMPTY AT SIGNUP |
| `shop_address` | ❌ NOT collected | ✅ collected | technician_profiles | ⚠️ EMPTY AT SIGNUP |
| `bank_name` | ❌ NOT collected | ✅ collected | technician_profiles | ⚠️ EMPTY AT SIGNUP |
| `bank_account_number` | ❌ NOT collected | ✅ collected | technician_profiles | ⚠️ EMPTY AT SIGNUP |
| `bank_account_name` | ❌ NOT collected | ✅ collected | technician_profiles | ⚠️ EMPTY AT SIGNUP |
| `verification_status` | ✅ set to 'pending' | ❌ NOT used | technician_profiles | ✅ MATCH |
| `is_available` | ✅ set to false | ❌ NOT used | technician_profiles | ✅ MATCH |
| `paystack_recipient_code` | ✅ set to null | ❌ NOT used | technician_profiles | ✅ MATCH |

**Issues Found:**
- ✅ **NOT CRITICAL** — Empty fields are intentional (filled later during verification)
- All 6 collected fields do map to schema columns
- No data silently dropped

---

## 4. TECHNICIAN_VERIFICATIONS TABLE

### Schema Definition
```sql
CREATE TABLE IF NOT EXISTS technician_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  nin VARCHAR(11) NOT NULL,
  nin_verified BOOLEAN DEFAULT FALSE,
  bvn VARCHAR(11) NOT NULL,
  account_number VARCHAR(10) NOT NULL,
  bank_code VARCHAR(10) NOT NULL,
  bank_name VARCHAR(100) NOT NULL,
  account_name VARCHAR(255),
  
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id),
  CONSTRAINT valid_nin_format CHECK (nin ~ '^\d{11}$'),
  CONSTRAINT valid_bvn_format CHECK (bvn ~ '^\d{11}$'),
  ...
);
```

### Form Usage (app/technician/onboarding.tsx)

| Column | Form Field | Client Validation | DB Constraint | Status |
|--------|-----------|------------------|----------------|--------|
| `user_id` | Auto | N/A | NOT NULL | ✅ MATCH |
| `nin` | ✅ collected | 11-digit validation | NOT NULL, CHECK 11 digit | ✅ MATCH |
| `nin_verified` | ❌ NOT collected | N/A | DEFAULT FALSE | ⚠️ FORM MISSING |
| `bvn` | ❌ NOT collected | N/A | NOT NULL | 🔴 **FORM MISSING** |
| `account_number` | ✅ collected as `bank_account_number` | 10-digit validation | NOT NULL, CHECK 10 digit | ✅ MATCH |
| `bank_code` | ❌ NOT collected | N/A | NOT NULL | 🔴 **FORM MISSING** |
| `bank_name` | ✅ collected | text validation | NOT NULL | ✅ MATCH |
| `account_name` | ✅ collected as `bank_account_name` | text validation | NULL allowed | ✅ MATCH |
| `status` | Auto set to 'pending' | N/A | DEFAULT 'pending' | ✅ MATCH |

**Issues Found:**
- 🔴 **CRITICAL:** Form does NOT collect `bvn` (Bank Verification Number), but column is `NOT NULL`
  - This will cause INSERT to fail if code tries to write to technician_verifications
- 🔴 **CRITICAL:** Form does NOT collect `bank_code`, but column is `NOT NULL`
  - This will cause INSERT to fail
- ⚠️ **MINOR:** Form does NOT collect `nin_verified`, but it's optional (DEFAULT FALSE)
  - This is acceptable (form doesn't need to set it initially)

---

## CROSS-TABLE ISSUE: Guarantor Information

### Current Situation
- `app/technician/onboarding.tsx` form **collects**:
  - `guarantor_name`
  - `guarantor_phone`
  - `guarantor_email`
  
- These are **submitted to** `technician_verifications` table via:
  ```js
  const { error: verificationError } = await supabase
    .from('technician_verifications')
    .insert({
      ...other fields...,
      guarantor_name: formData.guarantor_name,
      guarantor_phone: formData.guarantor_phone,
      guarantor_email: formData.guarantor_email,
      ...
    })
  ```

- **But these columns do NOT exist in the schema** — they will be rejected by Supabase

**Impact:** Guarantor information is silently dropped.

---

## SUMMARY OF ISSUES

### 🔴 CRITICAL (Cause crashes/failures)

1. **technician_verifications.bvn** — Form doesn't collect BVN, but DB requires it (NOT NULL)
   - Current code will crash on INSERT
   - Fix: Either collect BVN in form OR remove NOT NULL constraint

2. **technician_verifications.bank_code** — Form doesn't collect bank code, but DB requires it (NOT NULL)
   - Current code will crash on INSERT
   - Fix: Either collect bank code in form OR remove NOT NULL constraint

3. **Guarantor fields** (guarantor_name, guarantor_phone, guarantor_email) — Form collects them, but columns don't exist in schema
   - Current code attempts INSERT to non-existent columns (Supabase will silently ignore or error)
   - Fix: Either create columns in technician_verifications OR remove from form

### ⚠️ MAJOR (Data loss, impacts features)

4. **customer_profiles.location** — Form collects GPS coordinates, but only address_text is stored at signup
   - PostGIS POINT is never populated initially
   - Impact: Spatial queries ("find technicians near me") cannot work; location re-collection needed
   - Fix: Modify auth store to pass location to customer_profiles.location on signup

### ✅ ALIGNED (No issues)

- users (phone, role, full_name)
- customer_profiles (address_text, location structure)
- technician_profiles (nin, shop_address, bank_name, bank_account_number, bank_account_name, verification_status)
- All validation rules (min/max length, format checks) match between form and DB

---

## RECOMMENDED FIXES (Ordered by Priority)

### Fix 1: Add Missing Guarantor Columns to technician_verifications
**Migration:** Add these 3 columns:
```sql
ALTER TABLE technician_verifications
ADD COLUMN guarantor_name VARCHAR(255),
ADD COLUMN guarantor_phone VARCHAR(15),
ADD COLUMN guarantor_email VARCHAR(255);
```

**Why:** Form already collects this data; schema should support it.

### Fix 2: Resolve BVN and Bank Code Requirements
**Option A (Recommended):** Make them optional in schema:
```sql
ALTER TABLE technician_verifications
ALTER COLUMN bvn DROP NOT NULL,
ALTER COLUMN bank_code DROP NOT NULL;

ALTER TABLE technician_verifications
ADD CONSTRAINT valid_bvn_format CHECK (bvn ~ '^\d{11}$' OR bvn IS NULL),
ADD CONSTRAINT valid_bank_code CHECK (bank_code IS NOT NULL OR bvn IS NOT NULL);
```

**Option B:** Collect in form (product call needed: are BVN/bank_code required for MVP?)

**Recommendation:** Option A (make optional) unless product requirement says otherwise.

### Fix 3: Capture PostGIS Location at Signup
**Status:** RECOMMENDED (avoid re-asking for location)

**Change:** Modify `stores/authStore.ts` line 260-264 to pass location:
```js
const { error: profileError } = await supabase
  .from('customer_profiles')
  .insert({
    user_id: userRow.id,
    address_text: addressValue,
    location: latitude && longitude
      ? `POINT(${longitude} ${latitude})`
      : null,
    onboarding_completed: false
  } as any)
```

**Why:** Location is already collected; storing it enables spatial queries immediately.

---

## PRODUCT QUESTIONS (Blocking)

1. **BVN and Bank Code:** Are these required for technician verification MVP?
   - If YES: update form to collect them
   - If NO: make them optional in schema (Option A above)

2. **Guarantor Information:** Is this required or optional?
   - If REQUIRED: must fix schema or form
   - If OPTIONAL: can defer or make a future enhancement
