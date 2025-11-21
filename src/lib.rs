use wasm_bindgen::prelude::*;
use image::{ImageBuffer, Rgba, DynamicImage, GenericImageView, ImageEncoder};
use image::codecs::png::{PngEncoder, CompressionType, FilterType};
use image::codecs::jpeg::JpegEncoder;

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

/// Convert DynamicImage to bytes with specified compression and format
///
/// # Arguments
/// * `img` - The image to encode
/// * `compression_level` - 0 = Fast, 1 = Default, 2 = Best
/// * `output_format` - "png" or "jpeg"
///
/// Returns Result to handle encoding errors
fn image_to_bytes_with_options(
    img: &DynamicImage,
    compression_level: u8,
    output_format: &str
) -> Result<Vec<u8>, JsValue> {
    let mut buf = Vec::new();

    match output_format {
        "jpeg" => {
            // JPEG encoding with quality based on compression level
            // Higher compression level = higher quality
            let quality = match compression_level {
                0 => 75,  // Fast = lower quality, smaller file
                1 => 85,  // Default = balanced
                2 => 95,  // Best = high quality, larger file
                _ => 85,
            };

            let mut encoder = JpegEncoder::new_with_quality(&mut buf, quality);
            encoder.encode(
                img.as_bytes(),
                img.width(),
                img.height(),
                img.color().into()
            ).map_err(|e| JsValue::from_str(&format!("Failed to encode JPEG: {}", e)))?;
        }
        "png" | _ => {
            // PNG encoding with compression level
            let compression = match compression_level {
                0 => CompressionType::Fast,
                1 => CompressionType::Default,
                2 => CompressionType::Best,
                _ => CompressionType::Default,
            };

            let encoder = PngEncoder::new_with_quality(
                &mut buf,
                compression,
                FilterType::Adaptive
            );

            encoder.write_image(
                img.as_bytes(),
                img.width(),
                img.height(),
                img.color().into()
            ).map_err(|e| JsValue::from_str(&format!("Failed to encode PNG: {}", e)))?;
        }
    }

    Ok(buf)
}

/// Convert an image to grayscale
///
/// # Arguments
/// * `data` - Raw image bytes (PNG, JPEG, or WebP)
/// * `compression_level` - 0 = Fast, 1 = Default, 2 = Best
/// * `output_format` - "png" or "jpeg"
///
/// # Returns
/// * `Result<Vec<u8>, JsValue>` - Processed image bytes or error
#[wasm_bindgen]
pub fn grayscale(data: &[u8], compression_level: u8, output_format: &str) -> Result<Vec<u8>, JsValue> {
    log("Processing: Grayscale conversion");

    let img = bytes_to_image(data)?;
    let gray_img = DynamicImage::ImageLuma8(img.to_luma8());

    image_to_bytes_with_options(&gray_img, compression_level, output_format)
}

/// Invert the colors of an image
///
/// # Arguments
/// * `data` - Raw image bytes (PNG, JPEG, or WebP)
/// * `compression_level` - 0 = Fast, 1 = Default, 2 = Best
/// * `output_format` - "png" or "jpeg"
///
/// # Returns
/// * `Result<Vec<u8>, JsValue>` - Processed image bytes or error
#[wasm_bindgen]
pub fn invert(data: &[u8], compression_level: u8, output_format: &str) -> Result<Vec<u8>, JsValue> {
    log("Processing: Color inversion");

    let mut img = bytes_to_image(data)?;
    img.invert();

    image_to_bytes_with_options(&img, compression_level, output_format)
}

/// Apply a blur effect to an image
///
/// # Arguments
/// * `data` - Raw image bytes (PNG, JPEG, or WebP)
/// * `sigma` - Blur intensity (recommended: 1.0 - 10.0)
/// * `compression_level` - 0 = Fast, 1 = Default, 2 = Best
/// * `output_format` - "png" or "jpeg"
///
/// # Returns
/// * `Result<Vec<u8>, JsValue>` - Processed image bytes or error
#[wasm_bindgen]
pub fn blur(data: &[u8], sigma: f32, compression_level: u8, output_format: &str) -> Result<Vec<u8>, JsValue> {
    log(&format!("Processing: Blur with sigma {}", sigma));

    if sigma < 0.0 {
        return Err(JsValue::from_str("Sigma must be non-negative"));
    }

    let img = bytes_to_image(data)?;
    let blurred = img.blur(sigma);

    image_to_bytes_with_options(&blurred, compression_level, output_format)
}

/// Adjust the brightness of an image
///
/// # Arguments
/// * `data` - Raw image bytes (PNG, JPEG, or WebP)
/// * `value` - Brightness adjustment (-100 to 100, where 0 is no change)
/// * `compression_level` - 0 = Fast, 1 = Default, 2 = Best
/// * `output_format` - "png" or "jpeg"
///
/// # Returns
/// * `Result<Vec<u8>, JsValue>` - Processed image bytes or error
#[wasm_bindgen]
pub fn brighten(data: &[u8], value: i32, compression_level: u8, output_format: &str) -> Result<Vec<u8>, JsValue> {
    log(&format!("Processing: Brightness adjustment by {}", value));

    let img = bytes_to_image(data)?;
    let brightened = img.brighten(value);

    image_to_bytes_with_options(&brightened, compression_level, output_format)
}

/// Adjust the contrast of an image
///
/// # Arguments
/// * `data` - Raw image bytes (PNG, JPEG, or WebP)
/// * `contrast` - Contrast adjustment factor (negative = decrease, positive = increase)
/// * `compression_level` - 0 = Fast, 1 = Default, 2 = Best
/// * `output_format` - "png" or "jpeg"
///
/// # Returns
/// * `Result<Vec<u8>, JsValue>` - Processed image bytes or error
#[wasm_bindgen]
pub fn adjust_contrast(data: &[u8], contrast: f32, compression_level: u8, output_format: &str) -> Result<Vec<u8>, JsValue> {
    log(&format!("Processing: Contrast adjustment by {}", contrast));

    let img = bytes_to_image(data)?;
    let adjusted = img.adjust_contrast(contrast);

    image_to_bytes_with_options(&adjusted, compression_level, output_format)
}

/// Apply a sepia tone effect to an image
///
/// # Arguments
/// * `data` - Raw image bytes (PNG, JPEG, or WebP)
/// * `compression_level` - 0 = Fast, 1 = Default, 2 = Best
/// * `output_format` - "png" or "jpeg"
///
/// # Returns
/// * `Result<Vec<u8>, JsValue>` - Processed image bytes or error
#[wasm_bindgen]
pub fn sepia(data: &[u8], compression_level: u8, output_format: &str) -> Result<Vec<u8>, JsValue> {
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
    image_to_bytes_with_options(&sepia_img, compression_level, output_format)
}

/// Rotate image 90 degrees clockwise
///
/// # Arguments
/// * `data` - Raw image bytes (PNG, JPEG, or WebP)
/// * `compression_level` - 0 = Fast, 1 = Default, 2 = Best
/// * `output_format` - "png" or "jpeg"
///
/// # Returns
/// * `Result<Vec<u8>, JsValue>` - Processed image bytes or error
#[wasm_bindgen]
pub fn rotate90(data: &[u8], compression_level: u8, output_format: &str) -> Result<Vec<u8>, JsValue> {
    log("Processing: Rotate 90° clockwise");

    let img = bytes_to_image(data)?;
    let rotated = img.rotate90();

    image_to_bytes_with_options(&rotated, compression_level, output_format)
}

/// Rotate image 180 degrees
///
/// # Arguments
/// * `data` - Raw image bytes (PNG, JPEG, or WebP)
/// * `compression_level` - 0 = Fast, 1 = Default, 2 = Best
/// * `output_format` - "png" or "jpeg"
///
/// # Returns
/// * `Result<Vec<u8>, JsValue>` - Processed image bytes or error
#[wasm_bindgen]
pub fn rotate180(data: &[u8], compression_level: u8, output_format: &str) -> Result<Vec<u8>, JsValue> {
    log("Processing: Rotate 180°");

    let img = bytes_to_image(data)?;
    let rotated = img.rotate180();

    image_to_bytes_with_options(&rotated, compression_level, output_format)
}

/// Rotate image 270 degrees clockwise (90 degrees counter-clockwise)
///
/// # Arguments
/// * `data` - Raw image bytes (PNG, JPEG, or WebP)
/// * `compression_level` - 0 = Fast, 1 = Default, 2 = Best
/// * `output_format` - "png" or "jpeg"
///
/// # Returns
/// * `Result<Vec<u8>, JsValue>` - Processed image bytes or error
#[wasm_bindgen]
pub fn rotate270(data: &[u8], compression_level: u8, output_format: &str) -> Result<Vec<u8>, JsValue> {
    log("Processing: Rotate 270° clockwise");

    let img = bytes_to_image(data)?;
    let rotated = img.rotate270();

    image_to_bytes_with_options(&rotated, compression_level, output_format)
}

/// Flip image horizontally
///
/// # Arguments
/// * `data` - Raw image bytes (PNG, JPEG, or WebP)
/// * `compression_level` - 0 = Fast, 1 = Default, 2 = Best
/// * `output_format` - "png" or "jpeg"
///
/// # Returns
/// * `Result<Vec<u8>, JsValue>` - Processed image bytes or error
#[wasm_bindgen]
pub fn fliph(data: &[u8], compression_level: u8, output_format: &str) -> Result<Vec<u8>, JsValue> {
    log("Processing: Flip horizontally");

    let img = bytes_to_image(data)?;
    let flipped = img.fliph();

    image_to_bytes_with_options(&flipped, compression_level, output_format)
}

/// Flip image vertically
///
/// # Arguments
/// * `data` - Raw image bytes (PNG, JPEG, or WebP)
/// * `compression_level` - 0 = Fast, 1 = Default, 2 = Best
/// * `output_format` - "png" or "jpeg"
///
/// # Returns
/// * `Result<Vec<u8>, JsValue>` - Processed image bytes or error
#[wasm_bindgen]
pub fn flipv(data: &[u8], compression_level: u8, output_format: &str) -> Result<Vec<u8>, JsValue> {
    log("Processing: Flip vertically");

    let img = bytes_to_image(data)?;
    let flipped = img.flipv();

    image_to_bytes_with_options(&flipped, compression_level, output_format)
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
