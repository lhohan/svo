# Claude.md - AI Assistant Guide

This file contains important context and instructions for AI assistants working with this codebase.

## Project Overview

This is a **client-side image processing web application** built with Rust and WebAssembly. All image processing happens in the browser - no server-side processing required.

**Tech Stack:**
- Rust (compiled to WebAssembly)
- wasm-bindgen (JS/WASM interop)
- image crate (image processing)
- Vanilla JavaScript (ES6 modules)
- HTML5/CSS3

## Project Structure

```
/
├── src/
│   └── lib.rs              # Rust/WASM image processing functions
├── www/
│   ├── index.html          # Main UI
│   ├── style.css           # Styling
│   └── app.js              # JS integration with WASM
├── pkg/                    # Generated WASM output (gitignored)
│   ├── *.wasm              # Compiled WebAssembly binary
│   └── *.js                # JS bindings
├── Cargo.toml              # Rust configuration
└── README.md               # User-facing documentation
```

## Key Implementation Details

### Rust/WASM (src/lib.rs)

**Important Rules:**
1. **No `.unwrap()` calls** - All functions return `Result<Vec<u8>, JsValue>`
2. **Error handling** - Use `.map_err()` to convert errors to `JsValue`
3. **Memory efficiency** - Work with byte slices, avoid unnecessary copies
4. **wasm-bindgen** - All exported functions need `#[wasm_bindgen]` attribute

**Pattern for new image processing functions:**
```rust
#[wasm_bindgen]
pub fn my_filter(data: &[u8]) -> Result<Vec<u8>, JsValue> {
    log("Processing: My Filter");
    let img = bytes_to_image(data)?;
    // ... processing logic
    image_to_bytes(&img, ImageFormat::Png)
}
```

### Frontend (www/app.js)

**WASM Integration Pattern:**
1. Import WASM module as ES6 module
2. Initialize with `await init()`
3. Call functions with `Uint8Array` data
4. Handle errors with try/catch
5. Display results on canvas

**Adding a new filter to UI:**
1. Add button in `index.html` with `data-filter="filter_name"`
2. Add case in `applyFilter()` switch statement
3. Handle parameters if needed (like sliders)

### Why Web Server is Required

**Critical:** This app MUST be served via HTTP/HTTPS, not `file://`

**Reason:** ES6 module imports (`import ... from '../pkg/...'`) are blocked by CORS on `file://` URLs

**Options:**
- `python3 -m http.server 8080` (recommended)
- `npx http-server`
- Any local web server

## Build Process

### Standard Build
```bash
wasm-pack build --target web
```

### What it does:
1. Compiles Rust to WebAssembly
2. Generates JS bindings via wasm-bindgen
3. Creates `pkg/` directory with:
   - `*.wasm` - WebAssembly binary
   - `*.js` - JavaScript bindings
   - `*.d.ts` - TypeScript definitions

### Build Configuration Notes

**wasm-opt disabled:**
```toml
[package.metadata.wasm-pack.profile.release]
wasm-opt = false
```
This is set because the wasm-opt tool download failed. The WASM binary is still optimized via Rust's release profile.

**Rust optimizations:**
```toml
[profile.release]
opt-level = "s"  # Optimize for size
lto = true       # Link-time optimization
```

## Common Tasks

### Adding a New Image Filter

1. **Add Rust function** in `src/lib.rs`:
```rust
#[wasm_bindgen]
pub fn my_new_filter(data: &[u8]) -> Result<Vec<u8>, JsValue> {
    log("Processing: My New Filter");
    let img = bytes_to_image(data)?;
    // Your processing logic here
    image_to_bytes(&img, ImageFormat::Png)
}
```

2. **Add UI control** in `www/index.html`:
```html
<button class="btn btn-filter" data-filter="my_new_filter">
    My New Filter
</button>
```

3. **Add handler** in `www/app.js`:
```javascript
case 'my_new_filter':
    result = wasmModule.my_new_filter(currentImageData);
    break;
```

4. **Rebuild:**
```bash
wasm-pack build --target web
```

5. **Test:** Refresh browser (hard refresh: Ctrl+Shift+R)

### Adding a Filter with Parameters

See examples in code:
- `blur(data, sigma)` - takes float parameter
- `brighten(data, value)` - takes int parameter
- `adjust_contrast(data, contrast)` - takes float parameter

Pattern includes:
- Slider in HTML
- Value display
- Apply button
- Parameter validation in Rust

### Debugging

**Rust/WASM errors:**
- Check browser console
- `console_error_panic_hook` provides stack traces
- Use `log()` function to debug: `log(&format!("Debug: {}", value));`

**JS errors:**
- Check browser console
- Use browser DevTools
- Check Network tab for WASM loading issues

**Build errors:**
- Run `cargo check` to check Rust syntax
- Run `cargo clippy` for lints
- Check `Cargo.toml` dependencies

## Image Processing Pipeline

```
User uploads file
    ↓
FileReader → ArrayBuffer → Uint8Array
    ↓
JavaScript passes to WASM function
    ↓
Rust decodes image bytes (image::load_from_memory)
    ↓
Process with image crate functions
    ↓
Encode to PNG (DynamicImage::write_to)
    ↓
Return Vec<u8> to JavaScript
    ↓
JavaScript creates Blob → ObjectURL
    ↓
Load as Image → Draw on Canvas
```

## Supported Image Formats

**Input:** PNG, JPEG, WebP (handled by image crate)
**Output:** Always PNG (consistent, lossless)

To add format support:
1. Add feature to `image` dependency in `Cargo.toml`
2. Image crate handles decoding automatically
3. Can change output format in `image_to_bytes()` if needed

## Performance Considerations

**Large images:**
- Images > 4000px may be slow to process
- Blur with high sigma is computationally expensive
- Consider adding size warnings in UI

**Optimization opportunities:**
- Image downsampling before processing
- Worker threads for non-blocking processing
- Streaming processing for very large images

## Security Notes

**Client-side processing benefits:**
- No image data sent to servers
- Complete privacy
- No storage/bandwidth costs

**Validation:**
- File type checked in JS
- Image decoding validates format in Rust
- Errors handled gracefully

## Dependencies

**Rust crates (Cargo.toml):**
- `wasm-bindgen = "0.2"` - JS/WASM interop
- `image = "0.25"` - Image processing
- `console_error_panic_hook = "0.1"` - Better errors
- `js-sys = "0.3"` - JS standard library bindings
- `web-sys = "0.3"` - Web API bindings

**No JavaScript dependencies** - Pure vanilla JS

## Testing Checklist

When making changes, test:
- [ ] Build succeeds (`wasm-pack build --target web`)
- [ ] No Rust warnings/errors
- [ ] WASM loads in browser (check console)
- [ ] File upload works
- [ ] All filters work
- [ ] Sliders update correctly
- [ ] Download works
- [ ] Reset works
- [ ] Error handling works (try invalid file)
- [ ] Responsive design (test mobile view)

## Git Workflow

**Branch:** `claude/code-documentation-review-017Vb3gAk1vf5uzBTawXyu5o`

**Files to commit:**
- Source files: `src/`, `www/`, `Cargo.toml`, `README.md`
- `Cargo.lock` (included for reproducible builds)

**Files NOT to commit (in .gitignore):**
- `pkg/` - Generated WASM output
- `target/` - Rust build artifacts
- IDE files

## Common Issues & Solutions

**Issue:** WASM module fails to load
- **Solution:** Ensure using web server, not `file://`

**Issue:** `wasm-pack build` fails
- **Solution:** Check Rust version, run `rustup update`

**Issue:** Changes not reflected in browser
- **Solution:** Hard refresh (Ctrl+Shift+R) or clear cache

**Issue:** Import errors in browser
- **Solution:** Check that `pkg/` exists and contains `.wasm` file

**Issue:** Image processing is slow
- **Solution:** Normal for large images or heavy filters like blur

## Future Enhancement Ideas

- Add more filters (edge detection, sharpen, etc.)
- Implement crop/resize functionality
- Add batch processing
- Support GIF/BMP formats
- Add histogram visualization
- Implement undo/redo stack
- Add image comparison slider
- Export to different formats
- Add image metadata display
- Implement custom filter editor

## Resources

- [Rust WebAssembly Book](https://rustwasm.github.io/docs/book/)
- [wasm-bindgen Guide](https://rustwasm.github.io/wasm-bindgen/)
- [image crate docs](https://docs.rs/image/)
- [WebAssembly MDN](https://developer.mozilla.org/en-US/docs/WebAssembly)

## Notes for AI Assistants

- Always rebuild with `wasm-pack build --target web` after Rust changes
- Never use `.unwrap()` in exported WASM functions
- Test changes in browser, not just compilation
- Keep frontend vanilla JS (no frameworks)
- Maintain responsive design
- Follow existing code patterns
- Update README.md for user-facing changes
- Update this file for implementation changes
