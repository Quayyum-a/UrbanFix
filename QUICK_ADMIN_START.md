# Quick Admin Setup Guide

## What You're Getting

✅ Admin role added to entire system  
✅ Admin dashboard with 6 tabs  
✅ Technician approval feature  
✅ Secure PIN authentication  
✅ Real-time technician notifications  

---

## Step 1: Create Admin User (2 minutes)

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **+ New Query**
3. Copy-paste this SQL:

```sql
INSERT INTO public.user_pins (phone, pin_hash, attempts, locked_until, created_at, updated_at)
VALUES ('+2348066025051', '$2b$10$9qLLqkOCJTDEQ5X3Kl2.ZuTmBQr.N3XQB.n6yX8RM5zqkLJ8G7Cfi', 0, NULL, NOW(), NOW())
ON CONFLICT (phone) DO UPDATE SET pin_hash = '$2b$10$9qLLqkOCJTDEQ5X3Kl2.ZuTmBQr.N3XQB.n6yX8RM5zqkLJ8G7Cfi', attempts = 0, locked_until = NULL, updated_at = NOW();

INSERT INTO public.users (phone, role, full_name, avatar_url, created_at, updated_at)
VALUES ('+2348066025051', 'admin', 'Admin', NULL, NOW(), NOW())
ON CONFLICT (phone) DO UPDATE SET role = 'admin', updated_at = NOW();
```

4. Click **Run**
5. Done! ✅

---

## Step 2: Log In as Admin (1 minute)

1. Open UrbanFix app
2. Tap **Login**
3. Phone: **+2348066025051**
4. PIN: **5555**
5. ✅ Go to Admin Dashboard

---

## Step 3: Use Admin Features (2 minutes)

### See 6 Tabs at Bottom:
1. **📊 Dashboard** → Platform stats
2. **✅ Verifications** → Manage verifications  
3. **🎖️ Technician Approval** → Approve/reject technicians ⭐ (Main feature)
4. **📦 Part Requests** → Manage parts
5. **⚠️ Disputes** → Resolve conflicts
6. **📈 Analytics** → View metrics

### To Approve a Technician:
1. Go to **Technician Approval** tab
2. See list of pending technicians
3. Click a technician
4. Click **Approve** or **Reject**
5. If reject, provide reason
6. ✅ Done! Technician sees it instantly

---

## Admin Credentials

```
Phone: +2348066025051
PIN:   5555
Role:  admin
```

---

## What Changed in Code

### 1. Added admin role to type system
```typescript
// stores/authFlowStore.ts
export type UserRole = 'customer' | 'technician' | 'admin'
```

### 2. Added admin redirect in login
```typescript
// app/auth/login.tsx
case 'admin':
  router.replace('/admin')
  break
```

### 3. Added admin route protection
```typescript
// components/auth/AuthGuard.tsx
else if (currentRoute.startsWith('/admin') && role !== 'admin') {
  // Redirect to correct role's dashboard
}
```

### 4. Admin dashboard already existed
```typescript
// app/admin/_layout.tsx
// 6 tabs: Dashboard, Verifications, Technician Approval, Part Requests, Disputes, Analytics
```

---

## Files Modified

- ✅ `stores/authFlowStore.ts` — Added 'admin' to UserRole
- ✅ `lib/auth/auth-session.ts` — Updated type return
- ✅ `app/auth/login.tsx` — Added admin redirect
- ✅ `components/auth/AuthGuard.tsx` — Added route protection

---

## How It Works Behind the Scenes

```
Admin enters phone & PIN
    ↓
System checks user_pins table → PIN verified
    ↓
System checks users table → role = 'admin' ✓
    ↓
Login redirect to /admin dashboard
    ↓
AuthGuard checks: Is role = 'admin'? YES ✓
    ↓
Show admin dashboard with 6 tabs
```

---

## Security

- 🔒 PIN is hashed (bcrypt)
- 🔒 Approvals protected at database layer
- 🔒 Only admin accounts can approve
- 🔒 Rate limiting: 3 wrong attempts = 15-min lockout
- 🔒 Real-time: technicians see changes instantly

---

## Troubleshooting

### "Can't see Technician Approval tab"
- Verify your account has `role = 'admin'` in Supabase `users` table
- Log out and log back in

### "Wrong PIN error"
- PIN is case-sensitive: **5555** (not 5556 or 5554)
- You get 3 attempts before 15-min lockout

### "Stuck on login screen"
- Make sure you ran the SQL script in Supabase
- Verify phone number has `+234` prefix

---

## That's It! 🎉

You now have:
- ✅ Admin account created
- ✅ Admin dashboard active
- ✅ Ability to approve/reject technicians
- ✅ Real-time notifications to technicians
- ✅ Complete platform management

**Ready to go!**
