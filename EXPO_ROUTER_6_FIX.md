# Expo Router 6 Compatibility Fix

**Issue**: React Navigation compatibility error after SDK 54 upgrade  
**Error**: `createScreenFactory is not a function`

---

## 🔧 Quick Fix

The SDK 54 upgrade to Expo Router 6 requires React Navigation 7, which has breaking changes.

### Solution 1: Clean Reinstall (Recommended)

```bash
cd /Users/user/UrbanFix/urbanfix-app

# Step 1: Remove all caches and node_modules
rm -rf node_modules package-lock.json .expo
rm -rf node_modules/.cache
rm -rf $TMPDIR/metro-* $TMPDIR/react-* 2>/dev/null

# Step 2: Reinstall all dependencies
npm install --legacy-peer-deps

# Step 3: Start fresh
npx expo start --clear
```

### Solution 2: If Clean Reinstall Fails

Downgrade back to Expo SDK 51 (stable):

```bash
cd /Users/user/UrbanFix/urbanfix-app

# Revert to last working commit
git log --oneline -10  # Find commit before SDK 54 upgrade
git reset --hard <commit-hash-before-sdk-54>

# Reinstall
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# Start
npx expo start --clear
```

---

## 📋 Root Cause

Expo Router 6 (SDK 54) uses:
- React Navigation 7.x (breaking changes)
- New navigation APIs
- Different Stack component implementation

Your code files are correct (they have `export default`), but the internal Expo Router navigation factory changed.

---

## ✅ Verification Steps

After reinstalling, check:

```bash
# 1. Verify React Navigation version
npm list @react-navigation/native

# Should show: @react-navigation/native@7.3.7 (or 7.x)

# 2. Verify Expo Router version
npm list expo-router

# Should show: expo-router@6.0.24 (or 6.x)

# 3. Check for peer dependency warnings
npm install --legacy-peer-deps

# 4. Clear all caches
rm -rf .expo node_modules/.cache

# 5. Start fresh
npx expo start --clear
```

---

## 🔄 Alternative: Use Expo SDK 51 (Stable)

If SDK 54 continues to have issues, stay on SDK 51:

```bash
# Install Expo SDK 51
npx expo install expo@~51.0.0 --fix -- --legacy-peer-deps

# This will downgrade:
# - expo: 54 → 51
# - expo-router: 6 → 3.5
# - react-navigation: 7 → 6
# - Many other packages

# Then reinstall
rm -rf node_modules package-lock.json .expo
npm install --legacy-peer-deps
npx expo start --clear
```

---

## 📊 What Changed in SDK 54

| Package | SDK 51 | SDK 54 | Breaking? |
|---------|--------|--------|-----------|
| expo-router | 3.5.x | 6.0.x | ✅ Yes |
| @react-navigation/native | 6.x | 7.x | ✅ Yes |
| react | 18.2 | 19.1 | ⚠️ Minor |
| react-native | 0.74 | 0.81 | ⚠️ Minor |

The main breaking change is Expo Router's internal navigation implementation.

---

## 🆘 If Still Not Working

### Nuclear Option: Fresh Start

```bash
cd /Users/user/UrbanFix/urbanfix-app

# 1. Save your code
git add .
git commit -m "WIP: Before nuclear reset"

# 2. Remove EVERYTHING
rm -rf node_modules package-lock.json
rm -rf .expo ios android .metro-health-check*
rm -rf $TMPDIR/react-* $TMPDIR/metro-* $TMPDIR/haste-map-* 2>/dev/null

# 3. Reset watchman (if installed)
watchman watch-del-all 2>/dev/null

# 4. Clean npm cache
npm cache clean --force

# 5. Reinstall from scratch
npm install --legacy-peer-deps

# 6. Rebuild (if using development builds)
npx expo prebuild --clean

# 7. Start
npx expo start --clear
```

---

## 💡 Recommended Approach

**For Production Stability**: Use Expo SDK 51
- More stable
- Better tested
- Fewer breaking changes
- Your code already works with it

**For Latest Features**: Use Expo SDK 54
- Latest React 19
- Latest React Native 0.81
- Expo Router 6 improvements
- But requires more debugging

---

## 🚀 Quick Commands

### Start with SDK 54 (current)
```bash
cd /Users/user/UrbanFix/urbanfix-app
rm -rf node_modules package-lock.json .expo
npm install --legacy-peer-deps
npx expo start --clear
```

### Downgrade to SDK 51 (stable)
```bash
cd /Users/user/UrbanFix/urbanfix-app
npx expo install expo@~51.0.0 --fix -- --legacy-peer-deps
npm install --legacy-peer-deps
npx expo start --clear
```

---

## 📝 Next Steps

1. Try clean reinstall first
2. If that fails, downgrade to SDK 51
3. Test the app thoroughly
4. Consider staying on SDK 51 for stability

The error is NOT in your code - it's an Expo Router internal issue with SDK 54.

---

**Current Status**: Awaiting clean reinstall  
**Recommended**: Downgrade to SDK 51 if issues persist
