// Import the WebAssembly module
import init, * as wasm from './pkg/image_processor_wasm.js';

// Global state
let wasmModule = null;
let uploadedImageData = null;
let originalImageData = null;
let currentImageData = null;
let originalFileName = '';
let overlayImageData = null;

// Crop state
let cropMode = false;
let cropOverlayCanvas = null;
let cropStartX = null;
let cropStartY = null;
let cropCurrentX = null;
let cropCurrentY = null;
let cropSize = null;
let isDragging = false;
let dragStartX = null;
let dragStartY = null;
const MIN_DRAG_DISTANCE = 5;

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const selectFileBtn = document.getElementById('selectFileBtn');
const controlsSection = document.getElementById('controlsSection');
const imagesSection = document.getElementById('imagesSection');
const originalCanvas = document.getElementById('originalCanvas');
const processedCanvas = document.getElementById('processedCanvas');
const originalInfo = document.getElementById('originalInfo');
const processedInfo = document.getElementById('processedInfo');
const loadingOverlay = document.getElementById('loadingOverlay');
const errorMessage = document.getElementById('errorMessage');
const resetBtn = document.getElementById('resetBtn');
const downloadBtn = document.getElementById('downloadBtn');


// Crop buttons
const cropModeBtn = document.getElementById('cropModeBtn');
const applyCropBtn = document.getElementById('applyCropBtn');
const cancelCropBtn = document.getElementById('cancelCropBtn');

/**
 * Load the overlay image (lightning bolt)
 */
async function loadOverlayImage() {
    try {
        const response = await fetch('./lightning.png');
        if (!response.ok) {
            throw new Error(`Failed to fetch overlay image: ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();
        overlayImageData = new Uint8Array(buffer);
        console.log('Overlay image loaded successfully');
    } catch (error) {
        console.warn('Warning: Could not load overlay image. Combine feature may not work: ' + error.message);
    }
}

/**
 * Initialize the WebAssembly module
 */
async function initWasm() {
    try {
        // Check for WebAssembly support
        if (!('WebAssembly' in window)) {
            showError('WebAssembly is not supported in your browser. Please use a modern browser like Chrome 57+, Firefox 52+, Safari 11+, or Edge 16+.');
            console.error('WebAssembly not supported');
            return;
        }

        showLoading(true);
        await init();
        wasmModule = wasm;
        console.log('WebAssembly module loaded successfully');

        // Load overlay image
        await loadOverlayImage();

        showLoading(false);
    } catch (error) {
        showError('Failed to load WebAssembly module: ' + error.message);
        showLoading(false);
        console.error('WASM initialization error:', error);
    }
}

/**
 * Show/hide loading overlay
 */
function showLoading(show) {
    if (show) {
        loadingOverlay.classList.add('active');
    } else {
        loadingOverlay.classList.remove('active');
    }
}

/**
 * Display error message
 */
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('active');
    setTimeout(() => {
        errorMessage.classList.remove('active');
    }, 5000);
}

/**
 * Handle file selection
 */
function handleFileSelect(file) {
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        showError('Please select a valid image file (PNG, JPEG, or WebP)');
        return;
    }

    originalFileName = file.name;
    const reader = new FileReader();

    reader.onload = function(e) {
        uploadedImageData = new Uint8Array(e.target.result);
        originalImageData = uploadedImageData;
        currentImageData = uploadedImageData;
        displayImage(uploadedImageData, originalCanvas, originalInfo);
        displayImage(uploadedImageData, processedCanvas, processedInfo);

        // Show controls and images
        controlsSection.style.display = 'block';
        imagesSection.style.display = 'grid';

        // Scroll to controls
        controlsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    reader.onerror = function() {
        showError('Failed to read the file');
    };

    reader.readAsArrayBuffer(file);
}

/**
 * Display image on canvas
 */
function displayImage(imageData, canvas, infoElement) {
    const blob = new Blob([imageData], { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = function() {
        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw image on canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // Update info
        const sizeKB = (imageData.length / 1024).toFixed(2);
        infoElement.textContent = `${img.width} × ${img.height} px • ${sizeKB} KB`;

        // Clean up
        URL.revokeObjectURL(url);
    };

    img.onerror = function() {
        showError('Failed to load image');
        URL.revokeObjectURL(url);
    };

    img.src = url;
}

/**
 * Apply image filter
 */
async function applyFilter(filterName, ...args) {
    if (!wasmModule || !currentImageData) {
        showError('No image loaded or WASM module not initialized');
        return;
    }

    try {
        showLoading(true);

        // Small delay to allow UI to update
        await new Promise(resolve => setTimeout(resolve, 50));

        let result;

        // Call the appropriate WASM function
        switch (filterName) {
            case 'grayscale':
                result = wasmModule.grayscale(currentImageData);
                break;
            case 'invert':
                result = wasmModule.invert(currentImageData);
                break;
            case 'blur':
                const sigma = parseFloat(args[0]);
                result = wasmModule.blur(currentImageData, sigma);
                break;
            case 'brighten':
                const brightness = parseInt(args[0]);
                result = wasmModule.brighten(currentImageData, brightness);
                break;
            case 'adjust_contrast':
                const contrast = parseFloat(args[0]);
                result = wasmModule.adjust_contrast(currentImageData, contrast);
                break;
            case 'sepia':
                result = wasmModule.sepia(currentImageData);
                break;
            case 'rotate90':
                result = wasmModule.rotate90(currentImageData);
                break;
            case 'rotate180':
                result = wasmModule.rotate180(currentImageData);
                break;
            case 'rotate270':
                result = wasmModule.rotate270(currentImageData);
                break;
            case 'fliph':
                result = wasmModule.fliph(currentImageData);
                break;
            case 'flipv':
                result = wasmModule.flipv(currentImageData);
                break;
            case 'combine_filter_top':
                if (!overlayImageData) {
                    throw new Error('Overlay image not loaded. Please ensure lightning.png is available.');
                }
                result = wasmModule.combine_filter_top(currentImageData, overlayImageData);
                break;
            case 'combine_filter_bottom':
                if (!overlayImageData) {
                    throw new Error('Overlay image not loaded. Please ensure lightning.png is available.');
                }
                result = wasmModule.combine_filter_bottom(currentImageData, overlayImageData);
                break;
            case 'combine_filter_left':
                if (!overlayImageData) {
                    throw new Error('Overlay image not loaded. Please ensure lightning.png is available.');
                }
                result = wasmModule.combine_filter_left(currentImageData, overlayImageData);
                break;
            case 'combine_filter_right':
                if (!overlayImageData) {
                    throw new Error('Overlay image not loaded. Please ensure lightning.png is available.');
                }
                result = wasmModule.combine_filter_right(currentImageData, overlayImageData);
                break;
            case 'combine_diagonal_tl_br':
                if (!overlayImageData) {
                    throw new Error('Overlay image not loaded. Please ensure lightning.png is available.');
                }
                result = wasmModule.combine_diagonal_tl_br(currentImageData, overlayImageData);
                break;
            case 'combine_diagonal_tr_bl':
                if (!overlayImageData) {
                    throw new Error('Overlay image not loaded. Please ensure lightning.png is available.');
                }
                result = wasmModule.combine_diagonal_tr_bl(currentImageData, overlayImageData);
                break;
            case 'crop_square':
                const cropX = Math.floor(args[0]);
                const cropY = Math.floor(args[1]);
                const cropSize = Math.floor(args[2]);
                result = wasmModule.crop_square(currentImageData, cropX, cropY, cropSize);
                break;
            default:
                throw new Error('Unknown filter: ' + filterName);
        }

        // Update current image data
        currentImageData = result;

        // Display processed image
        displayImage(currentImageData, processedCanvas, processedInfo);

        showLoading(false);
    } catch (error) {
        showError('Processing failed: ' + error.message);
        showLoading(false);
        console.error('Filter error:', error);
    }
}

/**
 * Reset to original uploaded image
 */
function resetImage() {
    if (!uploadedImageData) return;

    // Reset to the originally uploaded image
    originalImageData = uploadedImageData;
    currentImageData = uploadedImageData;

    // Redisplay both canvases with uploaded image
    displayImage(uploadedImageData, originalCanvas, originalInfo);
    displayImage(uploadedImageData, processedCanvas, processedInfo);

}

/**
 * Download processed image
 */
function downloadImage() {
    if (!currentImageData) {
        showError('No processed image to download');
        return;
    }

    const blob = new Blob([currentImageData], { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    // Generate filename
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const baseName = originalFileName.replace(/\.[^/.]+$/, '');
    a.download = `${baseName}_processed_${timestamp}.png`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Convert mouse coordinates to original canvas coordinates
 */
function getCanvasCoordinates(mouseX, mouseY) {
    const rect = originalCanvas.getBoundingClientRect();

    // Calculate the actual pixel size of the canvas on screen
    const displayWidth = rect.width;
    const displayHeight = rect.height;

    // Calculate scaling factors (canvas resolution / display size)
    const scaleX = originalCanvas.width / displayWidth;
    const scaleY = originalCanvas.height / displayHeight;

    // Convert mouse position to canvas pixel coordinates
    const canvasX = (mouseX - rect.left) * scaleX;
    const canvasY = (mouseY - rect.top) * scaleY;

    return {
        x: Math.max(0, Math.min(canvasX, originalCanvas.width)),
        y: Math.max(0, Math.min(canvasY, originalCanvas.height))
    };
}

/**
 * Create overlay canvas for crop selection (on original image)
 */
function createCropOverlay() {
    // Remove existing overlay if any
    if (cropOverlayCanvas) {
        cropOverlayCanvas.remove();
    }

    // Create overlay canvas
    cropOverlayCanvas = document.createElement('canvas');
    cropOverlayCanvas.id = 'cropOverlay';
    cropOverlayCanvas.className = 'crop-overlay';

    // Get the image wrapper for the original image
    const imageWrapper = originalCanvas.parentElement;

    // Set canvas to match original canvas dimensions (both internal and display)
    cropOverlayCanvas.width = originalCanvas.width;
    cropOverlayCanvas.height = originalCanvas.height;
    cropOverlayCanvas.style.width = originalCanvas.offsetWidth + 'px';
    cropOverlayCanvas.style.height = originalCanvas.offsetHeight + 'px';

    // Position relatively within the image wrapper
    // Calculate offset to account for canvas centering (margin: 0 auto)
    const canvasRect = originalCanvas.getBoundingClientRect();
    const wrapperRect = imageWrapper.getBoundingClientRect();

    const leftOffset = canvasRect.left - wrapperRect.left;
    const topOffset = canvasRect.top - wrapperRect.top;

    cropOverlayCanvas.style.position = 'absolute';
    cropOverlayCanvas.style.left = leftOffset + 'px';
    cropOverlayCanvas.style.top = topOffset + 'px';
    cropOverlayCanvas.style.pointerEvents = 'none';

    // Append to image wrapper (which should have position: relative)
    imageWrapper.style.position = 'relative';
    imageWrapper.appendChild(cropOverlayCanvas);
}

/**
 * Draw crop selection rectangle
 */
function drawCropSelection() {
    if (!cropOverlayCanvas || cropStartX === null) return;

    const ctx = cropOverlayCanvas.getContext('2d');
    const width = cropOverlayCanvas.width;
    const height = cropOverlayCanvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, width, height);

    // Calculate crop square
    const deltaX = Math.abs(cropCurrentX - cropStartX);
    const deltaY = Math.abs(cropCurrentY - cropStartY);
    cropSize = Math.min(deltaX, deltaY);

    // Calculate top-left position
    const cropX = cropStartX < cropCurrentX ? cropStartX : cropStartX - cropSize;
    const cropY = cropStartY < cropCurrentY ? cropStartY : cropStartY - cropSize;

    // Clear the selection area
    ctx.clearRect(cropX, cropY, cropSize, cropSize);

    // Draw selection border
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(cropX, cropY, cropSize, cropSize);
    ctx.setLineDash([]);

    // Draw corner handles
    const handleSize = 8;
    ctx.fillStyle = '#6366f1';
    const corners = [
        [cropX, cropY],
        [cropX + cropSize, cropY],
        [cropX, cropY + cropSize],
        [cropX + cropSize, cropY + cropSize]
    ];
    corners.forEach(([x, y]) => {
        ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
    });
}

/**
 * Enter crop mode (on original image)
 */
function enterCropMode() {
    cropMode = true;
    cropModeBtn.style.display = 'none';
    applyCropBtn.style.display = 'inline-block';
    cancelCropBtn.style.display = 'inline-block';

    createCropOverlay();
    originalCanvas.style.cursor = 'crosshair';

    // Calculate default centered square selection (maximum size = 100% of smaller dimension)
    const canvasWidth = originalCanvas.width;
    const canvasHeight = originalCanvas.height;
    const smallerDimension = Math.min(canvasWidth, canvasHeight);
    const defaultSize = smallerDimension;

    // Center the selection
    const centerX = Math.floor(canvasWidth / 2);
    const centerY = Math.floor(canvasHeight / 2);

    // Set crop coordinates to create a centered square
    cropStartX = Math.floor(centerX - defaultSize / 2);
    cropStartY = Math.floor(centerY - defaultSize / 2);
    cropCurrentX = Math.floor(centerX + defaultSize / 2);
    cropCurrentY = Math.floor(centerY + defaultSize / 2);
    cropSize = defaultSize;

    // Draw the default selection immediately
    drawCropSelection();
}

/**
 * Exit crop mode
 */
function exitCropMode() {
    cropMode = false;
    cropModeBtn.style.display = 'inline-block';
    applyCropBtn.style.display = 'none';
    cancelCropBtn.style.display = 'none';
    originalCanvas.style.cursor = 'default';

    if (cropOverlayCanvas) {
        cropOverlayCanvas.remove();
        cropOverlayCanvas = null;
    }

    cropStartX = null;
    cropStartY = null;
    cropCurrentX = null;
    cropCurrentY = null;
    cropSize = null;
}

/**
 * Apply crop
 */
async function applyCrop() {
    if (cropSize === null || cropStartX === null) {
        showError('Please select a crop area first');
        return;
    }

    // Calculate actual crop coordinates
    const deltaX = Math.abs(cropCurrentX - cropStartX);
    const deltaY = Math.abs(cropCurrentY - cropStartY);
    const size = Math.min(deltaX, deltaY);

    const x = Math.min(cropStartX, cropCurrentX);
    const y = Math.min(cropStartY, cropCurrentY);

    exitCropMode();

    // Apply crop via WASM to the original image data
    try {
        showLoading(true);

        // Small delay to allow UI to update
        await new Promise(resolve => setTimeout(resolve, 50));

        // Crop from original image
        const croppedData = wasmModule.crop_square(originalImageData, x, y, size);

        // Update both original and current to the cropped version
        originalImageData = croppedData;
        currentImageData = croppedData;

        // Display the cropped image on both canvases
        displayImage(croppedData, originalCanvas, originalInfo);
        displayImage(croppedData, processedCanvas, processedInfo);

        showLoading(false);
    } catch (error) {
        showError('Crop failed: ' + error.message);
        showLoading(false);
        console.error('Crop error:', error);
    }
}

/**
 * Cancel crop
 */
function cancelCrop() {
    exitCropMode();
}

// Event Listeners

// File input
selectFileBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
    }
});

// Drag and drop
uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');

    if (e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files[0]);
    }
});

// Filter buttons
document.querySelectorAll('.btn-filter').forEach(btn => {
    btn.addEventListener('click', function() {
        const filter = this.getAttribute('data-filter');

        applyFilter(filter);
    });
});


// Action buttons
resetBtn.addEventListener('click', resetImage);
downloadBtn.addEventListener('click', downloadImage);

// Crop buttons
cropModeBtn.addEventListener('click', enterCropMode);
applyCropBtn.addEventListener('click', applyCrop);
cancelCropBtn.addEventListener('click', cancelCrop);

// Canvas mouse events for crop selection (on original canvas)
originalCanvas.addEventListener('mousedown', (e) => {
    if (!cropMode) return;

    const coords = getCanvasCoordinates(e.clientX, e.clientY);

    // Store click position temporarily
    dragStartX = coords.x;
    dragStartY = coords.y;
    isDragging = false;

    // Do NOT update cropStartX/cropCurrentX yet
    // Do NOT call drawCropSelection() yet
    // This preserves the existing selection until user actually drags
});

originalCanvas.addEventListener('mousemove', (e) => {
    if (!cropMode || dragStartX === null) return;

    const coords = getCanvasCoordinates(e.clientX, e.clientY);

    // Check if user has dragged beyond threshold
    const dragDistance = Math.hypot(coords.x - dragStartX, coords.y - dragStartY);

    if (!isDragging && dragDistance < MIN_DRAG_DISTANCE) {
        // Not dragging yet, ignore small movements
        return;
    }

    if (!isDragging) {
        // Start drag: now we can update the crop coordinates
        isDragging = true;
        cropStartX = dragStartX;
        cropStartY = dragStartY;
    }

    // Update current position and redraw
    cropCurrentX = coords.x;
    cropCurrentY = coords.y;
    drawCropSelection();
});

originalCanvas.addEventListener('mouseup', () => {
    if (!cropMode) return;

    // Reset drag tracking
    dragStartX = null;
    dragStartY = null;
    isDragging = false;

    // Selection is finalized, ready for apply
    // cropStartX/cropCurrentX remain set (if dragging occurred)
});

originalCanvas.addEventListener('mouseleave', () => {
    if (cropMode && dragStartX !== null) {
        // User left canvas while clicking - cancel the drag
        dragStartX = null;
        dragStartY = null;
        isDragging = false;
        // Keep existing selection
    }
});

// Initialize WASM on page load
initWasm();
