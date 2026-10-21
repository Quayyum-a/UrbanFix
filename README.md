# UrbanFix

Book a verified technician in Lagos, pay UrbanFix (not the technician), and only release the money when your device is fixed. Every device's IMEI and photos are recorded when it's received and again after the repair, so parts can't be quietly swapped.

One app, three roles:

- **Customer**: tap a device → brand → model → problem → part quality → technician → request. The technician checks the device and confirms the price; then the customer pays UrbanFix by transfer, tracks the repair, checks the intake and repair records, and confirms (releases payment), reports a problem, or uses the warranty. The price is always shown as **Part (grade) + Service charge = Total**.
- **Technician**: get approved (shop, repair fees, bank, ID), go online, accept requests, check the device (IMEI, photos, model, part quality, final price), get the part money once the customer pays, finish with notes and photos, get the repair fee once the customer confirms, fix warranty claims.
- **Admin**: confirm customer transfers, approve technicians, keep the part price list up to date (with Jiji reference prices), send part money and repair fees, resolve issues (pay technician or refund customer).

## Setup (once)

### 1. Database

In Supabase, open **SQL Editor → New query**, paste all of [`database/urbanfix.sql`](database/urbanfix.sql) and click **Run**.

> This deletes everything in the `public` schema and rebuilds it. Only run it on a project whose data you don't need.

Then run each file in [`database/migrations`](database/migrations) in order (they're safe to run again).

### 2. Sign-in setting

**Authentication → Sign In / Providers → Email**: keep Email enabled and turn **Confirm email** off.
People sign in with phone number + 6-digit PIN; behind the scenes each number is a Supabase Auth account, so no email is ever sent.

### 3. Your escrow bank account

Customers transfer to this account. In the SQL editor:

```sql
UPDATE public.settings
SET bank_name = 'GTBank', account_number = '0123456789', account_name = 'UrbanFix Ltd', support_phone = '+2348012345678'
WHERE id = 1;
```

### 4. App

```bash
cp .env.example .env     # then paste your Supabase URL and anon key
npm install
npx expo start
```

Scan the QR code with **Expo Go (SDK 57)** on your phone. If the phone and computer are on different networks, use `npx expo start --tunnel`.

### 5. Make yourself admin

Open the app, enter your number and create a PIN (you can stop at "What brings you here?"). Then in the SQL editor:

```sql
SELECT public.make_admin('08012345678');
```

Close and reopen the app; you'll land on the admin to-do list.

### 6. Optional: automatic payment release

Repairs the customer doesn't confirm or dispute within 72 hours are released to the technician. The admin "Payouts" tab has a button that does this. To make it automatic, enable **pg_cron** (Database → Extensions), then run just section 12 of `urbanfix.sql` ("Auto-release schedule") in the SQL editor.

## Try the whole flow on one phone

Phone numbers aren't verified by SMS, so you can use any valid-looking Nigerian numbers. Sign out between steps.

1. **Technician** (e.g. `0801 000 0001`): pick "I fix devices", finish the 4 setup steps (any clear photo works as the ID), submit.
2. **Admin** (your number): Technicians tab → open → Approve.
3. **Customer** (e.g. `0801 000 0002`): Phone → iPhone → iPhone X → Cracked or dead screen → Premium (₦37,000) → pick the technician → Request repair.
4. **Technician**: Accept, then record the IMEI (dial `*#06#` on a real phone, or use the test IMEI `490154203237518`) and a photo, check the model and quality → Send price to customer.
5. **Customer**: check the price → "I've sent ₦…".
6. **Admin**: Payments → Confirm. Then Payouts → part money → enter the transfer reference → Mark as sent.
7. **Technician**: describe the fix + photo → Mark as ready.
8. **Customer**: "Yes, it works. Release payment" → rate.
9. **Admin**: Payouts → repair fee → enter the transfer reference → Mark as sent.

## Pricing

- **Part price**: from the price list (Admin → Prices), per exact model, repair and grade (Standard / High quality / Premium). If a model or grade has no listed price, the technician enters the part price after checking the device. Laptop and desktop parts are always priced by the technician.
- **Service charge**: the technician's repair fee (labour, set in their profile) plus the UrbanFix fee. Customers only ever see the combined service charge.
- **UrbanFix fee**: ₦1,500 + 5% of the part price, rounded up to the nearest ₦500, capped at ₦15,000; half for repeat customers. Change it in `public.settings` (`fee_base_kobo`, `fee_rate_bps`, `fee_cap_kobo`, `fee_round_kobo`, `repeat_fee_discount_bps`). Example: iPhone 7 battery ₦8,000 + ₦5,000 repair fee + ₦2,000 = ₦15,000.
- **Warranty**: 7 days for Standard parts and for repairs without a part, 14 days for High quality and Premium. Change it in `public.part_grades`. One claim per repair.
- **Jiji**: the Prices screen shows the latest Jiji asking prices for each part (range, median, number of ads) with an "Open on Jiji" link and one tap to use the median. Prices are not copied from Jiji automatically: listings are few and grade labels are inconsistent, and Jiji's terms on automated collection weren't confirmable. Prices older than 30 days are flagged "Check price".

## Add technicians you already trust

Skip the in-app approval for people you've vetted yourself (needs migration `002`). In the SQL editor:

```sql
SELECT public.admin_add_trusted_technician(
  '08012345678', 'Tobi Adeyemi', 'Tobi Phone Clinic',
  '7 Otigba Street, Computer Village, Ikeja', 'Ikeja',
  '[["smartphone","screen_replacement",5000], ["smartphone","diagnosis",2000]]'
);
```

The amounts are their **repair fees** in naira (labour only; parts come from the price list). Repair names are in `public.repair_options`. The result includes a **PIN**: send it to the technician privately; they sign in with their phone number and that PIN. They're online and bookable immediately, and can change prices in the app (Account → Shop, prices, bank and ID) and add their bank account once. Running it again for the same number updates their details and prices but keeps their PIN.

Don't commit technicians' real phone numbers to this repo; it's public.

## Forgot PIN

The user contacts support (set `EXPO_PUBLIC_SUPPORT_WHATSAPP` to show a WhatsApp button). After checking it's them, run:

```sql
SELECT public.reset_pin('08012345678', '482915');
```

## How it's protected

- The app can only **read** rows the signed-in person is allowed to see (row level security). It cannot write any table directly.
- Every change goes through a database function that checks who is calling, what stage the repair is at, and validates the input. Prices, UrbanFix's fee (10%, or 5% for a repeat customer) and payouts are calculated there, never sent by the app.
- Phone numbers are only shared between customer and technician after payment is confirmed. Technicians never see the escrow account; customers never see technicians' bank details or NIN.
- Device photos and ID documents are private and write-once: they can't be replaced or deleted from the app.
- Bank and ID details lock once a technician is approved, so a stolen account can't redirect payouts.
- Booking limits stop spam: 3 unpaid requests at a time, 10 bookings a day, 20 chat messages a minute.

## Tests

```bash
npm test          # everything (app + database), no Supabase project needed
npm run test:app  # React Native code
npm run test:db   # the real schema on a throwaway local Postgres
```

The database tests run `database/urbanfix.sql` on a real Postgres and act as customers, technicians, admins and attackers: wrong role, wrong stage, someone else's job, direct table writes, bad input (with fuzzing), and simultaneous double-taps.

## Not done yet

- **Paystack**: payment is a bank transfer that an admin confirms. When Paystack is ready, a webhook (Supabase Edge Function) should call the same "confirm payment" step.
- **Phone ownership isn't verified.** Without SMS codes, someone could sign up with a number that isn't theirs. Add OTP (e.g. Termii) before a public launch.
- **No push notifications.** Screens refresh every few seconds while open.
- Payouts and refunds are sent manually from your bank and then recorded in the app.
