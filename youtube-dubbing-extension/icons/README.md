# YouTube AI Dubbing Extension - Icon Note

The SVG files have been created as templates. To use them in Chrome extension, you need to convert them to PNG format:

## Converting SVG to PNG:

### Method 1: Online Converter
1. Visit https://cloudconvert.com/svg-to-png
2. Upload icon16.svg, icon48.svg, icon128.svg
3. Convert each to PNG with same dimensions
4. Replace the placeholder .png files

### Method 2: Using Inkscape (if installed)
```bash
inkscape icon16.svg --export-type=png --export-filename=icon16.png
inkscape icon48.svg --export-type=png --export-filename=icon48.png  
inkscape icon128.svg --export-type=png --export-filename=icon128.png
```

### Method 3: Using ImageMagick
```bash
convert icon16.svg icon16.png
convert icon48.svg icon48.png
convert icon128.svg icon128.png
```

## Icon Design:
- Globe symbol representing translation
- Sound waves representing audio/dubbing
- Gradient background (blue to purple)
- YouTube play button hint in 128px version
- Clean, modern design following Chrome extension guidelines

For now, placeholder PNG files will be created so the extension can load properly.