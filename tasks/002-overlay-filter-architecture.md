# Task 002: Clarify Overlay Filter Architecture Decision

**Priority:** 🟡 **MEDIUM**
**Severity:** MEDIUM - Architectural inconsistency, but works as intended for current use case
**Affected Code:** `www/app.js:370-384`

## Problem Description

The `overlay_transparent` filter deviates from the established stateless API architecture by using `originalImageData` instead of `imageToFilter`. This makes it inconsistent with all other filters and violates the design principle documented in `docs/decision-log.md`.

### Current Behavior

```javascript
// Line 380 - Uses original, not filtered
result = wasmModule.overlay_transparent(
    originalImageData,  // ← Unique behavior
    overlayImageData,
    opacity,
);
```

### Architectural Violation

The project's decision log states:
> "We chose stateless API architecture because it allows **simple filter composition and chaining** without state management overhead."

However:
- All other 6 filters use `imageToFilter` (the current processed result)
- `overlay_transparent` alone uses `originalImageData` (the unfiltered original)
- This breaks composability: `grayscale() → overlay()` produces different results than `overlay() → grayscale()`

### Impact on Workflows

**Example 1: Crop then Overlay**
- ✅ Works correctly because `originalImageData` is updated when crop is applied
- But works by accident through side effects, not by design

**Example 2: Grayscale then Overlay**
- ❌ Overlay ignores the grayscale and applies to original color image
- Unexpected user experience

**Example 3: Multiple Overlays**
- ✅ Currently non-cumulative (because always applied to original)
- ✅ But makes it impossible to stack overlays with different opacities

## Context

You explicitly stated: *"overlay is NOT cumulative and applied to the selected area (if any)"*

This is achievable two ways:
1. **Current approach** (using `originalImageData`)
   - ✅ Non-cumulative ✓
   - ✅ Works with crops ✓ (by accident)
   - ❌ Violates architecture
   - ❌ Won't compose with color filters

2. **Proper approach** (using `imageToFilter` + documenting the trade-off)
   - ✅ Follows architecture
   - ✅ Composable with all filters
   - ❌ Would be cumulative if clicked repeatedly
   - Solution: Add note "Adjust slider before clicking to change opacity"

## Decision Needed

**Option A: Keep current implementation**
- Document WHY overlay is special in code comments
- Add architectural note to `docs/decision-log.md`
- Accept that overlay won't compose with color filters
- ✅ Pros: Matches user expectation for non-cumulative behavior
- ❌ Cons: Deviates from principles without justification

**Option B: Switch to standard architecture**
- Change line 380 to use `imageToFilter`
- Update UI label: "Adjust opacity slider BEFORE clicking to set the exact transparency level"
- ✅ Pros: Follows established patterns, composable, cleaner design
- ❌ Cons: Requires user to understand slider affects next click, not cumulative changes

**Option C: Implement "reset overlay to original" pattern**
- Keep using `originalImageData`
- Internally document that overlay intentionally resets the image to original before compositing
- This is a valid UX pattern (like Photoshop's "Reset" button)
- ✅ Pros: Explicit, clear user intent
- ❌ Cons: Still architectural deviation, but well-justified

## Recommendation

**Choose Option A (status quo) but document it properly:**

The current behavior aligns with user expectations. Changing it to `imageToFilter` would confuse users who expect the slider value to directly control opacity, not be cumulative. The architectural deviation is acceptable if:

1. Code comment explains the design decision
2. `docs/decision-log.md` records this exception and justifies it
3. Future maintainers understand this is intentional

## Acceptance Criteria

- [ ] Add code comment in `www/app.js` explaining why overlay uses `originalImageData`
- [ ] Update `docs/decision-log.md` with a note about the overlay architecture decision
- [ ] Comment should reference this task for context
- [ ] No functional changes needed (current behavior is correct for stated requirements)

## Implementation

```javascript
// Line 370-384
case "overlay_transparent":
    if (!overlayImageData) {
        throw new Error(
            "Overlay image not loaded. Please ensure lightning.png is available.",
        );
    }

    // NOTE: Overlay intentionally uses originalImageData instead of imageToFilter
    // This ensures the overlay is NOT cumulative - adjusting the slider and re-clicking
    // always produces the same result based on the current slider position.
    // This is a deliberate deviation from the stateless API pattern, justified by UX:
    // Users expect the opacity slider to control the *absolute* opacity level, not be cumulative.
    // See tasks/002-overlay-filter-architecture.md for full discussion.
    const opacitySlider = document.getElementById("opacitySlider");
    const opacityPercent = parseFloat(opacitySlider.value);
    const opacity = opacityPercent / 100.0;
    result = wasmModule.overlay_transparent(
        originalImageData,  // ← Intentionally uses original, not filtered result
        overlayImageData,
        opacity,
    );
    break;
```

## Estimated Effort

**30 minutes** - Just documentation, no code changes needed.
