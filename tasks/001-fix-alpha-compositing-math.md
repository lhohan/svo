# Task 001: Fix Alpha Compositing Math in overlay_transparent()

**Priority:** 🔴 **CRITICAL**
**Severity:** HIGH - Causes incorrect visual output with transparent PNGs
**Affected Code:** `src/lib.rs:561-568`

## Problem Description

The `overlay_transparent()` function uses simple linear interpolation (lerp) for blending colors, which is mathematically incorrect for alpha compositing. This causes two issues:

1. **Ignores overlay's inherent alpha channel** - The overlay PNG's built-in transparency is completely ignored. Only the `opacity` parameter is considered.
2. **Produces visually incorrect results** - When overlaying a semi-transparent PNG (like `lightning.png`), transparent areas will render as opaque.

### Current Implementation (WRONG)

```rust
// Lines 561-568
let blended_r = (or * opacity + ur * (1.0 - opacity)).min(255.0) as u8;
let blended_g = (og * opacity + ug * (1.0 - opacity)).min(255.0) as u8;
let blended_b = (ob * opacity + ub * (1.0 - opacity)).min(255.0) as u8;
let blended_a = ((oa * opacity) + (ua * (1.0 - opacity))).min(255.0) as u8;
```

This formula only works correctly when both images are fully opaque (alpha = 255).

### Expected Behavior

Should use the **Porter-Duff "over" operator**, which is the industry-standard algorithm for compositing images with transparency:

```
alpha_out = alpha_overlay + alpha_base × (1 - alpha_overlay)
color_out = (color_overlay × alpha_overlay + color_base × alpha_base × (1 - alpha_overlay)) / alpha_out
```

## Impact

- **Visual artifacts** when using transparent PNG overlays
- **Incorrect transparency handling** in the final output
- **User confusion** when overlay doesn't look as expected

## Acceptance Criteria

1. Overlay's built-in alpha channel must be respected
2. The `opacity` parameter should modulate the overlay's alpha (e.g., 50% opacity makes a semi-transparent overlay even more transparent)
3. Transparent areas in the overlay should remain transparent (or show the base image through them)
4. Visual output should match what photo editing software (Photoshop, GIMP) would produce

## Technical Solution

Implement proper Porter-Duff compositing:

```rust
// Normalize to [0.0, 1.0] range
let or_norm = or / 255.0;
let og_norm = og / 255.0;
let ob_norm = ob / 255.0;
let oa_norm = (oa / 255.0) * opacity; // Combine overlay's alpha with opacity param

let ur_norm = ur / 255.0;
let ug_norm = ug / 255.0;
let ub_norm = ub / 255.0;
let ua_norm = ua / 255.0;

// Porter-Duff "over" operator
let alpha_out = oa_norm + ua_norm * (1.0 - oa_norm);

let (r_out, g_out, b_out) = if alpha_out > 0.0 {
    let r = (or_norm * oa_norm + ur_norm * ua_norm * (1.0 - oa_norm)) / alpha_out;
    let g = (og_norm * oa_norm + ug_norm * ua_norm * (1.0 - oa_norm)) / alpha_out;
    let b = (ob_norm * oa_norm + ub_norm * ua_norm * (1.0 - oa_norm)) / alpha_out;
    (r, g, b)
} else {
    (0.0, 0.0, 0.0) // Fully transparent pixel
};

let blended_r = (r_out * 255.0).min(255.0).max(0.0) as u8;
let blended_g = (g_out * 255.0).min(255.0).max(0.0) as u8;
let blended_b = (b_out * 255.0).min(255.0).max(0.0) as u8;
let blended_a = (alpha_out * 255.0).min(255.0).max(0.0) as u8;
```

## Testing

1. Use a PNG overlay with transparent regions (like `lightning.png`)
2. Apply overlay at various opacity levels (0%, 30%, 50%, 100%)
3. Verify transparent areas show the base image through
4. Compare output with Photoshop/GIMP using "Normal" blend mode

## References

- [Porter-Duff Compositing Operators (Wikipedia)](https://en.wikipedia.org/wiki/Alpha_compositing)
- [W3C Compositing and Blending Specification](https://www.w3.org/TR/compositing-1/)

## Estimated Effort

**1-2 hours** - Straightforward math fix, but needs careful testing with various overlay images.
