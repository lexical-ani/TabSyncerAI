// Script to create ICO file from PNG
const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');

async function createIco() {
    try {
        console.log('Creating icon.ico from PNG files...');
        
        const pngFiles = [
            fs.readFileSync(path.join(__dirname, 'assets', 'icon_256x256.png')),
            fs.readFileSync(path.join(__dirname, 'assets', 'icon_48x48.png')),
            fs.readFileSync(path.join(__dirname, 'assets', 'icon_32x32.png')),
            fs.readFileSync(path.join(__dirname, 'assets', 'icon_16x16.png'))
        ];
        
        const icoBuffer = await toIco(pngFiles);
        const outputPath = path.join(__dirname, 'assets', 'icon.ico');
        
        fs.writeFileSync(outputPath, icoBuffer);
        console.log('✓ Created icon.ico successfully!');
        
        // Copy icon.png for Linux
        console.log('✓ icon.png already exists for Linux');
        
        console.log('\nIcon files ready:');
        console.log('  - assets/icon.ico (Windows)');
        console.log('  - assets/icon.png (Linux)');
        console.log('  - assets/icon.icns (macOS - needs manual conversion)');
        console.log('\nFor macOS icon, convert icon.png to ICNS:');
        console.log('  https://cloudconvert.com/png-to-icns');
        
    } catch (error) {
        console.error('Error creating ICO:', error);
        process.exit(1);
    }
}

createIco();
