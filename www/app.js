// Import the WebAssembly module
import init, * as wasm from '../pkg/image_processor_wasm.js';

// Global state
let wasmModule = null;
let originalImageData = null;
let currentImageData = null;
let originalFileName = '';
let overlayImageData = null;

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

// Slider elements
const blurSlider = document.getElementById('blurSlider');
const blurValue = document.getElementById('blurValue');
const brightnessSlider = document.getElementById('brightnessSlider');
const brightnessValue = document.getElementById('brightnessValue');
const contrastSlider = document.getElementById('contrastSlider');
const contrastValue = document.getElementById('contrastValue');

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
        originalImageData = new Uint8Array(e.target.result);
        currentImageData = originalImageData;
        displayImage(originalImageData, originalCanvas, originalInfo);
        displayImage(originalImageData, processedCanvas, processedInfo);

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
            case 'combine_top_bottom':
                if (!overlayImageData) {
                    throw new Error('Overlay image not loaded. Please ensure lightning.png is available.');
                }
                result = wasmModule.combine_top_bottom(currentImageData, overlayImageData);
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
 * Reset to original image
 */
function resetImage() {
    if (!originalImageData) return;

    currentImageData = originalImageData;
    displayImage(currentImageData, processedCanvas, processedInfo);

    // Reset sliders
    blurSlider.value = 2.0;
    blurValue.textContent = '2.0';
    brightnessSlider.value = 0;
    brightnessValue.textContent = '0';
    contrastSlider.value = 0;
    contrastValue.textContent = '0';
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

        switch (filter) {
            case 'blur':
                applyFilter('blur', blurSlider.value);
                break;
            case 'brighten':
                applyFilter('brighten', brightnessSlider.value);
                break;
            case 'adjust_contrast':
                applyFilter('adjust_contrast', contrastSlider.value);
                break;
            default:
                applyFilter(filter);
        }
    });
});

// Sliders
blurSlider.addEventListener('input', (e) => {
    blurValue.textContent = e.target.value;
});

brightnessSlider.addEventListener('input', (e) => {
    brightnessValue.textContent = e.target.value;
});

contrastSlider.addEventListener('input', (e) => {
    contrastValue.textContent = e.target.value;
});

// Action buttons
resetBtn.addEventListener('click', resetImage);
downloadBtn.addEventListener('click', downloadImage);

// Initialize WASM on page load
initWasm();
