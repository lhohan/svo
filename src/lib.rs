use wasm_bindgen::prelude::*;
use image::{ImageBuffer, Rgba, ImageFormat, DynamicImage, GenericImageView};
use std::io::Cursor;

/// Initialize panic hook for better error messages in the browser console
#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

/// Helper function to log messages to browser console
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

/// Convert image bytes to DynamicImage
/// Returns Result to handle various image format errors
fn bytes_to_image(data: &[u8]) -> Result<DynamicImage, JsValue> {
    image::load_from_memory(data)
        .map_err(|e| JsValue::from_str(&format!("Failed to load image: {}", e)))
}

/// Convert DynamicImage to PNG bytes
/// Returns Result to handle encoding errors
fn image_to_bytes(img: &DynamicImage, format: ImageFormat) -> Result<Vec<u8>, JsValue> {
    let mut buf = Vec::new();
    let mut cursor = Cursor::new(&mut buf);

    img.write_to(&mut cursor, format)
        .map_err(|e| JsValue::from_str(&format!("Failed to encode image: {}", e)))?;

    Ok(buf)
}

/// Convert an image to grayscale
///
/// # Arguments
/// * `data` - Raw image bytes (PNG, JPEG, or WebP)
///
/// # Returns
/// * `Result<Vec<u8>, JsValue>` - Processed image as PNG bytes or error
#[wasm_bindgen]
pub fn grayscale(data: &[u8]) -> Result<Vec<u8>, JsValue> {
    log("Processing: Grayscale conversion");

    let img = bytes_to_image(data)?;
    let gray_img = DynamicImage::ImageLuma8(img.to_luma8());

    image_to_bytes(&gray_img, ImageFormat::Png)
}

/// Invert the colors of an image
///
/// # Arguments
/// * `data` - Raw image bytes (PNG, JPEG, or WebP)
///
/// # Returns
/// * `Result<Vec<u8>, JsValue>` - Processed image as PNG bytes or error
#[wasm_bindgen]
pub fn invert(data: &[u8]) -> Result<Vec<u8>, JsValue> {
    log("Processing: Color inversion");

    let mut img = bytes_to_image(data)?;
    img.invert();

    image_to_bytes(&img, ImageFormat::Png)
}

/// Apply a blur effect to an image
///
/// # Arguments
/// * `data` - Raw image bytes (PNG, JPEG, or WebP)
/// * `sigma` - Blur intensity (recommended: 1.0 - 10.0)
///
/// # Returns
/// * `Result<Vec<u8>, JsValue>` - Processed image as PNG bytes or error
#[wasm_bindgen]
pub fn blur(data: &[u8], sigma: f32) -> Result<Vec<u8>, JsValue> {
    log(&format!("Processing: Blur with sigma {}", sigma));

    if sigma < 0.0 {
        return Err(JsValue::from_str("Sigma must be non-negative"));
    }

    let img = bytes_to_image(data)?;
    let blurred = img.blur(sigma);

    image_to_bytes(&blurred, ImageFormat::Png)
}

/// Adjust the brightness of an image
///
/// # Arguments
/// * `data` - Raw image bytes (PNG, JPEG, or WebP)
/// * `value` - Brightness adjustment (-100 to 100, where 0 is no change)
///
/// # Returns
/// * `Result<Vec<u8>, JsValue>` - Processed image as PNG bytes or error
#[wasm_bindgen]
pub fn brighten(data: &[u8], value: i32) -> Result<Vec<u8>, JsValue> {
    log(&format!("Processing: Brightness adjustment by {}", value));

    let img = bytes_to_image(data)?;
    let brightened = img.brighten(value);

    image_to_bytes(&brightened, ImageFormat::Png)
}

/// Adjust the contrast of an image
///
/// # Arguments
/// * `data` - Raw image bytes (PNG, JPEG, or WebP)
/// * `contrast` - Contrast adjustment factor (negative = decrease, positive = increase)
///
/// # Returns
/// * `Result<Vec<u8>, JsValue>` - Processed image as PNG bytes or error
#[wasm_bindgen]
pub fn adjust_contrast(data: &[u8], contrast: f32) -> Result<Vec<u8>, JsValue> {
    log(&format!("Processing: Contrast adjustment by {}", contrast));

    let img = bytes_to_image(data)?;
    let adjusted = img.adjust_contrast(contrast);

    image_to_bytes(&adjusted, ImageFormat::Png)
}

/// Apply a sepia tone effect to an image
///
/// # Arguments
/// * `data` - Raw image bytes (PNG, JPEG, or WebP)
///
/// # Returns
/// * `Result<Vec<u8>, JsValue>` - Processed image as PNG bytes or error
#[wasm_bindgen]
pub fn sepia(data: &[u8]) -> Result<Vec<u8>, JsValue> {
    log("Processing: Sepia tone effect");

    let img = bytes_to_image(data)?;
    let (width, height) = img.dimensions();
    let rgba_img = img.to_rgba8();

    let mut output: ImageBuffer<Rgba<u8>, Vec<u8>> = ImageBuffer::new(width, height);

    for (x, y, pixel) in rgba_img.enumerate_pixels() {
        let r = pixel[0] as f32;
        let g = pixel[1] as f32;
        let b = pixel[2] as f32;
        let a = pixel[3];

        // Sepia tone transformation matrix
        let tr = (0.393 * r + 0.769 * g + 0.189 * b).min(255.0) as u8;
        let tg = (0.349 * r + 0.686 * g + 0.168 * b).min(255.0) as u8;
        let tb = (0.272 * r + 0.534 * g + 0.131 * b).min(255.0) as u8;

        output.put_pixel(x, y, Rgba([tr, tg, tb, a]));
    }

    let sepia_img = DynamicImage::ImageRgba8(output);
    image_to_bytes(&sepia_img, ImageFormat::Png)
}

/// Rotate image 90 degrees clockwise
///
/// # Arguments
/// * `data` - Raw image bytes (PNG, JPEG, or WebP)
///
/// # Returns
/// * `Result<Vec<u8>, JsValue>` - Processed image as PNG bytes or error
#[wasm_bindgen]
pub fn rotate90(data: &[u8]) -> Result<Vec<u8>, JsValue> {
    log("Processing: Rotate 90° clockwise");

    let img = bytes_to_image(data)?;
    let rotated = img.rotate90();

    image_to_bytes(&rotated, ImageFormat::Png)
}

/// Rotate image 180 degrees
///
/// # Arguments
/// * `data` - Raw image bytes (PNG, JPEG, or WebP)
///
/// # Returns
/// * `Result<Vec<u8>, JsValue>` - Processed image as PNG bytes or error
#[wasm_bindgen]
pub fn rotate180(data: &[u8]) -> Result<Vec<u8>, JsValue> {
    log("Processing: Rotate 180°");

    let img = bytes_to_image(data)?;
    let rotated = img.rotate180();

    image_to_bytes(&rotated, ImageFormat::Png)
}

/// Rotate image 270 degrees clockwise (90 degrees counter-clockwise)
///
/// # Arguments
/// * `data` - Raw image bytes (PNG, JPEG, or WebP)
///
/// # Returns
/// * `Result<Vec<u8>, JsValue>` - Processed image as PNG bytes or error
#[wasm_bindgen]
pub fn rotate270(data: &[u8]) -> Result<Vec<u8>, JsValue> {
    log("Processing: Rotate 270° clockwise");

    let img = bytes_to_image(data)?;
    let rotated = img.rotate270();

    image_to_bytes(&rotated, ImageFormat::Png)
}

/// Flip image horizontally
///
/// # Arguments
/// * `data` - Raw image bytes (PNG, JPEG, or WebP)
///
/// # Returns
/// * `Result<Vec<u8>, JsValue>` - Processed image as PNG bytes or error
#[wasm_bindgen]
pub fn fliph(data: &[u8]) -> Result<Vec<u8>, JsValue> {
    log("Processing: Flip horizontally");

    let img = bytes_to_image(data)?;
    let flipped = img.fliph();

    image_to_bytes(&flipped, ImageFormat::Png)
}

/// Flip image vertically
///
/// # Arguments
/// * `data` - Raw image bytes (PNG, JPEG, or WebP)
///
/// # Returns
/// * `Result<Vec<u8>, JsValue>` - Processed image as PNG bytes or error
#[wasm_bindgen]
pub fn flipv(data: &[u8]) -> Result<Vec<u8>, JsValue> {
    log("Processing: Flip vertically");

    let img = bytes_to_image(data)?;
    let flipped = img.flipv();

    image_to_bytes(&flipped, ImageFormat::Png)
}

/// Combine two images with a top/bottom split
/// Top half from the user image, bottom half from the overlay image
///
/// # Arguments
/// * `user_img_data` - Raw image bytes for the main image (PNG, JPEG, or WebP)
/// * `overlay_img_data` - Raw image bytes for the overlay image (PNG, JPEG, or WebP)
///
/// # Returns
/// * `Result<Vec<u8>, JsValue>` - Combined image as PNG bytes or error
#[wasm_bindgen]
pub fn combine_top_bottom(user_img_data: &[u8], overlay_img_data: &[u8]) -> Result<Vec<u8>, JsValue> {
    log("Processing: Combine images (top/bottom split)");

    // Load both images
    let user_img = bytes_to_image(user_img_data)?;
    let mut overlay_img = bytes_to_image(overlay_img_data)?;

    let (width, height) = user_img.dimensions();

    // Resize overlay image to match user image dimensions
    overlay_img = overlay_img.resize_exact(width, height, image::imageops::FilterType::Lanczos3);

    // Convert both to RGBA for pixel manipulation
    let user_rgba = user_img.to_rgba8();
    let overlay_rgba = overlay_img.to_rgba8();

    // Create output buffer
    let mut output: ImageBuffer<Rgba<u8>, Vec<u8>> = ImageBuffer::new(width, height);

    let mid_height = height / 2;

    // Copy top half from user image
    for y in 0..mid_height {
        for x in 0..width {
            let pixel = user_rgba.get_pixel(x, y);
            output.put_pixel(x, y, *pixel);
        }
    }

    // Copy bottom half from overlay image
    for y in mid_height..height {
        for x in 0..width {
            let pixel = overlay_rgba.get_pixel(x, y);
            output.put_pixel(x, y, *pixel);
        }
    }

    let combined_img = DynamicImage::ImageRgba8(output);
    image_to_bytes(&combined_img, ImageFormat::Png)
}

/// Combine two images with a left/right split (vertical line)
/// Left half from the user image, right half from the overlay image
///
/// # Arguments
/// * `user_img_data` - Raw image bytes for the main image (PNG, JPEG, or WebP)
/// * `overlay_img_data` - Raw image bytes for the overlay image (PNG, JPEG, or WebP)
///
/// # Returns
/// * `Result<Vec<u8>, JsValue>` - Combined image as PNG bytes or error
#[wasm_bindgen]
pub fn combine_left_right(user_img_data: &[u8], overlay_img_data: &[u8]) -> Result<Vec<u8>, JsValue> {
    log("Processing: Combine images (left/right split)");

    let user_img = bytes_to_image(user_img_data)?;
    let mut overlay_img = bytes_to_image(overlay_img_data)?;

    let (width, height) = user_img.dimensions();
    overlay_img = overlay_img.resize_exact(width, height, image::imageops::FilterType::Lanczos3);

    let user_rgba = user_img.to_rgba8();
    let overlay_rgba = overlay_img.to_rgba8();

    let mut output: ImageBuffer<Rgba<u8>, Vec<u8>> = ImageBuffer::new(width, height);
    let mid_width = width / 2;

    for y in 0..height {
        for x in 0..width {
            let pixel = if x < mid_width {
                user_rgba.get_pixel(x, y)
            } else {
                overlay_rgba.get_pixel(x, y)
            };
            output.put_pixel(x, y, *pixel);
        }
    }

    let combined_img = DynamicImage::ImageRgba8(output);
    image_to_bytes(&combined_img, ImageFormat::Png)
}

/// Combine two images with a diagonal split (top-left to bottom-right)
/// Top-left triangle from the user image, bottom-right triangle from the overlay image
///
/// # Arguments
/// * `user_img_data` - Raw image bytes for the main image (PNG, JPEG, or WebP)
/// * `overlay_img_data` - Raw image bytes for the overlay image (PNG, JPEG, or WebP)
///
/// # Returns
/// * `Result<Vec<u8>, JsValue>` - Combined image as PNG bytes or error
#[wasm_bindgen]
pub fn combine_diagonal_tl_br(user_img_data: &[u8], overlay_img_data: &[u8]) -> Result<Vec<u8>, JsValue> {
    log("Processing: Combine images (diagonal top-left to bottom-right)");

    let user_img = bytes_to_image(user_img_data)?;
    let mut overlay_img = bytes_to_image(overlay_img_data)?;

    let (width, height) = user_img.dimensions();
    overlay_img = overlay_img.resize_exact(width, height, image::imageops::FilterType::Lanczos3);

    let user_rgba = user_img.to_rgba8();
    let overlay_rgba = overlay_img.to_rgba8();

    let mut output: ImageBuffer<Rgba<u8>, Vec<u8>> = ImageBuffer::new(width, height);

    for y in 0..height {
        for x in 0..width {
            // Diagonal line from (0, 0) to (width, height)
            // Equation: y * width = x * height
            // Point is above line (user) if: y * width < x * height
            let pixel = if (y as u32 * width) < (x as u32 * height) {
                user_rgba.get_pixel(x, y)
            } else {
                overlay_rgba.get_pixel(x, y)
            };
            output.put_pixel(x, y, *pixel);
        }
    }

    let combined_img = DynamicImage::ImageRgba8(output);
    image_to_bytes(&combined_img, ImageFormat::Png)
}

/// Combine two images with a diagonal split (top-right to bottom-left)
/// Top-right triangle from the user image, bottom-left triangle from the overlay image
///
/// # Arguments
/// * `user_img_data` - Raw image bytes for the main image (PNG, JPEG, or WebP)
/// * `overlay_img_data` - Raw image bytes for the overlay image (PNG, JPEG, or WebP)
///
/// # Returns
/// * `Result<Vec<u8>, JsValue>` - Combined image as PNG bytes or error
#[wasm_bindgen]
pub fn combine_diagonal_tr_bl(user_img_data: &[u8], overlay_img_data: &[u8]) -> Result<Vec<u8>, JsValue> {
    log("Processing: Combine images (diagonal top-right to bottom-left)");

    let user_img = bytes_to_image(user_img_data)?;
    let mut overlay_img = bytes_to_image(overlay_img_data)?;

    let (width, height) = user_img.dimensions();
    overlay_img = overlay_img.resize_exact(width, height, image::imageops::FilterType::Lanczos3);

    let user_rgba = user_img.to_rgba8();
    let overlay_rgba = overlay_img.to_rgba8();

    let mut output: ImageBuffer<Rgba<u8>, Vec<u8>> = ImageBuffer::new(width, height);

    for y in 0..height {
        for x in 0..width {
            // Diagonal line from (width, 0) to (0, height)
            // Equation: y * width = (width - x) * height
            // Point is above line (user) if: y * width < (width - x) * height
            let pixel = if (y as u32 * width) < ((width - x as u32) * height) {
                user_rgba.get_pixel(x, y)
            } else {
                overlay_rgba.get_pixel(x, y)
            };
            output.put_pixel(x, y, *pixel);
        }
    }

    let combined_img = DynamicImage::ImageRgba8(output);
    image_to_bytes(&combined_img, ImageFormat::Png)
}

/// Get image dimensions
///
/// # Arguments
/// * `data` - Raw image bytes (PNG, JPEG, or WebP)
///
/// # Returns
/// * `Result<Vec<u32>, JsValue>` - Array of [width, height] or error
#[wasm_bindgen]
pub fn get_dimensions(data: &[u8]) -> Result<Vec<u32>, JsValue> {
    let img = bytes_to_image(data)?;
    let (width, height) = img.dimensions();

    Ok(vec![width, height])
}
