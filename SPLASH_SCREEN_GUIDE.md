# Splash Screen & App Store Cover Images Guide

## What is a Splash Screen?

The splash screen (also called launch screen) is the first image users see when they open your app. It appears while the app is loading.

## Splash Screen Configuration

### Required File

- **File:** `assets/splash.png`
- **Size:** 1242x2436 pixels (or 2048x2732 for iPad)
- **Format:** PNG
- **Design:** Should contain your logo/branding centered

### Current Configuration

I've added splash screen configuration to your `app.json`:

```json
"splash": {
  "image": "./assets/splash.png",
  "resizeMode": "contain",
  "backgroundColor": "#E6F4FE"
}
```

### How to Create Splash Screen

#### Option 1: Use Online Generator (Easiest)

1. Visit: https://www.appicon.co/ (has splash screen generator)
2. Upload your logo
3. Download splash screen images
4. Save as `assets/splash.png` (1242x2436px)

#### Option 2: Design Your Own

1. Create a 1242x2436px image
2. Use background color: `#E6F4FE` (light blue)
3. Center your logo/branding
4. Keep it simple - it shows for only 1-2 seconds
5. Save as PNG format

#### Option 3: Simple Gradient Splash

You can create a simple gradient splash with your logo:

- Background: Gradient or solid color (`#E6F4FE`)
- Logo: Centered, about 200-300px height
- Text (optional): App name below logo

## App Store Cover Images

### Google Play Store

#### Feature Graphic (Required)

- **Size:** 1024x500 pixels
- **Format:** PNG or JPG
- **Usage:** Shown at the top of your app listing
- **File:** Upload directly in Google Play Console

#### Screenshots (Required)

- **Phone:** 1080x1920 pixels (or 9:16 ratio)
- **Tablet:** 1200x1920 pixels
- **Format:** PNG or JPG
- **Quantity:** At least 2, up to 8 screenshots

### Apple App Store

#### App Preview Video (Optional)

- **Duration:** 15-30 seconds
- **Size:** 1080x1920 pixels (portrait)
- **Format:** MP4 or MOV

#### Screenshots (Required)

- **iPhone 6.7" Display:** 1290x2796 pixels
- **iPhone 6.5" Display:** 1284x2778 pixels
- **iPhone 5.5" Display:** 1242x2208 pixels
- **iPad Pro 12.9":** 2048x2732 pixels
- **Format:** PNG or JPG
- **Quantity:** At least 3 screenshots per device size

#### App Store Feature Graphic

- **Size:** 2048x2048 pixels (square)
- **Format:** PNG
- **Usage:** Used for featured apps

## Quick Setup Checklist

### Splash Screen

- [ ] Create `assets/splash.png` (1242x2436px)
- [ ] Add logo centered on background
- [ ] Use background color `#E6F4FE` or your brand color
- [ ] Configuration already added to `app.json` ✅

### App Store Images (Prepare Before Publishing)

#### Google Play Store

- [ ] Feature graphic: 1024x500px
- [ ] Screenshots: 1080x1920px (at least 2)
- [ ] App icon: 512x512px (already configured ✅)

#### Apple App Store

- [ ] Screenshots for different iPhone sizes
- [ ] iPad screenshots (if supporting tablets)
- [ ] App icon: 1024x1024px (already configured ✅)

## Design Tips

### Splash Screen Best Practices

- ✅ Keep it simple - shows for 1-2 seconds
- ✅ Use your brand colors
- ✅ Center your logo
- ✅ Match your app's theme
- ✅ Avoid too much text
- ✅ Use high-quality images

### App Store Screenshots Best Practices

- ✅ Show key features
- ✅ Use real app screenshots (not mockups)
- ✅ Add text overlays explaining features
- ✅ Show the best parts of your app
- ✅ Use consistent style across all screenshots
- ✅ Include your logo/branding

## Tools & Resources

### Online Generators

- **Splash Screen:** https://www.appicon.co/
- **Screenshots:** Use your actual app or design tools
- **Feature Graphics:** Canva, Figma, or Photoshop

### Design Tools

- **Canva:** https://www.canva.com/ (free templates)
- **Figma:** https://www.figma.com/ (free design tool)
- **Photoshop/GIMP:** Professional image editing

## File Structure

After setup:

```
assets/
  ├── icon.png (1024x1024 PNG) ← App icon ✅
  ├── splash.png (1242x2436 PNG) ← Splash screen (needs creation)
  └── ... (other assets)
```

## Testing Splash Screen

After adding `splash.png`:

1. **Clear cache:**

   ```bash
   npx expo start -c
   ```

2. **Test on device:**

   ```bash
   npm run android
   # or
   npm run ios
   ```

3. **Close and reopen app** to see splash screen

## Current Status

- ✅ Splash screen configuration added to `app.json`
- ⏳ Need to create `assets/splash.png` file
- ✅ App icon configuration ready
- ⏳ App Store images can be prepared later (before publishing)

## Next Steps

1. **Create splash screen:**

   - Design or generate `assets/splash.png` (1242x2436px)
   - Place in `assets/` folder

2. **Test splash screen:**

   - Run `npx expo start -c`
   - Close and reopen app

3. **Prepare App Store images** (when ready to publish):
   - Create screenshots
   - Design feature graphics
   - Upload to respective app stores
