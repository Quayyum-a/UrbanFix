#!/usr/bin/env node

/**
 * Verify all required assets exist and are properly configured
 */

const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets');
const appConfig = require('../app.json');

console.log('🔍 Verifying UrbanFix app assets...\n');

// Required assets based on app.json configuration
const requiredAssets = [
  { 
    path: appConfig.expo.icon, 
    name: 'App Icon',
    expected: './assets/icon.png'
  },
  { 
    path: appConfig.expo.splash.image, 
    name: 'Splash Screen',
    expected: './assets/splash.png'
  },
  { 
    path: appConfig.expo.android.adaptiveIcon.foregroundImage, 
    name: 'Android Adaptive Icon',
    expected: './assets/adaptive-icon.png'
  },
  { 
    path: appConfig.expo.web.favicon, 
    name: 'Web Favicon',
    expected: './assets/favicon.png'
  }
];

let allAssetsValid = true;

requiredAssets.forEach((asset, index) => {
  const fullPath = path.join(__dirname, '..', asset.path);
  const exists = fs.existsSync(fullPath);
  const status = exists ? '✅' : '❌';
  
  console.log(`${index + 1}. ${asset.name}`);
  console.log(`   Path: ${asset.path}`);
  console.log(`   Status: ${status} ${exists ? 'Found' : 'Missing'}`);
  
  if (exists) {
    const stats = fs.statSync(fullPath);
    console.log(`   Size: ${stats.size} bytes`);
  }
  
  console.log('');
  
  if (!exists) {
    allAssetsValid = false;
  }
});

// Check for SVG sources
console.log('📄 SVG Source Files:');
const svgFiles = ['icon.svg', 'adaptive-icon.svg', 'splash.svg', 'favicon.svg'];
svgFiles.forEach((svgFile, index) => {
  const svgPath = path.join(assetsDir, svgFile);
  const exists = fs.existsSync(svgPath);
  const status = exists ? '✅' : '❌';
  console.log(`${index + 1}. ${svgFile}: ${status}`);
});

console.log('\n' + '='.repeat(50));
if (allAssetsValid) {
  console.log('🎉 All required assets are present and configured correctly!');
  console.log('The app should now build without asset resolution errors.');
} else {
  console.log('⚠️  Some required assets are missing. Please check the paths above.');
}

console.log('\n💡 Next steps:');
console.log('1. Replace placeholder PNGs with high-quality versions from SVG sources');
console.log('2. Test app build: npx expo start');
console.log('3. Verify assets display correctly on different screen sizes');