# Multilingual Support (English/Dutch) - Implementation Plan

## Overview
Add support for English and Dutch (Netherlands) language variants to the image processing web application. Automatic browser language detection with manual override capability.

---

## 1. Browser Language Detection

### How it works:
- `navigator.language` returns the browser's preferred language (e.g., "en-US", "nl-NL", "nl")
- `navigator.languages` returns an array of preferences in priority order
- **Best practice:** Use detection as a **suggestion**, not forced switching
- Fallback to English if Dutch not detected

### Detection logic:
```javascript
function getPreferredLanguage() {
  const langs = navigator.languages || [navigator.language];
  // Check if any preferred language starts with 'nl' (Dutch)
  if (langs.some(lang => lang.startsWith('nl'))) {
    return 'nl';
  }
  return 'en'; // Default to English
}
```

---

## 2. Implementation Approach: Lightweight JSON-based Solution

### Why this approach:
- Application uses vanilla JS with no framework dependency
- Lightweight custom solution is ideal for this use case
- Minimal bundle size impact
- Full control over translations

### Directory structure:
```
www/
├── app.js
├── i18n.js              (NEW - translation handler)
├── translations/
│   ├── en.json          (NEW - English strings)
│   └── nl.json          (NEW - Dutch strings)
├── index.html           (MODIFY - add data-i18n attributes)
└── style.css            (MODIFY - add language selector styling)
```

---

## 3. Translation Scope

### From HTML (~20+ strings):
- Header: "Image Processor", subtitle
- Upload area: "Choose an image", "or drag and drop it here", "Select File"
- Filter groups: "Image Tools", "Horizontal", "Vertical", "Diagonal"
- Buttons: "Select Square Area", "Apply Crop", "Cancel", "Split ↑/↓/←/→", "Split ↘/↙"
- Actions: "Reset to Original", "Download Processed Image"
- Image labels: "Original Image", "Processed Image"
- Footer: "Built with...", "Supported formats..."

### From JavaScript (~15+ error/status messages):
- "Please select a valid image file..."
- "Failed to read the file"
- "Processing image..."
- "No image loaded or WASM module not initialized"
- "Failed to load WebAssembly module..."
- "Processing failed: ..."
- "Crop failed: ..."
- And others

### Dynamic content:
- Image dimensions/size display (e.g., "1920 × 1080 px • 245.32 KB")
- File type error messages

---

## 4. Implementation Steps

### A. Create translation files (en.json & nl.json)
- Map each string key to English and Dutch versions
- Include all UI text and error messages
- Maintain consistent key naming convention

### B. Create i18n.js module
- Load appropriate translation JSON based on language
- Provide `t(key, defaultValue)` function for string lookup
- Handle dynamic text updates after language switch
- Manage localStorage for language preference persistence

### C. Update index.html
- Add `data-i18n="key"` attributes to all translatable elements
- Add language selector dropdown/buttons in header
- Initialize with detected language

### D. Update app.js
- Import and initialize i18n module
- Replace hardcoded strings with `t('key')` calls
- Update error/status messages dynamically
- Add language change event listener to re-render UI elements
- Handle language persistence across sessions

### E. Update style.css
- Add styles for language selector button/dropdown
- Ensure responsive design for language switcher
- Maintain visual consistency with existing design

---

## 5. User Experience Flow

**On first load:**
1. Detect browser language preference via `navigator.language`
2. If Dutch detected → load Dutch UI
3. If not Dutch → load English UI (fallback)
4. Display optional language selector in header

**Language switching:**
1. User clicks language selector ("EN" / "NL" or dropdown)
2. All UI text updates immediately without page reload
3. Preference saved to localStorage
4. On next visit, saved preference is used

---

## 6. Key Decisions Pending

### 1. Language Selector UI Style:
- [ ] **Option A:** Compact dropdown menu ("Language: EN ▼")
- [ ] **Option B:** Side-by-side prominent buttons ("EN" / "NL")
- [ ] **Decision needed from user**

### 2. Persistence:
- [ ] Use localStorage to remember user's language choice across sessions?
- [ ] **Recommended:** Yes (better UX for returning users)

### 3. Translation Quality:
- [ ] User will provide professional Dutch translations, OR
- [ ] Need to use AI-generated translations?

### 4. WASM Error Messages:
- [ ] Translate error messages from Rust/WASM layer?
- [ ] **Current status:** Few error messages; can be added later if needed

---

## 7. What Won't Change
- ✅ No changes to `src/lib.rs` (Rust code)
- ✅ No changes to build process (`wasm-pack`)
- ✅ No new dependencies required
- ✅ 100% client-side, no server calls needed
- ✅ No WASM recompilation needed

---

## 8. Implementation Scope Summary

| Aspect | Details |
|--------|---------|
| **Files to create** | 3 (i18n.js + en.json + nl.json) |
| **Files to modify** | 3 (index.html + app.js + style.css) |
| **Complexity** | Low-Medium |
| **Estimated effort** | Straightforward string mapping + language detection |
| **Performance impact** | Negligible |
| **Bundle size impact** | ~5-10 KB (translation JSON files) |
| **User benefit** | Full Dutch support for NL users; English fallback |

---

## 9. Technical Implementation Details

### i18n.js responsibilities:
- Load translation JSON file for current language
- Provide `t(key, defaultValue)` function
- Handle missing translation keys gracefully
- Manage language state
- Persist language preference to localStorage
- Provide `changeLanguage(lang)` function
- Trigger UI updates on language change

### Translation JSON structure:
```json
{
  "header.title": "Image Processor",
  "header.subtitle": "Client-side image processing powered by Rust & WebAssembly",
  "upload.choose": "Choose an image",
  "upload.dragdrop": "or drag and drop it here",
  "upload.selectBtn": "Select File",
  "filters.imageTools": "Image Tools",
  "filters.horizontal": "Horizontal",
  ...
}
```

### DOM attribute approach:
```html
<h1 data-i18n="header.title">Image Processor</h1>
<p class="subtitle" data-i18n="header.subtitle">Client-side image processing...</p>
<h2 data-i18n="upload.choose">Choose an image</h2>
```

---

## 10. Future Enhancements
- Add more languages (French, German, etc.)
- Extract translations to external management system (Crowdin, etc.)
- Add RTL language support if expanding to Arabic/Hebrew
- Implement language-specific number/date formatting
- Add language switcher tooltip or help text

---

## Status
- **Created:** 2025-11-18
- **Status:** Pending approval and decision on UI style + translation approach
- **Next steps:** Await user feedback on pending decisions, then proceed with implementation
