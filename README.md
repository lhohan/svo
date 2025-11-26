# Smartphone Free Badge Maker

A client-side web application that adds Smartphone Free ([Smartphonevrij Opgroeien](https://smartphonevrijopgroeien.nl)) lightning badges to profile photos and school logos. All image processing happens entirely in your browser - no server uploads required!

This tool helps schools and individuals show solidarity with "smartphone free" education initiatives by adding the distinctive lightning mark to their images.

## Features

### Badge Creation
- **Lightning Badge** - Add the smartphone free education lightning mark to images
- **Transparent Overlay** - Maintains image quality while adding the badge

### Image Processing
- **Drag-and-Drop Upload** - Simple file upload interface
- **Real-time Preview** - See results instantly before downloading
- **Format Support** - Works with PNG, JPEG, and WebP (untested) images
- **Private Processing** - All processing happens locally in your browser

### Smart Features
- **Automatic Sizing** - Badge scales appropriately to image dimensions
- **High Quality Output** - Maintains original image resolution
- **One-Click Download** - Export as PNG with transparency preserved

### Multilingual UI (EN/NL)
- **Auto Detection** – First load picks Dutch if your browser’s preferred languages (via `navigator.languages`) include `nl*`; otherwise English is used.
- **Manual Override** – Header shows EN/NL buttons; clicking one instantly updates all text and sets the active style.
- **Persistent Choice** – The selected language is stored in `localStorage` (`svo-lang`), so it overrides detection on subsequent visits until cleared.

## Background or why I made this

My reasons for creating this project are several:

1. I wanted to support the Smartphone Free initiative. I noticed there was a line in the documentation saying how you could create a logo by combining your own school logo with their lightning logo. Since this is not trivial for most people, I decided to build a focused, simple-to-use tool that could help with that. And, as such, maybe help people spread the word.
2. Software engineering interest. Can I build a simple tool using modern day AI agents effectively and efficiently? What are their limits, how do I use them?
3. This one is minor: I wanted to assess usage of Rust on the front end.

## Architecture

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

**Image Processing (Rust → WebAssembly):**
- Image decoding (PNG, JPEG, WebP)
- Image processing algorithms
- Image encoding
- Memory-efficient operations

## Prerequisites

This project uses Nix for reproducible development environments. While you can manually install the dependencies, the recommended approach is to use Nix.

### Option 1: Nix Flakes (Recommended)

**Requirements:**
- [Nix](https://nixos.org/download.html) with flakes enabled
- [direnv](https://direnv.net/) (optional, for automatic environment loading)

**Setup:**

1. **Enable Nix flakes** (if not already enabled):
   ```bash
   # Add to your ~/.config/nix/nix.conf or /etc/nix/nix.conf
   experimental-features = nix-command flakes
   ```

2. **Enter the development environment:**
   ```bash
   nix develop
   ```
   
   Or with direnv (automatic):
   ```bash
   echo "use flake" > .envrc
   direnv allow
   ```

3. **Verify environment:**
   - Rust, wasm-pack, and other tools are automatically available
   - Run `just --list` to see available commands

**Included tools:**
- `rustup` - Rust toolchain manager
- `wasm-pack` - WebAssembly build tool
- `binaryen` - WebAssembly optimizer (wasm-opt)
- `simple-http-server` - Local development server
- `just` - Task runner

### Option 2: Manual Installation

If you prefer not to use Nix, manually install the following:

1. **Rust** (1.70 or later)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **wasm-pack** - Tool for building Rust-generated WebAssembly
   ```bash
   curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
   ```

3. **just** - Task runner (optional but recommended)
   ```bash
   cargo install just
   ```

4. **A local web server** - Choose one:
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

## Development Commands (just)

This project uses [`just`](https://github.com/casey/just) as a task runner. All common operations are available as simple commands:

### Available Commands

Run `just --list` to see all available commands:

```bash
just --list
```

**Core Commands:**

- **`just run`** - Start the development server
  - Serves the `www/` directory on port 8000
  - Auto-indexes directories for easy navigation
  - Includes browser cache prevention for development

- **`just build`** - Build WebAssembly in development mode
  - Faster compilation for development
  - Copies built files to `www/pkg/` for immediate testing
  - Generates version and commit hash information

- **`just build-release`** - Build WebAssembly in production mode
  - Optimized build with wasm-pack release profile
  - Enables WebAssembly optimizations (wasm-opt)
  - Smaller binary size, better performance

- **`just dev`** - Build and run server in one command
  - Runs `just build` followed by `just run`
  - Perfect for quick development iterations

### Development Workflow

**For development (fast iteration):**
```bash
just dev
```

**For testing production build:**
```bash
just build-release
just run
```

**Making changes to Rust code:**
1. Edit `src/lib.rs`
2. Run `just build` (or `just build-release` for production)
3. Refresh browser (hard refresh: Ctrl+Shift+R)

**Making changes to frontend:**
1. Edit files in `www/` directory
2. Refresh browser - no rebuild needed

### Manual Build (Alternative to just)

If you prefer not to use `just`, you can build manually:

```bash
# Build WebAssembly
wasm-pack build --target web

# Copy to www directory (required for serving)
cp -r pkg www/

# Start development server
simple-http-server www -p 8000 -i
```

For production builds:
```bash
wasm-pack build --target web --release
cp -r pkg www/
simple-http-server www -p 8000 -i
```

### Opening the Application

Navigate to:
```
http://localhost:8000/
```

The development server automatically serves from the `www/` directory and provides directory indexing for easy navigation.

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

1. **Add Rust function** in `src/lib.rs` - see existing functions for patterns
2. **Add UI control** in `www/index.html` with `data-filter="your_function"`  
3. **Add handler** in `www/app.js` switch statement
4. **Run `just build``

**Key rules:**
- All exported functions return `Result<Vec<u8>, JsValue>`
- Never use `.unwrap()` - use `?` operator
- Include `log("Processing: Your Function")` for debugging
- Use `imageToFilter` variable (handles pending crops)

**Examples:** Look at `combine_filter_top()` (dual image) or `crop_square()` (single image with parameters)

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

**Note:** This is a demonstration project showcasing client-side image processing with Rust and WebAssembly. Feel free to use it as a learning resource your own projects!
