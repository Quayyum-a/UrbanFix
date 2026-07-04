#!/bin/bash

# UrbanFix Asset Finalization Script
# Run after replacing splash.png with your branded splash screen

echo "🎨 UrbanFix Asset Finalization"
echo "==============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check splash screen
echo "Checking splash screen..."
SPLASH_SIZE=$(wc -c < "assets/splash.png" | tr -d ' ')

if [ "$SPLASH_SIZE" -lt 10000 ]; then
    echo -e "${YELLOW}⚠️  Splash screen appears to be a placeholder ($SPLASH_SIZE bytes)${NC}"
    echo "   Please replace assets/splash.png with your branded splash screen"
    echo ""
    echo "   Your branded splash should include:"
    echo "   - UrbanFix shield + wrench logo"
    echo "   - 'Trusted Repairs, Guaranteed' tagline"
    echo "   - Circuit board pattern background"
    echo "   - Dark blue (#0A1628) background color"
    echo ""
else
    echo -e "${GREEN}✅ Splash screen looks good ($SPLASH_SIZE bytes)${NC}"
fi

echo ""
echo "Checking other assets..."
echo "------------------------"

check_asset() {
    local file=$1
    local name=$2
    local size=$(wc -c < "$file" 2>/dev/null | tr -d ' ')
    
    if [ -f "$file" ] && [ "$size" -gt 50000 ]; then
        echo -e "${GREEN}✅${NC} $name: $(du -h "$file" | cut -f1)"
    elif [ -f "$file" ]; then
        echo -e "${YELLOW}⚠️${NC}  $name: $(du -h "$file" | cut -f1) (seems small)"
    else
        echo -e "${RED}❌${NC} $name: MISSING"
    fi
}

check_asset "assets/Urbanfix--app-icon.png" "App Icon"
check_asset "assets/Urbanfix-adaptive-icon.png" "Adaptive Icon"
check_asset "assets/Urbanfix-favicon.png" "Favicon"

echo ""
echo "Next steps:"
echo "-----------"

if [ "$SPLASH_SIZE" -lt 10000 ]; then
    echo "1. Replace assets/splash.png with your branded splash screen"
    echo "2. Run this script again to verify"
    echo "3. Then run: npx expo start --clear"
else
    echo "1. Clear Expo cache: npx expo start --clear"
    echo "2. Test on iOS and Android devices"
    echo "3. Verify branding looks professional and trustworthy"
    echo ""
    echo -e "${GREEN}🚀 Your UrbanFix branding is ready!${NC}"
fi

echo ""
