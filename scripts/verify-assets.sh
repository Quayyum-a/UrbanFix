#!/bin/bash

# UrbanFix Asset Verification Script
# Ensures all branded assets are properly configured

echo "🎨 UrbanFix Asset Verification"
echo "================================"
echo ""

ASSETS_DIR="assets"
ERRORS=0

# Check if assets directory exists
if [ ! -d "$ASSETS_DIR" ]; then
    echo "❌ Assets directory not found!"
    exit 1
fi

# Function to check if file exists and report size
check_asset() {
    local file=$1
    local name=$2
    
    if [ -f "$ASSETS_DIR/$file" ]; then
        local size=$(du -h "$ASSETS_DIR/$file" | cut -f1)
        echo "✅ $name: $size"
    else
        echo "❌ $name: MISSING"
        ERRORS=$((ERRORS + 1))
    fi
}

echo "Checking UrbanFix Brand Assets:"
echo "--------------------------------"
check_asset "Urbanfix--app-icon.png" "App Icon"
check_asset "Urbanfix-adaptive-icon.png" "Adaptive Icon"
check_asset "Urbanfix-favicon.png" "Favicon"
check_asset "splash.png" "Splash Screen"

echo ""
echo "Checking app.json configuration:"
echo "--------------------------------"

if grep -q "Urbanfix--app-icon.png" app.json; then
    echo "✅ App icon path configured"
else
    echo "❌ App icon path NOT configured"
    ERRORS=$((ERRORS + 1))
fi

if grep -q "Urbanfix-adaptive-icon.png" app.json; then
    echo "✅ Adaptive icon path configured"
else
    echo "❌ Adaptive icon path NOT configured"
    ERRORS=$((ERRORS + 1))
fi

if grep -q "Urbanfix-favicon.png" app.json; then
    echo "✅ Favicon path configured"
else
    echo "❌ Favicon path NOT configured"
    ERRORS=$((ERRORS + 1))
fi

if grep -q "#0A1628" app.json; then
    echo "✅ Brand background color configured"
else
    echo "⚠️  Using non-brand background color"
fi

echo ""
echo "================================"
if [ $ERRORS -eq 0 ]; then
    echo "✅ All assets verified successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Run: npx expo start --clear"
    echo "2. Test on iOS and Android devices"
    echo "3. Check that icons appear correctly"
else
    echo "❌ Found $ERRORS error(s)"
    echo "Please fix the issues above"
    exit 1
fi
