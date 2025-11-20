# Task 005: Verify and Document PNG Transparency Handling

**Priority:** 🟡 **MEDIUM**
**Severity:** MEDIUM - Affects correctness of core feature
**Affected Code:** `src/lib.rs:514-576`, `www/lightning.png`

## Problem Description

You confirmed that `lightning.png` has transparency (semi-transparent regions), but the current alpha blending math (Task 001) doesn't correctly handle it. This task is to verify the fix works end-to-end after Task 001 is completed.

## What Needs Testing

### 1. Overlay Transparency Interaction

When applying an overlay with transparency:

**Before Fix (Incorrect):**
- Transparent pixels in overlay → rendered as opaque (wrong!)
- Semi-transparent lightning becomes solid
- User sees "wrong" overlay appearance

**After Fix (Correct):**
- Transparent pixels in overlay → show base image through them
- Semi-transparent lightning lets base image show through proportionally
- User sees expected composited result

### 2. Opacity Parameter Interaction

The `opacity` slider should modulate the overlay's inherent alpha:

**Scenario 1: Overlay with 50% built-in transparency**
- Slider at 100% opacity → Overlay appears at 50% (its inherent alpha)
- Slider at 50% opacity → Overlay appears at 25% (50% × 50%)
- Slider at 0% opacity → Overlay invisible

**Scenario 2: Overlay with 100% opaque regions**
- Slider at 100% opacity → Solid overlay
- Slider at 50% opacity → Semi-transparent overlay
- Slider at 0% opacity → Invisible

## Testing Checklist

### Visual Inspection Tests

```
Test Case 1: Lightning overlay at 30% (default)
1. Upload any image
2. Click "Transparent Overlay" button
3. Expected: Lightning bolt visible but semi-transparent, base image shows through
4. Check: Transparent areas of bolt should show original image, not white/black

Test Case 2: Adjust opacity to 100%
1. Move slider to 100%
2. Click "Transparent Overlay" button
3. Expected: Lightning much more visible, base image mostly hidden
4. Check: Should be opaque where lightning is opaque, transparent where lightning is transparent

Test Case 3: Adjust opacity to 0%
1. Move slider to 0%
2. Click "Transparent Overlay" button
3. Expected: No visible change (overlay is invisible)
4. Check: Image should be unchanged

Test Case 4: Multiple opacity values
1. Test slider at: 10%, 30%, 50%, 75%, 100%
2. For each value, click button and observe
3. Expected: Smooth transition from invisible to fully opaque
4. Check: No jumps or unexpected behavior

Test Case 5: Cross-browser testing
1. Firefox: Should work
2. Safari: Should work (after fixing caching)
3. Chrome: Should work
4. Edge: Should work
```

### Comparison Tests (Against Reference)

Compare output with:
1. **Photoshop:**
   - Import base image
   - Import lightning as new layer
   - Set layer opacity to 30%
   - Set blend mode to "Normal"
   - Flatten image
   - Compare with our output

2. **GIMP:**
   - Same process as Photoshop
   - File → Export As → PNG
   - Compare with our output

3. **Online tool:**
   - Use canva.com or similar with PNG overlay
   - Compare visual appearance

### Automated Tests (If Applicable)

If you add automated testing later:
```rust
#[test]
fn test_overlay_respects_alpha_channel() {
    // Load overlay with known alpha values
    // Apply with different opacity values
    // Verify output alpha matches expected Porter-Duff calculation
}

#[test]
fn test_overlay_transparent_regions() {
    // Load overlay with transparent pixels
    // Apply overlay
    // Verify transparent pixels show base image through (not white/black)
}
```

## Edge Cases to Verify

1. **Fully transparent overlay** - Should show original image unchanged
2. **Fully opaque overlay** - Should completely cover base image
3. **Mixed transparency** - Some opaque, some transparent areas
4. **Very small opacity** (1-5%) - Should be barely visible
5. **Large images** (2000×2000+) - Should handle without errors
6. **Different image formats** - Test with JPEG and WebP as base images

## Documentation

After testing passes, document:
1. **Behavior documentation** in README.md about overlay transparency
2. **Code comments** explaining alpha compositing implementation
3. **Known limitations** (if any found during testing)

Example doc snippet:
```markdown
### Transparent Overlay Filter

The transparent overlay filter composites the lightning bolt image on top of your image using the Porter-Duff "over" operator, which correctly handles semi-transparent pixels.

**How opacity works:**
- Opacity slider controls how much the overlay affects the image
- 0% opacity = overlay is invisible
- 30% opacity (default) = subtle overlay effect
- 100% opacity = maximum overlay effect

**Transparency in overlay:**
The lightning PNG has semi-transparent regions. These allow the base image to show through, creating a natural blending effect. The opacity slider modulates this transparency.
```

## Acceptance Criteria

- [ ] Visual inspection tests pass (all 5 test cases)
- [ ] Output matches Photoshop/GIMP reference
- [ ] All edge cases behave correctly
- [ ] No visual artifacts or unexpected colors
- [ ] Cross-browser testing passes
- [ ] Documentation updated
- [ ] Code comments explain the alpha compositing approach

## Dependencies

- **Requires:** Task 001 (Fix Alpha Compositing Math) to be completed first

## Estimated Effort

**2 hours** - Mostly manual testing and visual comparison, plus documentation updates.

## Notes

- Take screenshots of test cases for documentation
- If discrepancies found with Photoshop, investigate whether it's our math or tool settings
- Document any visual differences and why they exist (if acceptable)
