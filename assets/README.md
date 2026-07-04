# UrbanFix Assets Directory

This directory contains all official UrbanFix branded visual assets for the mobile application.

## Official Brand Assets

### App Icons
- **Urbanfix--app-icon.png** (1024×1024px) - Primary app icon for iOS and Android
  - Features: Shield + wrench design with circuit board traces
  - Colors: Deep Trust Blue (#031636) with Success Green (#2ECC71) verification badge
  - Usage: Home screen icon across all platforms

### Android Adaptive Icon
- **Urbanfix-adaptive-icon.png** (1024×1024px) - Android adaptive icon foreground layer
  - Background color: `#0A1628` (configured in app.json)
  - Safe area: Center 432×432px
  - Supports: Circles, squircles, teardrops (all Android launcher shapes)

### Favicon
- **Urbanfix-favicon.png** (512×512px) - Web favicon for browser tabs
  - Simplified shield + wrench mark
  - High contrast for small sizes (16×16, 32×32, 48×48)
  - Usage: Browser tabs, bookmarks, PWA icons

### Splash Screen
- **splash.png** (1125×2436px portrait) - App launch screen
  - Features: UrbanFix logo lockup with "Trusted Repairs, Guaranteed" tagline
  - Background: Deep blue (#0A1628) with subtle circuit board pattern
  - ResizeMode: `contain` (logo centered with breathing room)
  - Loading indicators: Three dots at bottom

## Brand Guidelines

### Color Palette
- **Primary**: `#031636` (Deep Trust Blue) - Professionalism, security
- **Primary Container**: `#1A2B4C` - Elevated surfaces
- **Secondary**: `#FF5722` (Emergency Orange) - CTAs, action items
- **Tertiary**: `#2ECC71` (Success Green) - Verification, trust signals
- **Background**: `#F7FAFC` (Soft Gray) - Clean, modern aesthetic
- **Splash Background**: `#0A1628` (Darker blue for launch experience)

### Design Principles
1. **Trust First**: Every visual communicates professionalism and reliability
2. **Nigerian Context**: Internationally credible, locally relevant
3. **Scalability**: Icons work at 16px without losing clarity
4. **Consistency**: All assets are part of a unified brand family
5. **Accessibility**: High contrast for colorblind users

## Technical Specifications

### Icon Requirements
- Format: PNG with transparency (except splash)
- Color Mode: sRGB
- Resolution: @3x density minimum
- Safe Area: Center 80% for icon (avoid corners)

### Configuration
All assets are referenced in `app.json`:
```json
{
  "icon": "./assets/Urbanfix--app-icon.png",
  "splash": {
    "image": "./assets/splash.png",
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

## Asset Generation

These assets were generated following the UrbanFix Brand Identity Guidelines:
- **Concept**: Shield + precision tool = Trust + Expertise
- **Style**: Flat 2.5D with subtle depth layers
- **Inspiration**: Stripe (trust) + iFixit (repair) + Nigerian fintech (local credibility)

## Legacy Assets

Old placeholder assets have been moved to `_old_placeholders/` directory and are no longer in use.

## Testing Your New Assets

After updating assets, clear Expo's cache and rebuild:

```bash
# Clear Expo cache
npx expo start --clear

# Or for a full rebuild
rm -rf node_modules/.cache
npx expo prebuild --clean
npx expo start
```

## Updates

When updating brand assets:
1. Maintain the same naming convention
2. Preserve technical specifications (dimensions, format)
3. Update this README with change notes
4. Run `expo prebuild --clean` to clear cache
5. Test on both iOS and Android devices

---

**Last Updated**: January 2026  
**Brand Version**: 1.0  
**Designer Contact**: Product Design Team
