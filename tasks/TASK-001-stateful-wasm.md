# Task 001: Refactor for Stateful WASM Image Processing

## Context
Currently, every image processing function in `src/lib.rs` is stateless. It accepts raw image bytes (`&[u8]`), decodes them into a `DynamicImage`, processes the image, and then encodes it back to PNG bytes (`Vec<u8>`).

### Problem
This approach causes a significant performance bottleneck. For a chain of operations (e.g., rotate -> grayscale -> blur), the image is decoded and encoded multiple times. PNG encoding, in particular, is computationally expensive and slow in WASM.

## Analysis
- **Current Flow:** `JS (Bytes) -> WASM (Decode -> Process -> Encode) -> JS (Bytes)`
- **Proposed Flow:**
    1. `JS` initializes a WASM object with bytes.
    2. `WASM` decodes once and holds `DynamicImage` in memory.
    3. `JS` calls methods on the object (e.g., `.rotate()`, `.grayscale()`).
    4. `WASM` mutates the in-memory image (no encoding).
    5. `JS` calls `.get_image_bytes()` only when ready to display/download.
    6. `WASM` encodes to PNG once.

## Implementation Plan
1.  Define a struct `ImageProcessor` wrapped in `#[wasm_bindgen]`.
2.  Implement a constructor that takes `&[u8]` and loads the image.
3.  Port existing functions (`grayscale`, `invert`, `blur`, etc.) to be methods of `ImageProcessor` that return `Result<(), JsValue>`.
4.  Add a method `to_png(&self) -> Result<Vec<u8>, JsValue>` for the final export.
5.  Update `www/app.js` to instantiate this class, chain operations (or keep a persistent instance), and explicitly request the image bytes for rendering.

## Acceptance Criteria
- [ ] `src/lib.rs` contains a `#[wasm_bindgen]` struct holding the image state.
- [ ] Image is decoded only once upon loading.
- [ ] Filter operations mutate the state without returning bytes.
- [ ] A specific method exists to retrieve the encoded image bytes.
- [ ] Frontend is updated to use the new class-based API.
