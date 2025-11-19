# Task 002: Consolidate Combine Functions

## Context
The `src/lib.rs` file contains multiple functions for combining images:
- `combine_top_bottom`
- `combine_left_right`
- `combine_diagonal_tl_br`
- `combine_diagonal_tr_bl`
- `combine_filter_top`
- ... and others.

### Problem
These functions share substantial boilerplate code:
1.  Loading the user image.
2.  Loading the overlay image.
3.  Resizing the overlay to match the user image.
4.  Creating an output buffer.
5.  Iterating over pixels.

This duplication violates the DRY (Don't Repeat Yourself) principle, making the code harder to maintain and increasing the binary size.

## Analysis
The only difference between these functions is the **pixel selection logic** (i.e., "for pixel (x,y), do I pick the source pixel or the overlay pixel?").

## Implementation Plan
1.  Create a private helper function (or a generic function) that handles the setup:
    ```rust
    fn combine_images<F>(
        user_data: &[u8],
        overlay_data: &[u8],
        pixel_selector: F
    ) -> Result<Vec<u8>, JsValue>
    where F: Fn(u32, u32, u32, u32) -> bool // (x, y, width, height) -> use_user_pixel
    ```
2.  Refactor existing `combine_*` functions to call this helper with a specific closure.
    *   Example for Left/Right: `|x, y, w, h| x < w / 2`
3.  Consider using `image::imageops::overlay` if applicable, though the custom split logic might require the pixel iteration approach.

## Acceptance Criteria
- [ ] A helper function encapsulates the image loading, resizing, and buffer creation logic.
- [ ] All `combine_*` functions are refactored to use this helper.
- [ ] No functionality is lost (all split modes work as before).
- [ ] Code size is reduced.
