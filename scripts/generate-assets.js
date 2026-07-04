#!/usr/bin/env node

/**
 * Generate placeholder assets for UrbanFix app
 * Creates simple PNG files with UrbanFix branding colors
 */

const fs = require('fs');
const path = require('path');

// UrbanFix brand colors
const DEEP_TRUST_BLUE = '#031636';
const PRIMARY_LIGHT = '#1A2B4C';

// Simple 1x1 pixel PNG in Deep Trust Blue (base64 encoded)
// This is a minimal valid PNG file that can be scaled
const bluePNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU8q9wAAAABJRU5ErkJggg==';

// Generate assets with proper dimensions by creating SVG and converting
function createSVGIcon(width, height, backgroundColor = DEEP_TRUST_BLUE) {
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="urbanfixGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${DEEP_TRUST_BLUE};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${PRIMARY_LIGHT};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#urbanfixGrad)"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
        fill="white" font-family="Arial, sans-serif" font-size="${Math.min(width, height) * 0.1}" font-weight="bold">UF</text>
</svg>`;
}

function createSplashSVG(width, height) {
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="splashGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${PRIMARY_LIGHT};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${DEEP_TRUST_BLUE};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#splashGrad)"/>
  <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" 
        fill="white" font-family="Arial, sans-serif" font-size="48" font-weight="bold">UrbanFix</text>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" 
        fill="#8293ba" font-family="Arial, sans-serif" font-size="18">Professional Device Repair</text>
</svg>`;
}

// Create assets directory
const assetsDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Generate SVG files that can be manually converted to PNG
const assets = [
  { name: 'icon.svg', content: createSVGIcon(1024, 1024), description: '1024x1024 app icon' },
  { name: 'adaptive-icon.svg', content: createSVGIcon(1024, 1024), description: '1024x1024 adaptive icon' },
  { name: 'splash.svg', content: createSplashSVG(1284, 2778), description: '1284x2778 splash screen' },
  { name: 'favicon.svg', content: createSVGIcon(32, 32), description: '32x32 web favicon' }
];

// Write SVG files
assets.forEach(asset => {
  const filePath = path.join(assetsDir, asset.name);
  fs.writeFileSync(filePath, asset.content);
  console.log(`✓ Created ${asset.name} (${asset.description})`);
});

console.log('\n📝 SVG assets created! Convert to PNG using one of these methods:');
console.log('1. Online converter: https://cloudconvert.com/svg-to-png');
console.log('2. ImageMagick: convert icon.svg icon.png');
console.log('3. Inkscape: inkscape --export-png=icon.png icon.svg');
console.log('\nOr use the simple placeholder PNGs generated below...\n');

// For immediate functionality, create minimal placeholder PNGs
// These are extremely simple but will prevent build errors
const placeholders = [
  { name: 'icon.png', size: '1024x1024' },
  { name: 'adaptive-icon.png', size: '1024x1024' },
  { name: 'splash.png', size: '1284x2778' },
  { name: 'favicon.png', size: '32x32' }
];

// Create minimal working PNG files (1x1 pixel that will be scaled)
const minimalPNG = Buffer.from(bluePNG, 'base64');

placeholders.forEach(placeholder => {
  const filePath = path.join(assetsDir, placeholder.name);
  fs.writeFileSync(filePath, minimalPNG);
  console.log(`✓ Created minimal ${placeholder.name} (${placeholder.size} - will be scaled)`);
});

console.log('\n🎉 All placeholder assets created!');
console.log('The minimal PNG files will prevent build errors.');
console.log('Replace them with proper SVG-converted PNGs for production.');