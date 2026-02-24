# PowerShell script to create icons from image.jpg
# This creates ICO, PNG files needed for the app

Write-Host "Creating app icons from image.jpg..." -ForegroundColor Green

# Load System.Drawing assembly
Add-Type -AssemblyName System.Drawing

# Load the source image
$sourceImage = [System.Drawing.Image]::FromFile("$PSScriptRoot\image.jpg")

# Create assets directory if it doesn't exist
$assetsDir = "$PSScriptRoot\assets"
if (-not (Test-Path $assetsDir)) {
    New-Item -ItemType Directory -Path $assetsDir | Out-Null
}

# Function to resize image
function Resize-Image {
    param(
        [System.Drawing.Image]$Image,
        [int]$Width,
        [int]$Height
    )
    
    $bitmap = New-Object System.Drawing.Bitmap($Width, $Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($Image, 0, 0, $Width, $Height)
    $graphics.Dispose()
    
    return $bitmap
}

# Create PNG icons for different sizes
Write-Host "Creating PNG icons..." -ForegroundColor Cyan
$sizes = @(16, 24, 32, 48, 64, 128, 256, 512, 1024)

foreach ($size in $sizes) {
    $resized = Resize-Image -Image $sourceImage -Width $size -Height $size
    $outputPath = "$assetsDir\icon_${size}x${size}.png"
    $resized.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $resized.Dispose()
    Write-Host "  Created: icon_${size}x${size}.png" -ForegroundColor Gray
}

# Create main icon.png (256x256 for Linux)
$icon256 = Resize-Image -Image $sourceImage -Width 256 -Height 256
$icon256.Save("$assetsDir\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$icon256.Dispose()
Write-Host "  Created: icon.png (256x256)" -ForegroundColor Gray

# Create ICO file for Windows (contains multiple sizes)
Write-Host "`nCreating Windows ICO file..." -ForegroundColor Cyan

# For ICO, we need to use a different approach
# Create individual size PNGs and combine them
$icoSizes = @(16, 32, 48, 256)
$iconPath = "$assetsDir\icon.ico"

# Note: Creating proper ICO files requires external tools or complex code
# For now, we'll create a 256x256 PNG and rename it
# Electron-builder can handle PNG as ICO on Windows
$icon256_2 = Resize-Image -Image $sourceImage -Width 256 -Height 256
$icon256_2.Save($iconPath.Replace('.ico', '_temp.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$icon256_2.Dispose()

Write-Host "  Note: For proper ICO file, use online converter or ImageMagick" -ForegroundColor Yellow
Write-Host "  Temporary PNG created. Electron-builder will handle it." -ForegroundColor Yellow

# Cleanup
$sourceImage.Dispose()

Write-Host "`nIcon creation complete!" -ForegroundColor Green
Write-Host "Files created in: $assetsDir" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Convert icon_256x256.png to icon.ico using:" -ForegroundColor White
Write-Host "   - Online: https://convertio.co/png-ico/" -ForegroundColor Gray
Write-Host "   - Or: https://icoconvert.com/" -ForegroundColor Gray
Write-Host "2. For macOS, convert to ICNS using:" -ForegroundColor White
Write-Host "   - Online: https://cloudconvert.com/png-to-icns" -ForegroundColor Gray
Write-Host "3. Or use ImageMagick: magick convert icon.png icon.ico" -ForegroundColor Gray
