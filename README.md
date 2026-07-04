# UrbanFix 🛠️

> **Trusted Repairs, Guaranteed** — Making device repair as convenient and trustworthy as ordering an Uber.

UrbanFix is a device repair marketplace platform built for Lagos, Nigeria. We connect device owners with verified technicians through a transparent, escrow-protected service that prioritizes trust above all else.

[![React Native](https://img.shields.io/badge/React%20Native-0.74-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-51-black.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green.svg)](https://supabase.com/)

---

## 🎯 Problem & Solution

**The Problem**: In Lagos, getting your broken iPhone or laptop repaired means:
- Handing your expensive device to untrusted strangers
- No transparency on pricing or progress
- No guarantee of quality or accountability
- Risk of theft, fake parts, or incompetent repairs

**Our Solution**: UrbanFix provides:
- ✅ **Verified Technicians** — Background checks, skill assessments, portfolio verification
- ✅ **Escrow Payments** — Money held until repair is complete and approved
- ✅ **Real-time Tracking** — Know exactly where your device is and repair progress
- ✅ **Quality Guarantee** — 30-day warranty on all repairs
- ✅ **Transparent Pricing** — Upfront quotes, no hidden fees

---

## 📱 Features

### For Customers
- Phone/email authentication with OTP verification
- Browse verified technicians by rating, price, and location
- Request quotes for device repairs
- Escrow-protected payments via Paystack
- Real-time job tracking and messaging
- Address management and pickup/delivery scheduling
- Review and rate completed repairs

### For Technicians
- Professional profile setup with portfolio
- Receive job requests with device details
- Provide transparent repair quotes
- Update job status in real-time
- Build reputation through ratings
- Secure payment upon job completion

---

## 🛠️ Tech Stack

### Frontend
- **React Native** + **Expo** — Cross-platform mobile app (iOS & Android)
- **TypeScript** — Type-safe development
- **Expo Router** — File-based routing
- **Zustand** — State management
- **React Native Reanimated** — Smooth animations

### Backend
- **Supabase** — PostgreSQL database, Authentication, Real-time subscriptions
- **Row Level Security (RLS)** — Database-level authorization
- **PostGIS** — Geospatial queries for location-based features

### Payments & Services
- **Paystack** — Escrow payments and disbursements
- **Google Maps API** — Location services and geocoding
- **Expo Image Picker** — Photo uploads for device documentation
- **Expo Location** — GPS tracking and technician dispatch

### Design System
- **Material Design 3** principles
- **Inter Font Family** — Clean, professional typography
- **8px Grid System** — Consistent spacing
- Custom color palette: Deep Trust Blue (#031636), Emergency Orange (#FF5722), Success Green (#2ECC71)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Studio
- Supabase account
- Paystack account (for payments)
- Google Maps API key

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Quayyum-a/UrbanFix.git
cd UrbanFix/urbanfix-app
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
```

4. **Set up Supabase database**
```bash
# Run migrations in Supabase SQL Editor
# Files located in database/migrations/
# 001_initial_schema.sql
# 002_row_level_security.sql
# 003_sample_data.sql
```

5. **Start the development server**
```bash
npx expo start
```

6. **Run on device/simulator**
- iOS: Press `i` or scan QR code with Expo Go app
- Android: Press `a` or scan QR code with Expo Go app
- Web: Press `w` (limited functionality)

---

## 📂 Project Structure

```
urbanfix-app/
├── app/                      # Expo Router pages
│   ├── auth/                 # Authentication flows
│   ├── customer/             # Customer app screens
│   ├── technician/           # Technician app screens
│   └── _layout.tsx           # Root layout with navigation
├── components/               # Reusable UI components
│   ├── auth/                 # Auth-related components
│   ├── location/             # Location and address management
│   └── ui/                   # Design system components
├── lib/                      # Business logic and services
│   ├── auth/                 # Authentication services
│   ├── services/             # API integrations
│   └── supabase.ts           # Supabase client
├── database/                 # Database schema and migrations
│   ├── migrations/           # SQL migration files
│   └── functions/            # PostgreSQL functions
├── stores/                   # Zustand state management
├── constants/                # Theme, colors, device types
├── types/                    # TypeScript type definitions
├── assets/                   # Icons, splash screen, fonts
└── __tests__/                # Unit and integration tests
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- Button.test.tsx
```

---

## 🎨 Brand Guidelines

UrbanFix's visual identity communicates **trust**, **professionalism**, and **Nigerian credibility**.

### Color Palette
| Color | Hex | Usage |
|-------|-----|-------|
| Deep Trust Blue | `#031636` | Primary brand color, headers, CTAs |
| Primary Container | `#1A2B4C` | Elevated surfaces, backgrounds |
| Emergency Orange | `#FF5722` | Action buttons, urgency indicators |
| Success Green | `#2ECC71` | Verification, completed jobs |
| Soft Gray | `#F7FAFC` | App background, subtle surfaces |

### Typography
- **Font Family**: Inter (Regular, Medium, SemiBold, Bold)
- **Heading Large**: 32px, Bold
- **Heading Medium**: 24px, SemiBold
- **Body Large**: 16px, Regular
- **Label**: 12px, Medium

### Design Principles
1. **Trust First** — Every UI element communicates reliability
2. **Clarity** — No ambiguity in pricing, status, or next steps
3. **Accessibility** — High contrast, 44px minimum touch targets
4. **Nigerian Context** — Locally relevant, internationally credible

---

## 🗺️ Roadmap

### Phase 1: MVP (Current)
- ✅ Authentication (Phone OTP + Profile Setup)
- ✅ Role selection (Customer/Technician)
- ✅ Database schema with RLS
- ✅ UI component library
- 🚧 Booking flow (in progress)
- 🚧 Payment integration (in progress)

### Phase 2: Core Features
- ⏳ Real-time job tracking
- ⏳ In-app messaging
- ⏳ Technician verification system
- ⏳ Review and rating system
- ⏳ Pickup/delivery scheduling

### Phase 3: Growth
- ⏳ Push notifications
- ⏳ Referral program
- ⏳ Technician analytics dashboard
- ⏳ Multi-city expansion
- ⏳ Parts marketplace

---

## 📄 Documentation

- [Engineering Guide](./Urbanfix%20Engineering%20Guide.md) — Architecture, coding standards, workflows
- [MVP Specification](./Urbanfix%20MVP%20Specification.md) — Feature requirements and user stories
- [Vision Bible](./Urbanfix%20Vision%20Bible.md) — Product vision, market analysis, business model
- [Database Schema](./database/migrations/001_initial_schema.sql) — Complete data model
- [API Documentation](./lib/README.md) — Service layer and API integrations

---

## 🤝 Contributing

We're not currently accepting external contributions, but if you're interested in collaborating, reach out!

### Development Workflow
1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make changes and test thoroughly
3. Run linters: `npm run lint`
4. Run tests: `npm test`
5. Commit with clear messages: `git commit -m "feat: Add job booking flow"`
6. Push and create a Pull Request

---

## 📱 Download & Test

**The app is currently in closed beta.**

- **iOS**: Join TestFlight (coming soon)
- **Android**: Download APK (coming soon)
- **Web Preview**: [urbanfix.app](https://urbanfix.app) (coming soon)

---

## 📧 Contact & Support

- **Website**: [urbanfix.app](https://urbanfix.app) (coming soon)
- **Email**: support@urbanfix.app
- **Twitter**: [@UrbanFixNG](https://twitter.com/UrbanFixNG)
- **Instagram**: [@UrbanFixNG](https://instagram.com/UrbanFixNG)

---

## 📜 License

Copyright © 2026 UrbanFix. All rights reserved.

This is proprietary software. Unauthorized copying, modification, or distribution is prohibited.

---

## 🙏 Acknowledgments

- Design inspiration: Stripe, Uber, Nigerian fintech leaders (Paystack, Flutterwave)
- Icons: Material Symbols (Google)
- Fonts: Inter (Rasmus Andersson)
- Community: React Native, Expo, Supabase communities

---

**Built with ❤️ for Lagos, Nigeria** 🇳🇬
