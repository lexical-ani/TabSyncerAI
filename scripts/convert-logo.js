#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

console.log('🎨 Converting SVG logo to PNG icons...\n');

const svgPath = path.join(__dirname, '..', 'assets', 'logo.svg');
const assetsDir = path.join(__dirname, '..', 'assets');

const sizes = [
  { size: 1024, name: 'icon.png' },
  { size: 1024, name: 'icon_1024x1024.png' },
  { size: 512, name: 'icon_512x512.png' },
  { size: 256, name: 'icon_256x256.png' },
  { size: 128, name: 'icon_128x128.png' },
  { size: 64, name: 'icon_64x64.png' },
  { size: 48, name: 'icon_48x48.png' },
  { size: 32, name: 'icon_32x32.png' },
  { size: 24, name: 'icon_24x24.png' },
  { size: 16, name: 'icon_16x16.png' }
];

async function convertSVGtoPNG() {
  try {
    const svgBuffer = fs.readFileSync(svgPath);
    
    for (const { size, name } of sizes) {
      const outputPath = path.join(assetsDir, name);
      
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated: ${name} (${size}x${size})`);
    }
    
    console.log('\n🎉 All PNG icons generated successfully!');
    console.log('\nNext steps:');
    console.log('1. Run: npm run build:icons (to generate .ico and .icns)');
    console.log('2. Update version to 2.0.0');
    console.log('3. Create release: git tag v2.0.0 && git push origin v2.0.0');
    
  } catch (error) {
    console.error('❌ Error converting SVG:', error.message);
    process.exit(1);
  }
}

convertSVGtoPNG();