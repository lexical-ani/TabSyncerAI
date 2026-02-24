#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🎨 Generating TabSyncerAI Logo...\n');

// SVG content for the logo
const svgContent = fs.readFileSync(path.join(__dirname, '..', 'assets', 'logo.svg'), 'utf8');

// Save the main PNG (we'll use a simple approach)
console.log('📝 SVG logo created at: assets/logo.svg');
console.log('');
console.log('To generate PNG icons from SVG, you have several options:');
console.log('');
console.log('Option 1: Use online converter');
console.log('  1. Go to https://cloudconvert.com/svg-to-png');
console.log('  2. Upload assets/logo.svg');
console.log('  3. Set size to 1024x1024');
console.log('  4. Download and save as assets/icon.png');
console.log('');
console.log('Option 2: Use ImageMagick (if installed)');
console.log('  magick convert -background none -resize 1024x1024 assets/logo.svg assets/icon.png');
console.log('');
console.log('Option 3: Use Inkscape (if installed)');
console.log('  inkscape assets/logo.svg --export-type=png --export-filename=assets/icon.png -w 1024 -h 1024');
console.log('');
console.log('After creating icon.png, run: npm run build:icons');
console.log('');

// Try to detect if we have any conversion tools
let converted = false;

// Try ImageMagick
try {
  execSync('magick --version', { stdio: 'ignore' });
  console.log('✅ ImageMagick detected! Converting...');
  execSync('magick convert -background none -resize 1024x1024 assets/logo.svg assets/icon.png', { stdio: 'inherit' });
  converted = true;
  console.log('✅ Icon generated: assets/icon.png');
} catch (e) {
  // ImageMagick not available
}

// Try Inkscape if ImageMagick failed
if (!converted) {
  try {
    execSync('inkscape --version', { stdio: 'ignore' });
    console.log('✅ Inkscape detected! Converting...');
    execSync('inkscape assets/logo.svg --export-type=png --export-filename=assets/icon.png -w 1024 -h 1024', { stdio: 'inherit' });
    converted = true;
    console.log('✅ Icon generated: assets/icon.png');
  } catch (e) {
    // Inkscape not available
  }
}

if (converted) {
  console.log('');
  console.log('🎉 Logo generated successfully!');
  console.log('Now run: npm run build:icons');
} else {
  console.log('⚠️  No conversion tool found. Please use one of the options above.');
}

console.log('');
console.log('📦 The new logo features:');
console.log('  • Modern gradient background (purple to violet)');
console.log('  • Three overlapping panels (multi-panel interface)');
console.log('  • AI network symbol (connected nodes)');
console.log('  • Sync arrows (broadcast functionality)');
console.log('  • Professional and clean design');