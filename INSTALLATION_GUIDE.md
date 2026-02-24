# TabSyncerAI Installation Guide

## Windows Installation (Unsigned Build)

Since TabSyncerAI is free and open-source, we don't use expensive code signing certificates. This means Windows SmartScreen will show a warning. **This is normal and safe** - the app is open source and you can verify the code yourself!

### Step-by-Step Installation

#### Method 1: NSIS Installer (Recommended)

1. **Download** `TabSyncerAI-Setup-1.0.0.exe` from the [Releases](https://github.com/yourusername/TabSyncerAI/releases) page

2. **Run the installer** - You'll see a Windows SmartScreen warning:

   ![SmartScreen Warning](https://via.placeholder.com/500x300?text=Windows+SmartScreen+Warning)

3. **Click "More info"** on the SmartScreen popup

4. **Click "Run anyway"** button that appears

5. **Follow the installation wizard** - TabSyncerAI will be installed to your user directory

6. **Launch TabSyncerAI** from the Start Menu or Desktop shortcut

#### Method 2: Portable Version (No Installation)

1. **Download** `TabSyncerAI-1.0.0-portable.exe` from the Releases page

2. **Right-click** the file and select "Run as administrator" (first time only)

3. **Click "More info"** → **"Run anyway"** on SmartScreen warning

4. **Run directly** - No installation needed, runs from any folder

### Why the Warning?

- **Code signing certificates cost $100-400/year** - We're keeping TabSyncerAI free!
- **Open source = transparent** - You can review all code on GitHub
- **Thousands of open-source apps** show this warning (OBS Studio, Audacity, etc.)
- **Your antivirus will scan it** - Windows Defender checks all downloads

### Is It Safe?

✅ **Yes!** Here's why:
- **Open source** - All code is public on GitHub
- **No telemetry** - We don't collect any data
- **No network requests** - Only connects to AI sites you choose
- **Community verified** - Check GitHub issues and discussions
- **Scan it yourself** - Upload to VirusTotal if you want

### Alternative: Build from Source

If you're still concerned, build it yourself:

```bash
git clone https://github.com/yourusername/TabSyncerAI.git
cd TabSyncerAI
npm install
npm run build
```

The built app will be in the `dist/` folder.

## macOS Installation

1. **Download** `TabSyncerAI-1.0.0.dmg`
2. **Open the DMG** file
3. **Drag TabSyncerAI** to Applications folder
4. **First launch**: Right-click → Open (to bypass Gatekeeper)
5. **Click "Open"** in the dialog

## Linux Installation

### AppImage (Universal)
```bash
chmod +x TabSyncerAI-1.0.0.AppImage
./TabSyncerAI-1.0.0.AppImage
```

### Debian/Ubuntu (.deb)
```bash
sudo dpkg -i tabsyncerai_1.0.0_amd64.deb
```

## Troubleshooting

### Windows: "Windows protected your PC"
- This is SmartScreen, not a virus warning
- Click "More info" → "Run anyway"
- Happens with all unsigned apps

### Windows: Antivirus blocks it
- Add exception in your antivirus
- Or temporarily disable during installation
- Scan with VirusTotal for peace of mind

### macOS: "App is damaged"
- Run: `xattr -cr /Applications/TabSyncerAI.app`
- This removes quarantine flag

### Linux: Permission denied
- Run: `chmod +x TabSyncerAI-1.0.0.AppImage`

## Verification

### Check File Integrity (Optional)

Download the SHA256 checksum file and verify:

**Windows:**
```powershell
Get-FileHash TabSyncerAI-Setup-1.0.0.exe -Algorithm SHA256
```

**macOS/Linux:**
```bash
shasum -a 256 TabSyncerAI-1.0.0.dmg
```

Compare with the checksum in `SHA256SUMS.txt` from the release.

## Need Help?

- 📖 [Documentation](https://github.com/yourusername/TabSyncerAI)
- 🐛 [Report Issues](https://github.com/yourusername/TabSyncerAI/issues)
- 💬 [Discussions](https://github.com/yourusername/TabSyncerAI/discussions)

## Supporting the Project

If you find TabSyncerAI useful:
- ⭐ Star the repo on GitHub
- 🐛 Report bugs and suggest features
- 🔧 Contribute code improvements
- 📢 Share with others

We keep it free and open source for everyone! 🎉
