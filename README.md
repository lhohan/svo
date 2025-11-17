# Image Processor - Rust WebAssembly

A modern, high-performance client-side image processing web application built with Rust and WebAssembly. All image processing happens entirely in your browser - no server uploads required!

This project was developed as a tryout of Claude Code Web. The result you see here is the result of a single well specified prompt.
## Features

### Image Filters
- **Grayscale** - Convert images to black and white
- **Invert** - Invert all colors
- **Sepia Tone** - Apply vintage sepia effect

### Adjustments
- **Blur** - Gaussian blur with adjustable intensity (0-10)
- **Brightness** - Adjust image brightness (-100 to +100)
- **Contrast** - Modify image contrast (-100 to +100)

### Transformations
- **Rotate** - 90°, 180°, or 270° rotation
- **Flip** - Horizontal or vertical flip

### Additional Features
- Drag-and-drop file upload
- Real-time image preview
- Download processed images
- Support for PNG, JPEG, and WebP formats
- Fully responsive design
- No data leaves your browser

## Architecture

This application demonstrates the power of WebAssembly for compute-intensive tasks in the browser:

```
┌─────────────────────────────────────────────────────────┐
│                     Web Browser                          │
│  ┌────────────────┐              ┌──────────────────┐   │
│  │   HTML/CSS/JS  │ ←────────→   │  Rust (WASM)     │   │
│  │   Frontend     │   wasm-      │  Image Processing│   │
│  │                │   bindgen    │                  │   │
│  └────────────────┘              └──────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Frontend (JavaScript):**
- Handles UI interactions
- Manages file uploads
- Displays images on canvas
- Calls WASM functions

**Backend (Rust → WebAssembly):**
- Image decoding (PNG, JPEG, WebP)
- Image processing algorithms
- Image encoding
- Memory-efficient operations

## Prerequisites

Before you begin, ensure you have the following installed:

1. **Rust** (1.70 or later)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **wasm-pack** - Tool for building Rust-generated WebAssembly
   ```bash
   curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
   ```

3. **A local web server** - Choose one:
   - Python 3: `python3 -m http.server`
   - Python 2: `python -m SimpleHTTPServer`
   - Node.js: `npx http-server`
   - Rust: `cargo install simple-http-server`

## Project Structure

```
image-processor-wasm/
├── Cargo.toml              # Rust dependencies and configuration
├── Cargo.lock              # Locked dependency versions
├── src/
│   └── lib.rs              # Rust/WASM image processing code
├── www/
│   ├── index.html          # Main HTML page
│   ├── style.css           # Styling
│   └── app.js              # JavaScript integration
├── pkg/                    # Generated WASM output (after build)
│   ├── image_processor_wasm.js
│   ├── image_processor_wasm_bg.wasm
│   └── ...
├── .gitignore
└── README.md
```

## Setup Instructions

### 1. Build the WebAssembly Module

This compiles the Rust code to WebAssembly:

```bash
wasm-pack build --target web
```

This command will:
- Compile your Rust code to WebAssembly
- Generate JavaScript bindings
- Create the `pkg/` directory with all necessary files
- Optimize the WASM binary for production

**Build options:**
- `--target web` - For ES6 module imports (recommended)
- `--release` - Production build with optimizations (default)
- `--dev` - Development build with debug symbols

### 2. Serve the Application

You need a local web server because browsers restrict ES6 module imports from `file://` URLs.

**Option A: Python (recommended for simplicity)**
```bash
# From the project root
python3 -m http.server 8080
```

**Option B: Node.js**
```bash
npx http-server -p 8080
```

**Option C: Rust simple-http-server**
```bash
cargo install simple-http-server
simple-http-server -p 8080
```

### 4. Open in Browser

Navigate to:
```
http://localhost:8080/www/
```

## Usage

1. **Upload an Image**
   - Click "Select File" or drag-and-drop an image
   - Supported formats: PNG, JPEG, WebP

2. **Apply Filters**
   - Click any filter button to apply it instantly
   - For adjustable filters (Blur, Brightness, Contrast):
     - Move the slider to desired value
     - Click "Apply" button

3. **Download Result**
   - Click "Download Processed Image" to save
   - File is saved as PNG with timestamp

4. **Reset**
   - Click "Reset to Original" to undo all changes

## Development

### Making Changes to Rust Code

1. Edit `src/lib.rs`
2. Rebuild the WASM module:
   ```bash
   wasm-pack build --target web
   ```
3. Refresh your browser (hard refresh: Ctrl+Shift+R or Cmd+Shift+R)

### Making Changes to Frontend

1. Edit files in `www/` directory
2. Simply refresh your browser - no rebuild needed!

### Adding New Image Processing Functions

1. **Add function to `src/lib.rs`:**
   ```rust
   #[wasm_bindgen]
   pub fn my_new_filter(data: &[u8]) -> Result<Vec<u8>, JsValue> {
       let img = bytes_to_image(data)?;
       // ... your processing logic
       image_to_bytes(&img, ImageFormat::Png)
   }
   ```

2. **Add UI control in `www/index.html`:**
   ```html
   <button class="btn btn-filter" data-filter="my_new_filter">
       My New Filter
   </button>
   ```

3. **Add handler in `www/app.js`:**
   ```javascript
   case 'my_new_filter':
       result = wasmModule.my_new_filter(currentImageData);
       break;
   ```

4. **Rebuild:**
   ```bash
   wasm-pack build --target web
   ```

## Performance Optimization

The application is optimized for performance:

- **Rust Optimizations** (`Cargo.toml`):
  ```toml
  [profile.release]
  opt-level = "s"  # Optimize for size
  lto = true       # Link-time optimization
  ```

- **Efficient Memory Usage**: Images are processed in-place where possible
- **No `.unwrap()` calls**: All errors are properly handled
- **Minimal dependencies**: Only essential crates included

## Troubleshooting

### WASM module fails to load

**Error:** `Failed to load WebAssembly module`

**Solution:**
- Ensure you've run `wasm-pack build --target web`
- Check that `pkg/` directory exists and contains `.wasm` file
- Verify you're using a local web server (not `file://`)

### Image processing is slow

**Tips:**
- Large images (>4000px) may take longer to process
- Blur with high sigma values is computationally expensive
- Consider resizing very large images before processing

### Build errors

**Error:** `wasm-pack: command not found`

**Solution:**
```bash
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
```

**Error:** Rust compilation errors

**Solution:**
- Ensure Rust is up to date: `rustup update`
- Check that you're using Rust 1.70 or later: `rustc --version`

### Browser compatibility

This application requires a modern browser with WebAssembly support:
- Chrome/Edge 57+
- Firefox 52+
- Safari 11+
- Opera 44+

## Technical Details

### Dependencies

**Rust Crates:**
- `wasm-bindgen` - JavaScript/WebAssembly interop
- `image` - Image processing library
- `console_error_panic_hook` - Better error messages in browser
- `js-sys` - JavaScript standard library bindings
- `web-sys` - Web API bindings

### Why WebAssembly?

WebAssembly provides:
- **Performance**: Near-native execution speed
- **Safety**: Rust's memory safety guarantees
- **Privacy**: All processing happens locally
- **Portability**: Runs in any modern browser

### Image Processing Pipeline

```
User uploads image
      ↓
JavaScript FileReader → ArrayBuffer
      ↓
Pass to WASM as &[u8]
      ↓
Rust decodes image (PNG/JPEG/WebP)
      ↓
Apply processing algorithm
      ↓
Encode result as PNG
      ↓
Return to JavaScript as Vec<u8>
      ↓
Display on canvas
```

## Contributing

Contributions are welcome! Here are some ideas:

- Add more filters (edge detection, sharpen, etc.)
- Implement batch processing
- Add image resize/crop functionality
- Support additional formats (GIF, BMP)
- Add histogram visualization
- Implement undo/redo stack

## License

This project is open source and available under the MIT License.

## Resources

- [Rust Book](https://doc.rust-lang.org/book/)
- [wasm-bindgen Guide](https://rustwasm.github.io/wasm-bindgen/)
- [WebAssembly Documentation](https://webassembly.org/)
- [image crate docs](https://docs.rs/image/)

## Acknowledgments

Built with:
- [Rust](https://www.rust-lang.org/)
- [WebAssembly](https://webassembly.org/)
- [wasm-pack](https://rustwasm.github.io/wasm-pack/)
- [image crate](https://github.com/image-rs/image)

---

**Note:** This is a demonstration project showcasing client-side image processing with Rust and WebAssembly. Feel free to use it as a learning resource or starting point for your own projects!
