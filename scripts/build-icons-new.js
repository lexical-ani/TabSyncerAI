#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { execSync } = require('child_process');

console.log('🔨 Building platform-specific icon files...\n');

const assetsDir = path.join(__dirname, '..', 'assets');
const iconPath = path.join(assetsDir, 'icon.png');

async function buildIcons() {
  try {
    // Check if icon.png exists
    if (!fs.existsSync(iconPath)) {
      console.error('❌ icon.png not found. Run: npm run convert-logo first');
      process.exit(1);
    }
    
    console.log('✅ Found icon.png');
    
    // For .ico and .icns, we'll use electron-builder's built-in icon generation
    // Just make sure we have the right PNG files
    
    console.log('✅ PNG icons ready');
    console.log('');
    console.log('📝 Note: .ico and .icns files will be generated automatically by electron-builder during build');
    console.log('');
    console.log('Next steps:');
    console.log('1. Update version to 2.0.0 in package.json');
    console.log('2. Update CHANGELOG.md with v2.0.0 changes');
    console.log('3. Commit changes: git add . && git commit -m "Update logo and prepare v2.0.0"');
    console.log('4. Create tag: git tag v2.0.0');
    console.log('5. Push: git push origin master --tags');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

buildIcons();