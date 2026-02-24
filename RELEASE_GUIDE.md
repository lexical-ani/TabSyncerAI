# Release Guide for TabSyncerAI

## Quick Summary

✅ **You DON'T need to pay for code signing!**

Most open-source projects use FREE alternatives:
- **Winget** (Microsoft signs for free)
- **Microsoft Store** ($19 one-time, then free signing)
- **Build reputation** (warnings disappear after ~1000 downloads)

## Creating a Release

### 1. Build the Application

```bash
npm run build
```

This creates:
- `dist/TabSyncerAI Setup 1.0.0.exe` - Installer (NSIS)
- `dist/TabSyncerAI 1.0.0.exe` - Portable version
- `dist/SHA256SUMS.txt` - Checksums for verification

### 2. Create GitHub Release

1. Go to your GitHub repository
2. Click "Releases" → "Create a new release"
3. Tag: `v1.0.0`
4. Title: `TabSyncerAI v1.0.0 - Initial Release`
5. Description:

```markdown
## 🎉 TabSyncerAI v1.0.0 - Initial Release

Multi-panel AI browser workspace - broadcast prompts to multiple AI services simultaneously!

### ✨ Features
- Support for 8 AI platforms (ChatGPT, Gemini, Claude, Copilot, Grok, DeepSeek, Perplexity, Mistral)
- File upload support (images, documents)
- Persistent login sessions
- Drag & drop panel reordering
- Cross-platform (Windows, macOS, Linux)

### 📥 Installation

**Windows:**
- **Installer**: Download `TabSyncerAI-Setup-1.0.0.exe` (recommended)
- **Portable**: Download `TabSyncerAI-1.0.0.exe` (no installation needed)

**Note**: You may see a Windows SmartScreen warning. This is normal for unsigned apps. Click "More info" → "Run anyway". See [Installation Guide](https://github.com/yourusername/TabSyncerAI/blob/main/INSTALLATION_GUIDE.md) for details.

**Alternative (No warnings):**
```bash
winget install TabSyncerAI
```
(Available after Winget submission is approved)

### 🔐 Verification
Download `SHA256SUMS.txt` and verify file integrity:
```powershell
Get-FileHash "TabSyncerAI Setup 1.0.0.exe" -Algorithm SHA256
```

### 📝 Changelog
See [CHANGELOG.md](https://github.com/yourusername/TabSyncerAI/blob/main/CHANGELOG.md)

### 🐛 Known Issues
None reported yet!

### 🙏 Thanks
Thanks to all contributors and early testers!
```

6. Upload files:
   - `TabSyncerAI Setup 1.0.0.exe`
   - `TabSyncerAI 1.0.0.exe`
   - `SHA256SUMS.txt`

7. Click "Publish release"

### 3. Submit to Winget (FREE - No SmartScreen warnings!)

**This is the BEST free option!**

1. **Fork winget-pkgs:**
```bash
git clone https://github.com/microsoft/winget-pkgs
cd winget-pkgs
```

2. **Create manifest directory:**
```bash
mkdir -p manifests/t/TabSyncerAI/TabSyncerAI/1.0.0
```

3. **Create manifest files:**

`manifests/t/TabSyncerAI/TabSyncerAI/1.0.0/TabSyncerAI.TabSyncerAI.yaml`:
```yaml
PackageIdentifier: TabSyncerAI.TabSyncerAI
PackageVersion: 1.0.0
PackageName: TabSyncerAI
Publisher: TabSyncerAI Contributors
License: MIT
LicenseUrl: https://github.com/yourusername/TabSyncerAI/blob/main/LICENSE
ShortDescription: Multi-panel AI browser workspace
Description: Broadcast prompts to ChatGPT, Gemini, Claude, and more simultaneously
Homepage: https://github.com/yourusername/TabSyncerAI
Tags:
  - ai
  - chatgpt
  - productivity
Installers:
  - Architecture: x64
    InstallerType: nullsoft
    InstallerUrl: https://github.com/yourusername/TabSyncerAI/releases/download/v1.0.0/TabSyncerAI-Setup-1.0.0.exe
    InstallerSha256: 9B6575DE72E70618F31785AA973CD5FEC5CDFD6733FB0C481B503F75F3780A4E
    Scope: user
ManifestType: singleton
ManifestVersion: 1.0.0
```

4. **Submit PR:**
```bash
git checkout -b tabsyncerai-1.0.0
git add manifests/t/TabSyncerAI/
git commit -m "Add TabSyncerAI version 1.0.0"
git push origin tabsyncerai-1.0.0
```

5. **Create PR** on GitHub
6. **Wait for approval** (usually 1-3 days)
7. **Done!** Users can now install without warnings:
```bash
winget install TabSyncerAI
```

### 4. Submit to Chocolatey (Optional)

1. Create account at https://community.chocolatey.org/
2. Create package manifest
3. Submit for moderation

### 5. Announce Release

Post on:
- GitHub Discussions
- Reddit (r/opensource, r/software)
- Twitter/X
- Product Hunt
- Hacker News

## Future Releases

### Version Updates

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Build: `npm run build`
4. Create new GitHub release
5. Update Winget manifest (new PR)

### Microsoft Store (Optional - $19)

Once you have users and want zero warnings:

1. Create Microsoft Partner Center account ($19)
2. Package as MSIX
3. Submit for review
4. Microsoft signs automatically
5. No more SmartScreen warnings!

## Tips

1. **Don't pay $400/year for certificates** - Use Winget instead!
2. **Build reputation** - After 1000+ downloads, warnings reduce naturally
3. **Be transparent** - Open source = trustworthy
4. **Provide checksums** - Users can verify integrity
5. **Multiple channels** - GitHub + Winget + Chocolatey

## Summary

✅ Build unsigned (free)
✅ Release on GitHub
✅ Submit to Winget (Microsoft signs for free!)
✅ Build reputation over time
✅ Consider Microsoft Store later ($19)

**Total cost: $0** (or $19 for Microsoft Store)

No need for expensive certificates! 🎉
