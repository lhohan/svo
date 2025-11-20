# Task 003: Add Real-Time Value Display to All Parametric Filters

**Priority:** 🟢 **LOW**
**Severity:** LOW - UX improvement, not a functional issue
**Affected Code:** `www/index.html`, `www/app.js`, `www/style.css`

## Problem Description

The `opacity` slider in the new overlay filter shows its current value in real-time as the user drags it. However, other parametric filters (Blur, Brightness, Contrast) don't have this feature, creating inconsistent UX.

### Current State

**Overlay filter** (has real-time display):
```html
<label for="opacitySlider">Opacity: <span id="opacityValue">30</span>%</label>
<input type="range" id="opacitySlider" min="0" max="100" value="30" />
```
With JavaScript listener that updates the `<span>` in real-time.

**Other filters** (no real-time display):
- Blur: User adjusts slider but can't see the exact sigma value
- Brightness: User adjusts slider but can't see the exact percentage
- Contrast: User adjusts slider but can't see the exact value

### Impact

- Users can't easily tell what value they've set without applying and seeing the result
- Inconsistent with modern UI patterns (Photoshop, phone photo apps all show live values)
- Accessibility: Screen readers benefit from live text updates

## Implementation Approach

### Step 1: Identify All Parametric Filters

```javascript
// From app.js applyFilter() switch statement:
case "blur":                      // Takes sigma parameter
case "brighten":                  // Takes brightness value
case "adjust_contrast":           // Takes contrast value
case "overlay_transparent":       // Takes opacity parameter (already done)
```

### Step 2: Update HTML for Each Filter

For Blur (example):
```html
<div class="slider-container">
    <label for="blurSlider">
        Blur: <span id="blurValue">5</span> (sigma)
    </label>
    <input
        type="range"
        id="blurSlider"
        min="0"
        max="20"
        value="5"
        step="0.5"
        class="slider"
        aria-label="Adjust blur intensity from 0 to 20"
    />
</div>
```

For Brightness (example):
```html
<div class="slider-container">
    <label for="brightnessSlider">
        Brightness: <span id="brightnessValue">0</span> (−100 to +100)
    </label>
    <input
        type="range"
        id="brightnessSlider"
        min="-100"
        max="100"
        value="0"
        class="slider"
        aria-label="Adjust brightness from -100 to 100"
    />
</div>
```

For Contrast (example):
```html
<div class="slider-container">
    <label for="contrastSlider">
        Contrast: <span id="contrastValue">0</span>
    </label>
    <input
        type="range"
        id="contrastSlider"
        min="-1"
        max="1"
        value="0"
        step="0.1"
        class="slider"
        aria-label="Adjust contrast from -1 to 1"
    />
</div>
```

### Step 3: Add JavaScript Event Listeners

```javascript
// Blur slider
const blurSlider = document.getElementById("blurSlider");
const blurValue = document.getElementById("blurValue");
if (blurSlider && blurValue) {
    blurSlider.addEventListener("input", function () {
        blurValue.textContent = parseFloat(this.value).toFixed(1);
    });
}

// Brightness slider
const brightnessSlider = document.getElementById("brightnessSlider");
const brightnessValue = document.getElementById("brightnessValue");
if (brightnessSlider && brightnessValue) {
    brightnessSlider.addEventListener("input", function () {
        brightnessValue.textContent = this.value;
    });
}

// Contrast slider
const contrastSlider = document.getElementById("contrastSlider");
const contrastValue = document.getElementById("contrastValue");
if (contrastSlider && contrastValue) {
    contrastSlider.addEventListener("input", function () {
        contrastValue.textContent = parseFloat(this.value).toFixed(2);
    });
}

// Opacity slider (already exists)
const opacitySlider = document.getElementById("opacitySlider");
const opacityValue = document.getElementById("opacityValue");
if (opacitySlider && opacityValue) {
    opacitySlider.addEventListener("input", function () {
        opacityValue.textContent = this.value;
    });
}
```

## Note on Current Implementation

Based on the HTML provided, these sliders may not currently exist in the visible UI. The review mentions them but they're not in the current `index.html`. This task assumes:

1. These sliders are added in the future
2. OR if they already exist somewhere, we apply the same pattern

If they don't exist yet, this task can be deferred until you add slider controls for those filters.

## Acceptance Criteria

- [ ] All parametric filters have real-time value displays
- [ ] Value format matches the parameter type:
  - Blur: One decimal place (e.g., "5.0")
  - Brightness: Integer (e.g., "25")
  - Contrast: Two decimal places (e.g., "0.50")
  - Opacity: Integer percentage (e.g., "30")
- [ ] Screen reader announces live updates
- [ ] Consistent styling with opacity slider

## Estimated Effort

**1 hour** - Straightforward feature, mostly copy-paste of existing pattern.

## References

- Existing implementation: `www/app.js` lines 722-729 (opacity slider)
- UX pattern: Standard in all professional photo editing software
