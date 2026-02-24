# Code Signing Guide for TabSyncerAI

## Why Code Signing?

Code signing ensures users that your application:
- Comes from a verified publisher
- Hasn't been tampered with
- Won't trigger Windows SmartScreen warnings

## Windows Code Signing

### Option 1: Get a Code Signing Certificate (Recommended for Distribution)

1. **Purchase a Certificate** from a trusted CA:
   - DigiCert
   - Sectigo (formerly Comodo)
   - GlobalSign
   - Cost: ~$100-400/year

2. **Export Certificate as PFX**:
   - Export from Windows Certificate Store
   - Include private key
   - Set a strong password

3. **Configure electron-builder**:

Create a file `electron-builder.env` (don't commit this!):
```
CSC_LINK=path/to/your/certificate.pfx
CSC_KEY_PASSWORD=your_certificate_password
```

Or set environment variables:
```bash
# Windows
set CSC_LINK=C:\path\to\cert.pfx
set CSC_KEY_PASSWORD=your_password
npm run build

# Or use PowerShell
$env:CSC_LINK="C:\path\to\cert.pfx"
$env:CSC_KEY_PASSWORD="your_password"
npm run build
```

### Option 2: Self-Signed Certificate (Testing Only)

**Warning**: Self-signed certificates will still trigger SmartScreen warnings!

```powershell
# Create self-signed certificate
$cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=TabSyncerAI" -CertStoreLocation Cert:\CurrentUser\My

# Export to PFX
$password = ConvertTo-SecureString -String "YourPassword123" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath "cert.pfx" -Password $password

# Build with certificate
$env:CSC_LINK="cert.pfx"
$env:CSC_KEY_PASSWORD="YourPassword123"
npm run build
```

### Option 3: Unsigned Build (Development/Testing)

Simply run:
```bash
npm run build
```

The build will work but show "Unknown Publisher" warnings.

## macOS Code Signing

### Requirements:
1. Apple Developer Account ($99/year)
2. Developer ID Application certificate
3. App-specific password for notarization

### Setup:
```bash
# Set environment variables
export APPLE_ID="your@email.com"
export APPLE_ID_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="your_team_id"

# Build and notarize
npm run build
```

## Linux

Linux doesn't require code signing. AppImage and .deb packages work without signatures.

## CI/CD Signing

For GitHub Actions or other CI/CD:

1. Store certificate as base64:
```bash
base64 cert.pfx > cert.txt
```

2. Add to GitHub Secrets:
   - `CSC_LINK_BASE64`: Base64 encoded certificate
   - `CSC_KEY_PASSWORD`: Certificate password

3. In workflow:
```yaml
- name: Decode certificate
  run: |
    echo "${{ secrets.CSC_LINK_BASE64 }}" | base64 --decode > cert.pfx
  
- name: Build
  env:
    CSC_LINK: cert.pfx
    CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
  run: npm run build
```

## Verification

After building, verify the signature:

### Windows:
```powershell
# Check signature
Get-AuthenticodeSignature "dist\TabSyncerAI Setup 1.0.0.exe"
```

### macOS:
```bash
# Check signature
codesign -dv --verbose=4 "dist/TabSyncerAI.app"

# Check notarization
spctl -a -vv "dist/TabSyncerAI.app"
```

## Best Practices

1. **Never commit certificates** - Add to .gitignore
2. **Use environment variables** for passwords
3. **Rotate certificates** before expiration
4. **Test signed builds** before release
5. **Keep certificates secure** - Use hardware tokens if possible

## Troubleshooting

### "Certificate not found"
- Check CSC_LINK path is correct
- Ensure certificate is in PFX format
- Verify password is correct

### "Invalid certificate"
- Certificate must be for code signing
- Check expiration date
- Ensure certificate chain is complete

### SmartScreen still shows warning
- Self-signed certificates don't prevent warnings
- Need reputation build-up (downloads over time)
- Consider EV (Extended Validation) certificate

## Resources

- [electron-builder Code Signing](https://www.electron.build/code-signing)
- [Windows Code Signing](https://docs.microsoft.com/en-us/windows/win32/seccrypto/cryptography-tools)
- [Apple Notarization](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
