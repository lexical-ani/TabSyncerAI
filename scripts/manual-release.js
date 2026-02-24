#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Manual Release Helper for TabSyncerAI v1.0.0');
console.log('');

console.log('If GitHub Actions fails, you can create a manual release:');
console.log('');

console.log('1. Build all platforms locally:');
console.log('   npm run build:win    # Creates Windows installer');
console.log('   npm run build:mac    # Creates macOS DMG (requires macOS)');
console.log('   npm run build:linux  # Creates Linux packages (requires Linux)');
console.log('');

console.log('2. Go to GitHub releases page:');
console.log('   https://github.com/lexical-ani/TabSyncerAI/releases');
console.log('');

console.log('3. Click "Create a new release"');
console.log('   - Tag: v1.0.0');
console.log('   - Title: TabSyncerAI v1.0.0 - First Open Source Release');
console.log('   - Description: Copy from RELEASE_NOTES_v1.0.0.md');
console.log('');

console.log('4. Upload these files from dist/ folder:');
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  const files = fs.readdirSync(distPath).filter(f => 
    f.endsWith('.exe') || 
    f.endsWith('.dmg') || 
    f.endsWith('.AppImage') || 
    f.endsWith('.deb') || 
    f.endsWith('.zip')
  );
  
  if (files.length > 0) {
    console.log('   Available files:');
    files.forEach(file => console.log(`   ✅ ${file}`));
  } else {
    console.log('   ❌ No build files found. Run builds first.');
  }
} else {
  console.log('   ❌ dist/ folder not found. Run builds first.');
}

console.log('');
console.log('5. Publish the release');
console.log('');
console.log('📊 Current status:');
console.log('   Repository: https://github.com/lexical-ani/TabSyncerAI');
console.log('   Actions: https://github.com/lexical-ani/TabSyncerAI/actions');
console.log('   Releases: https://github.com/lexical-ani/TabSyncerAI/releases');