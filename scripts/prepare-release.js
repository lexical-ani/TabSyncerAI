#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read package.json
const packagePath = path.join(__dirname, '..', 'package.json');
const package = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

console.log(`📦 Preparing release for TabSyncerAI v${package.version}`);

// Validate required files
const requiredFiles = [
  'README.md',
  'LICENSE',
  'CONTRIBUTING.md',
  'config.json',
  'src/main.js',
  'assets/icon.ico',
  'assets/icon.icns',
  'assets/icon.png'
];

console.log('\n🔍 Checking required files...');
let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log('\n❌ Some required files are missing. Please fix before release.');
  process.exit(1);
}

console.log('\n✅ All required files present');
console.log('\n🚀 Ready for release!');
console.log('\nNext steps:');
console.log('1. git add .');
console.log('2. git commit -m "Prepare for v' + package.version + ' release"');
console.log('3. git tag v' + package.version);
console.log('4. git push origin main --tags');
console.log('\nGitHub Actions will automatically build and create the release.');