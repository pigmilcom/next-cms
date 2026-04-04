# PWA Icon Generation Instructions

## Using the logo to generate PWA icons

You need to generate PWA icons from `/public/images/logo.webp` or create a square version of your logo.

### Quick Setup (Recommended):
1. Use an online PWA icon generator like:
   - https://www.pwabuilder.com/imageGenerator
   - https://favicon.io/favicon-converter/
   
2. Upload your logo (preferably a square version)

3. Download the generated icons and place them in `/public/icons/`

### Manual Setup:
Create the following icon sizes and save them as PNG in `/public/icons/`:
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

### Using ImageMagick (if installed):
Run this in PowerShell from the project root:

```powershell
# Create icons directory
New-Item -ItemType Directory -Force -Path "public\icons"

# Convert logo to different sizes
$sizes = @(72, 96, 128, 144, 152, 192, 384, 512)
foreach ($size in $sizes) {
    magick convert public\images\logo.webp -resize "${size}x${size}" "public\icons\icon-${size}x${size}.png"
}
```

### Temporary Solution:
If you don't have icons yet, you can temporarily copy your logo:
```powershell
Copy-Item "public\images\logo.png" "public\icons\icon-192x192.png"
Copy-Item "public\images\logo.png" "public\icons\icon-512x512.png"
```

The PWA will still work, but icons won't be optimized for all devices.
