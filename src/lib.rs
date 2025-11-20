use image::{DynamicImage, GenericImageView, ImageBuffer, ImageFormat, Rgba};
use std::io::Cursor;
use wasm_bindgen::prelude::*;

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


/// Helper function to combine two images using a custom pixel selection strategy
/// Encapsulates boilerplate: loading, resizing, RGBA conversion, and encoding
///
/// # Arguments
/// * `user_img_data` - Raw image bytes for the main image
/// * `overlay_img_data` - Raw image bytes for the overlay image
/// * `selector` - Closure that determines which image to use for each pixel
///   - Arguments: (x, y, width, height)
///   - Returns: true to use user pixel, false to use overlay pixel
///
/// # Returns
/// * `Result<Vec<u8>, JsValue>` - Combined image as PNG bytes or error
fn combine_images_with_selector<F>(
    user_img_data: &[u8],
    overlay_img_data: &[u8],
    selector: F,
) -> Result<Vec<u8>, JsValue>
where
    F: Fn(u32, u32, u32, u32) -> bool,
{
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

    // Iterate through all pixels and apply the selection strategy
    for y in 0..height {
        for x in 0..width {
            let pixel = if selector(x, y, width, height) {
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
pub fn combine_diagonal_tl_br(
    user_img_data: &[u8],
    overlay_img_data: &[u8],
) -> Result<Vec<u8>, JsValue> {
    log("Processing: Combine images (diagonal top-left to bottom-right)");
    combine_images_with_selector(user_img_data, overlay_img_data, |x, y, w, h| {
        (y as u32 * w) < (x as u32 * h)
    })
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
pub fn combine_diagonal_tr_bl(
    user_img_data: &[u8],
    overlay_img_data: &[u8],
) -> Result<Vec<u8>, JsValue> {
    log("Processing: Combine images (diagonal top-right to bottom-left)");
    combine_images_with_selector(user_img_data, overlay_img_data, |x, y, w, h| {
        (y as u32 * w) < ((w - x as u32) * h)
    })
}

/// Combine two images with filter on top (↑)
/// Top half from the overlay image, bottom half from the user image
///
/// # Arguments
/// * `user_img_data` - Raw image bytes for the main image (PNG, JPEG, or WebP)
/// * `overlay_img_data` - Raw image bytes for the overlay/filter image (PNG, JPEG, or WebP)
///
/// # Returns
/// * `Result<Vec<u8>, JsValue>` - Combined image as PNG bytes or error
#[wasm_bindgen]
pub fn combine_filter_top(
    user_img_data: &[u8],
    overlay_img_data: &[u8],
) -> Result<Vec<u8>, JsValue> {
    log("Processing: Combine images (filter on top ↑)");
    combine_images_with_selector(user_img_data, overlay_img_data, |_, y, _, h| {
        y >= h / 2
    })
}

/// Combine two images with filter on bottom (↓)
/// Top half from the user image, bottom half from the overlay image
///
/// # Arguments
/// * `user_img_data` - Raw image bytes for the main image (PNG, JPEG, or WebP)
/// * `overlay_img_data` - Raw image bytes for the overlay/filter image (PNG, JPEG, or WebP)
///
/// # Returns
/// * `Result<Vec<u8>, JsValue>` - Combined image as PNG bytes or error
#[wasm_bindgen]
pub fn combine_filter_bottom(
    user_img_data: &[u8],
    overlay_img_data: &[u8],
) -> Result<Vec<u8>, JsValue> {
    log("Processing: Combine images (filter on bottom ↓)");
    combine_images_with_selector(user_img_data, overlay_img_data, |_, y, _, h| {
        y < h / 2
    })
}

/// Combine two images with filter on left (←)
/// Left half from the overlay image, right half from the user image
///
/// # Arguments
/// * `user_img_data` - Raw image bytes for the main image (PNG, JPEG, or WebP)
/// * `overlay_img_data` - Raw image bytes for the overlay/filter image (PNG, JPEG, or WebP)
///
/// # Returns
/// * `Result<Vec<u8>, JsValue>` - Combined image as PNG bytes or error
#[wasm_bindgen]
pub fn combine_filter_left(
    user_img_data: &[u8],
    overlay_img_data: &[u8],
) -> Result<Vec<u8>, JsValue> {
    log("Processing: Combine images (filter on left ←)");
    combine_images_with_selector(user_img_data, overlay_img_data, |x, _, w, _| {
        x >= w / 2
    })
}

/// Combine two images with filter on right (→)
/// Left half from the user image, right half from the overlay image
///
/// # Arguments
/// * `user_img_data` - Raw image bytes for the main image (PNG, JPEG, or WebP)
/// * `overlay_img_data` - Raw image bytes for the overlay/filter image (PNG, JPEG, or WebP)
///
/// # Returns
/// * `Result<Vec<u8>, JsValue>` - Combined image as PNG bytes or error
#[wasm_bindgen]
pub fn combine_filter_right(
    user_img_data: &[u8],
    overlay_img_data: &[u8],
) -> Result<Vec<u8>, JsValue> {
    log("Processing: Combine images (filter on right →)");
    combine_images_with_selector(user_img_data, overlay_img_data, |x, _, w, _| {
        x < w / 2
    })
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

/// Check if an image is square-ish (within 2% tolerance)
///
/// # Arguments
/// * `data` - Raw image bytes (PNG, JPEG, or WebP)
///
/// # Returns
/// * `Result<bool, JsValue>` - true if image is approximately square, false otherwise
#[wasm_bindgen]
pub fn is_square_ish(data: &[u8]) -> Result<bool, JsValue> {
    let img = bytes_to_image(data)?;
    let (width, height) = img.dimensions();

    // Calculate aspect ratio
    let ratio = (width as f32) / (height as f32);

    // 2% tolerance
    let tolerance = 0.02;
    let is_square = ratio >= (1.0 - tolerance) && ratio <= (1.0 + tolerance);

    log(&format!(
        "Image dimensions: {}x{}, ratio: {:.4}, is_square_ish: {}",
        width, height, ratio, is_square
    ));

    Ok(is_square)
}

/// Create a transparent overlay of the overlay image on top of the user image
/// Uses alpha blending to composite the overlay with adjustable opacity
///
/// # Arguments
/// * `user_img_data` - Raw image bytes for the base image (PNG, JPEG, or WebP)
/// * `overlay_img_data` - Raw image bytes for the overlay image (PNG, JPEG, or WebP)
/// * `opacity` - Opacity of the overlay layer (0.0 = fully transparent, 1.0 = fully opaque)
///
/// # Returns
/// * `Result<Vec<u8>, JsValue>` - Composited image as PNG bytes or error
#[wasm_bindgen]
pub fn overlay_transparent(
    user_img_data: &[u8],
    overlay_img_data: &[u8],
    opacity: f32,
) -> Result<Vec<u8>, JsValue> {
    log(&format!("Processing: Transparent overlay with opacity {}", opacity));

    // Validate opacity range
    if opacity < 0.0 || opacity > 1.0 {
        return Err(JsValue::from_str(
            "Opacity must be between 0.0 and 1.0",
        ));
    }

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

    // Iterate through all pixels and blend them
    for y in 0..height {
        for x in 0..width {
            let user_pixel = user_rgba.get_pixel(x, y);
            let overlay_pixel = overlay_rgba.get_pixel(x, y);

            // Extract color components (normalized to [0.0, 1.0])
            let ur_norm = user_pixel[0] as f32 / 255.0;
            let ug_norm = user_pixel[1] as f32 / 255.0;
            let ub_norm = user_pixel[2] as f32 / 255.0;
            let ua_norm = user_pixel[3] as f32 / 255.0;

            let or_norm = overlay_pixel[0] as f32 / 255.0;
            let og_norm = overlay_pixel[1] as f32 / 255.0;
            let ob_norm = overlay_pixel[2] as f32 / 255.0;
            // Combine overlay's alpha with the opacity parameter
            let oa_norm = (overlay_pixel[3] as f32 / 255.0) * opacity;

            // Porter-Duff "over" operator for proper alpha compositing
            // alpha_out = alpha_overlay + alpha_base * (1 - alpha_overlay)
            let alpha_out = oa_norm + ua_norm * (1.0 - oa_norm);

            // Blend colors using Porter-Duff formula
            let (r_out, g_out, b_out) = if alpha_out > 0.0 {
                // color_out = (color_overlay * alpha_overlay + color_base * alpha_base * (1 - alpha_overlay)) / alpha_out
                let r = (or_norm * oa_norm + ur_norm * ua_norm * (1.0 - oa_norm)) / alpha_out;
                let g = (og_norm * oa_norm + ug_norm * ua_norm * (1.0 - oa_norm)) / alpha_out;
                let b = (ob_norm * oa_norm + ub_norm * ua_norm * (1.0 - oa_norm)) / alpha_out;
                (r, g, b)
            } else {
                // Fully transparent pixel
                (0.0, 0.0, 0.0)
            };

            // Denormalize back to [0, 255] range
            let blended_r = (r_out * 255.0).min(255.0).max(0.0) as u8;
            let blended_g = (g_out * 255.0).min(255.0).max(0.0) as u8;
            let blended_b = (b_out * 255.0).min(255.0).max(0.0) as u8;
            let blended_a = (alpha_out * 255.0).min(255.0).max(0.0) as u8;

            output.put_pixel(x, y, Rgba([blended_r, blended_g, blended_b, blended_a]));
        }
    }

    let result_img = DynamicImage::ImageRgba8(output);
    image_to_bytes(&result_img, ImageFormat::Png)
}

/// Crop an image to a square region
///
/// # Arguments
/// * `data` - Raw image bytes (PNG, JPEG, or WebP)
/// * `x` - Left edge of the crop area in pixels
/// * `y` - Top edge of the crop area in pixels
/// * `size` - Width and height of the square crop area in pixels
///
/// # Returns
/// * `Result<Vec<u8>, JsValue>` - Cropped image as PNG bytes or error
#[wasm_bindgen]
pub fn crop_square(data: &[u8], x: u32, y: u32, size: u32) -> Result<Vec<u8>, JsValue> {
    log(&format!(
        "Processing: Crop square at ({}, {}) size {}",
        x, y, size
    ));

    let img = bytes_to_image(data)?;
    let (width, height) = img.dimensions();

    // Validate that the crop area doesn't exceed image bounds
    if x + size > width {
        return Err(JsValue::from_str(&format!(
            "Crop area exceeds image width: {} + {} > {}",
            x, size, width
        )));
    }
    if y + size > height {
        return Err(JsValue::from_str(&format!(
            "Crop area exceeds image height: {} + {} > {}",
            y, size, height
        )));
    }

    // Crop the image to the specified square region
    let cropped = img.crop_imm(x, y, size, size);

    image_to_bytes(&cropped, ImageFormat::Png)
}
