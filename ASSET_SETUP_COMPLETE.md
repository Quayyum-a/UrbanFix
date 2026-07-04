# UrbanFix Asset Integration - Setup Guide

## ✅ Current Status

Your UrbanFix app is configured with the new branded assets!

### Configured Assets:
- ✅ **App Icon**: `Urbanfix--app-icon.png` (401×406px) - Shield with wrench logo
- ✅ **Adaptive Icon**: `Urbanfix-adaptive-icon.png` (422×425px) - Android adaptive icon
- ✅ **Favicon**: `Urbanfix-favicon.png` (373×370px) - Web favicon
- ⚠️ **Splash Screen**: `splash.png` (needs replacement with your branded splash)

### App.json Configuration:
```json
{
  "icon": "./assets/Urbanfix--app-icon.png",
  "splash": {
    "image": "./assets/splash.png",
    "resizeMode": "contain",
    "backgroundColor": "#0A1628"
  },
  "android": {
    "adaptiveIcon": {
      "foregroundImage": "./assets/Urbanfix-adaptive-icon.png",
      "backgroundColor": "#0A1628"
    }
  },
  "web": {
    "favicon": "./assets/Urbanfix-favicon.png"
  }
}
```

## 📋 To Complete Setup

### Step 1: Replace Splash Screen
The current `splash.png` is a 1×1 placeholder. Replace it with your branded splash screen:

1. **Save your branded splash screen** (the one with UrbanFix logo, circuit board pattern, and "Trusted Repairs, Guaranteed" tagline)
2. **Name it**: `splash.png`
3. **Recommended dimensions**: 1125×2436px (iPhone) or 1080×1920px (Android)
4. **Move it to**: `/Users/user/UrbanFix/urbanfix-app/assets/splash.png`

### Step 2: Clear Cache and Test
```bash
cd /Users/user/UrbanFix/urbanfix-app

# Clear Expo cache
npx expo start --clear

# Or for a complete clean start
rm -rf node_modules/.cache .expo
npx expo start
```

### Step 3: Test on Devices
- **iOS**: Press Cmd+I in Expo Go
- **Android**: Press Cmd+A in Expo Go
- Check that:
  - App icon appears correctly on home screen
  - Splash screen shows your branded design
  - Loading experience feels premium

## 🎨 Brand Assets Summary

All assets follow the UrbanFix brand guidelines:
- **Colors**: Deep Trust Blue (#031636, #0A1628), Success Green (#2ECC71)
- **Design**: Shield + wrench = Trust + Expertise
- **Style**: Professional, trustworthy, Nigerian fintech-grade quality

## 🔧 Troubleshooting

### Assets not showing?
```bash
# Clear all caches
npx expo start --clear
rm -rf .expo node_modules/.cache
```

### Icon looks blurry?
- Ensure icon files are high resolution (400px+ minimum)
- For production, consider regenerating at 1024×1024px

### Splash screen stretched?
- Verify `resizeMode: "contain"` in app.json
- Ensure splash.png has proper portrait dimensions

## 📱 Production Checklist

Before shipping to production:
- [ ] Test app icon on actual devices (iOS & Android)
- [ ] Verify splash screen on different screen sizes
- [ ] Check favicon in web browsers
- [ ] Ensure all assets are optimized (compressed PNGs)
- [ ] Verify adaptive icon works with all launcher shapes (Android)

## 🚀 Ready to Launch

Once splash screen is replaced and tested, your UrbanFix branding is complete!

---

**Need Help?**
- Run: `./scripts/verify-assets.sh` to check asset status
- See: `assets/README.md` for detailed asset documentation
