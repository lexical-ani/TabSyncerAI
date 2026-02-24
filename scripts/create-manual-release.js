#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Manual Release Creator for TabSyncerAI');
console.log('');

// Check if we have build artifacts
const distPath = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distPath)) {
  console.log('❌ No dist folder found. Please run a build first:');
  console.log('   npm run build:win');
  process.exit(1);
}

const files = fs.readdirSync(distPath);
const releaseFiles = files.filter(f => 
  f.endsWith('.exe') || 
  f.endsWith('.dmg') || 
  f.endsWith('.AppImage') || 
  f.endsWith('.deb') || 
  f.endsWith('.zip')
);

if (releaseFiles.length === 0) {
  console.log('❌ No release files found in dist folder.');
  console.log('   Please run a build first: npm run build:win');
  process.exit(1);
}

console.log('✅ Found release files:');
releaseFiles.forEach(file => {
  const filePath = path.join(distPath, file);
  const stats = fs.statSync(filePath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
  console.log(`   📦 ${file} (${sizeMB} MB)`);
});

console.log('');
console.log('📋 Manual Release Instructions:');
console.log('');
console.log('1. Go to: https://github.com/lexical-ani/TabSyncerAI/releases');
console.log('2. Click "Create a new release"');
console.log('3. Fill in the details:');
console.log('   - Tag: v1.0.0');
console.log('   - Title: TabSyncerAI v1.0.0 - First Release');
console.log('   - Description: Copy from RELEASE_NOTES_v1.0.0.md');
console.log('');
console.log('4. Upload these files by dragging them to the release:');
releaseFiles.forEach(file => {
  console.log(`   📎 ${file}`);
});
console.log('');
console.log('5. Click "Publish release"');
console.log('');
console.log('💡 Tip: You can also use GitHub CLI if you have it installed:');
console.log('   gh release create v1.0.0 dist/*.exe dist/*.dmg dist/*.AppImage dist/*.deb --title "TabSyncerAI v1.0.0" --notes-file RELEASE_NOTES_v1.0.0.md');
console.log('');
console.log('🔗 Repository: https://github.com/lexical-ani/TabSyncerAI');
console.log('📊 Actions: https://github.com/lexical-ani/TabSyncerAI/actions');
console.log('🎉 Releases: https://github.com/lexical-ani/TabSyncerAI/releases');