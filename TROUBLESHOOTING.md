# UrbanFix Troubleshooting Guide

## ✅ Fixed: OpenTelemetry API Error

**Error**: `Unable to resolve "@opentelemetry/api" from "node_modules/@supabase/supabase-js/dist/index.mjs"`

**Solution Applied**:
```bash
npm install @opentelemetry/api --legacy-peer-deps
npm install expo-crypto --legacy-peer-deps
```

**Metro Config Updated**: Added `.mjs` support for Supabase

---

## 🚀 How to Start the App (After Fix)

### Step 1: Stop Any Running Servers
```bash
# Find and kill any running Expo processes
lsof -ti:8081 | xargs kill -9
# Or
killall node
```

### Step 2: Clear All Caches
```bash
cd /Users/user/UrbanFix/urbanfix-app

# Clear Expo cache
rm -rf .expo

# Clear Metro bundler cache
rm -rf node_modules/.cache

# Clear watchman (if installed)
watchman watch-del-all 2>/dev/null
```

### Step 3: Start Fresh
```bash
# Clear and start
npx expo start --clear

# Or if web bundling still fails, skip web:
npx expo start --clear --no-web
```

### Step 4: Choose Your Platform
- **iOS**: Press `i` (requires Mac + Xcode)
- **Android**: Press `a` (requires Android Studio)
- **Physical Device**: Scan QR code with Expo Go app
- **Web**: Press `w` (may have limitations with Supabase)

---

## 🐛 Common Issues & Solutions

### Issue 1: React Native Worklets Missing (Reanimated 4)
**Error**: `Cannot find module 'react-native-worklets/plugin'`

**Solution**:
```bash
# Install the required package
npm install react-native-worklets --legacy-peer-deps

# Clear all caches
rm -rf .expo node_modules/.cache
rm -rf $TMPDIR/metro-* $TMPDIR/react-* 2>/dev/null

# Restart Expo
npx expo start --clear
```

**Why it happens**: React Native Reanimated 4 requires the worklets plugin as a peer dependency

---

### Issue 2: Web Bundling Failed
**Error**: Web bundling fails with OpenTelemetry or Supabase errors

**Solution**:
```bash
# Option A: Run without web (recommended for mobile-first apps)
npx expo start --no-web

# Option B: Install missing dependencies
npm install @opentelemetry/api expo-crypto --legacy-peer-deps
```

**Why it happens**: Supabase has dependencies that don't work well with web bundlers

---

### Issue 2: Port Already in Use
**Error**: `Port 8081 is running this app in another window`

**Solution**:
```bash
# Kill process on port 8081
lsof -ti:8081 | xargs kill -9

# Or use a different port
npx expo start --port 8082
```

---

### Issue 3: Module Resolution Errors
**Error**: `Unable to resolve module "X" from "Y"`

**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# Clear caches
npx expo start --clear
```

---

### Issue 4: Fonts Not Loading
**Error**: Fonts fail to load or app crashes on start

**Solution**:
```typescript
// In app/_layout.tsx, ensure fonts are loaded before rendering
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Inter_400Regular': require('../assets/fonts/Inter-Regular.ttf'),
    // ... other fonts
  });

  if (!fontsLoaded) {
    return null; // Don't render until fonts load
  }

  SplashScreen.hideAsync();
  return <Stack />;
}
```

---

### Issue 5: Supabase Connection Errors
**Error**: Network request failed or 401 errors

**Solution**:
```bash
# 1. Check .env file exists
cat .env

# 2. Verify credentials are correct
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# 3. Restart Expo to reload environment variables
npx expo start --clear
```

---

### Issue 6: Location Permissions Not Working
**Error**: Location services fail or crash app

**Solution**:
```bash
# iOS: Check Info.plist permissions in app.json
# Android: Check permissions array in app.json

# Rebuild app
npx expo prebuild --clean
npx expo run:ios
# or
npx expo run:android
```

---

### Issue 7: Build Errors (EAS Build)
**Error**: Build fails on EAS or locally

**Solution**:
```bash
# Update EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build for iOS
eas build --platform ios --profile development

# Build for Android
eas build --platform android --profile development
```

---

## 📱 Platform-Specific Issues

### iOS Simulator Issues
```bash
# Reset simulator
xcrun simctl shutdown all
xcrun simctl erase all

# Rebuild
npx expo run:ios
```

### Android Emulator Issues
```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..
npx expo run:android
```

---

## 🔧 Development Commands

### Start Commands
```bash
# Standard start
npx expo start

# Clear cache and start
npx expo start --clear

# Start without web (faster)
npx expo start --no-web

# Start on specific platform
npx expo start --ios
npx expo start --android

# Start in production mode
npx expo start --no-dev --minify
```

### Testing Commands
```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- Button.test.tsx

# Run with coverage
npm test -- --coverage
```

### Build Commands
```bash
# Development build (local)
npx expo run:ios
npx expo run:android

# Production build (EAS)
eas build --platform ios --profile production
eas build --platform android --profile production
```

---

## 🆘 Emergency Reset

If nothing works, do a complete reset:

```bash
cd /Users/user/UrbanFix/urbanfix-app

# 1. Stop all processes
killall node
lsof -ti:8081 | xargs kill -9

# 2. Remove all caches and builds
rm -rf node_modules
rm -rf .expo
rm -rf ios/Pods
rm -rf android/build
rm -rf package-lock.json
rm -rf $TMPDIR/react-*
rm -rf $TMPDIR/metro-*

# 3. Clear Metro bundler cache
rm -rf $TMPDIR/metro-bundler-cache-*
rm -rf $TMPDIR/haste-map-*

# 4. Clear watchman (if installed)
watchman watch-del-all 2>/dev/null

# 5. Reinstall dependencies
npm install --legacy-peer-deps

# 6. Start fresh
npx expo start --clear
```

---

## 📝 Quick Reference

### Important File Paths
- **Project Root**: `/Users/user/UrbanFix/urbanfix-app`
- **Environment Variables**: `.env`
- **App Entry**: `app/_layout.tsx`
- **Supabase Client**: `lib/supabase.ts`
- **Theme Constants**: `constants/theme.ts`

### Key Dependencies
- `expo` ~51.0.0
- `react-native` ^0.74.5
- `@supabase/supabase-js` ^2.44.0
- `expo-router` ~3.5.0
- `@opentelemetry/api` (newly added)
- `expo-crypto` (newly added)

### Environment Variables Required
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY=your_paystack_key
```

---

## 🔗 Useful Resources

- **Expo Docs**: https://docs.expo.dev/
- **Supabase Docs**: https://supabase.com/docs
- **React Native Docs**: https://reactnative.dev/
- **Expo Router Docs**: https://docs.expo.dev/router/introduction/

---

## ✅ Current Status

**Dependencies Fixed**:
- ✅ @opentelemetry/api installed
- ✅ expo-crypto installed
- ✅ Metro config updated for .mjs support

**Next Steps**:
1. Run `npx expo start --clear`
2. Press `i` for iOS, `a` for Android, or scan QR code
3. Avoid web platform for now (Supabase has web compatibility issues)

---

**Need More Help?**
Check the error logs in:
- Terminal output
- Expo Dev Tools (opens in browser)
- Device logs (shake device → "Show Developer Menu" → "Debug")
