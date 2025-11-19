// Import the WebAssembly module
import init, * as wasm from "./pkg/image_processor_wasm.js";

// Import version information
import { VERSION, COMMIT_HASH } from "./version.js";

// Global state
let wasmModule = null;
let uploadedImageData = null;
let originalImageData = null;
let currentImageData = null;
let originalFileName = "";
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
let pendingCropParams = null; // {x, y, size} or null
let isLandscape = false; // true if width > height

// DOM Elements
const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const selectFileBtn = document.getElementById("selectFileBtn");
const controlsSection = document.getElementById("controlsSection");
const imagesSection = document.getElementById("imagesSection");
const originalCanvas = document.getElementById("originalCanvas");
const processedCanvas = document.getElementById("processedCanvas");
const originalInfo = document.getElementById("originalInfo");
const processedInfo = document.getElementById("processedInfo");
const loadingOverlay = document.getElementById("loadingOverlay");
const errorMessage = document.getElementById("errorMessage");
const resetBtn = document.getElementById("resetBtn");
const downloadBtn = document.getElementById("downloadBtn");

// Crop UI
const cropInstructions = document.getElementById("cropInstructions");

/**
 * Load the overlay image (lightning bolt)
 */
async function loadOverlayImage() {
  try {
    const response = await fetch("./lightning.png");
    if (!response.ok) {
      throw new Error(`Failed to fetch overlay image: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    overlayImageData = new Uint8Array(buffer);
    console.log("Overlay image loaded successfully");
  } catch (error) {
    console.warn(
      "Warning: Could not load overlay image. Combine feature may not work: " +
        error.message,
    );
  }
}

/**
 * Display version information in the footer
 */
function displayVersion() {
  const versionElement = document.getElementById("versionInfo");
  if (versionElement) {
    versionElement.textContent = `v${VERSION} (${COMMIT_HASH})`;
  }
}

/**
 * Initialize the WebAssembly module
 */
async function initWasm() {
  try {
    // Check for WebAssembly support
    if (!("WebAssembly" in window)) {
      showError(
        "WebAssembly is not supported in your browser. Please use a modern browser like Chrome 57+, Firefox 52+, Safari 11+, or Edge 16+.",
      );
      console.error("WebAssembly not supported");
      return;
    }

    showLoading(true);
    await init();
    wasmModule = wasm;
    console.log("WebAssembly module loaded successfully");

    // Load overlay image
    await loadOverlayImage();

    // Display version information
    displayVersion();

    showLoading(false);
  } catch (error) {
    showError("Failed to load WebAssembly module: " + error.message);
    showLoading(false);
    console.error("WASM initialization error:", error);
  }
}

/**
 * Show/hide loading overlay
 */
function showLoading(show) {
  if (show) {
    loadingOverlay.classList.add("active");
  } else {
    loadingOverlay.classList.remove("active");
  }
}

/**
 * Display error message
 */
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add("active");
  setTimeout(() => {
    errorMessage.classList.remove("active");
  }, 5000);
}

/**
 * Handle file selection
 */
function handleFileSelect(file) {
  if (!file) return;

  // Validate file type
  const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  if (!validTypes.includes(file.type)) {
    showError("Please select a valid image file (PNG, JPEG, or WebP)");
    return;
  }

  originalFileName = file.name;
  const reader = new FileReader();

  reader.onload = async function (e) {
    uploadedImageData = new Uint8Array(e.target.result);
    originalImageData = uploadedImageData;
    currentImageData = uploadedImageData;

    // Show controls and images
    controlsSection.style.display = "block";
    imagesSection.style.display = "grid";

    // Wait for both images to finish loading before proceeding
    try {
      await Promise.all([
        displayImage(uploadedImageData, originalCanvas, originalInfo),
        displayImage(uploadedImageData, processedCanvas, processedInfo),
      ]);

      // Check if image is square-ish
      const isSquare = await wasmModule.is_square_ish(uploadedImageData);
      if (!isSquare) {
        // Auto-show crop mode for non-square images
        enterCropMode();
      } else {
        // Square image: no crop needed
        cropMode = false;
        pendingCropParams = null;
        if (cropOverlayCanvas) {
          cropOverlayCanvas.remove();
          cropOverlayCanvas = null;
        }
      }
    } catch (error) {
      console.error("Error loading image or checking if square:", error);
      // Default to showing crop mode if check fails
      enterCropMode();
    }

    // Scroll to controls
    controlsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  reader.onerror = function () {
    showError("Failed to read the file");
  };

  reader.readAsArrayBuffer(file);
}

/**
 * Display image on canvas
 * Returns a Promise that resolves when the image finishes loading
 */
function displayImage(imageData, canvas, infoElement) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([imageData], { type: "image/png" });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = function () {
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw image on canvas
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      // Update info
      const sizeKB = (imageData.length / 1024).toFixed(2);
      infoElement.textContent = `${img.width} × ${img.height} px • ${sizeKB} KB`;

      // Clean up
      URL.revokeObjectURL(url);

      // Resolve promise
      resolve();
    };

    img.onerror = function () {
      showError("Failed to load image");
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

/**
 * Apply image filter
 */
async function applyFilter(filterName, ...args) {
  if (!wasmModule || !currentImageData) {
    showError("No image loaded or WASM module not initialized");
    return;
  }

  try {
    showLoading(true);

    // Small delay to allow UI to update
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Check if there's a pending crop and apply it first
    let imageToFilter = currentImageData;
    if (pendingCropParams) {
      imageToFilter = wasmModule.crop_square(
        originalImageData,
        pendingCropParams.x,
        pendingCropParams.y,
        pendingCropParams.size,
      );
      // Update original and current to the cropped version
      originalImageData = imageToFilter;
      currentImageData = imageToFilter;
      pendingCropParams = null;
      exitCropMode();
    }

    let result;

    // Call the appropriate WASM function
    switch (filterName) {
      case "grayscale":
        result = wasmModule.grayscale(imageToFilter);
        break;
      case "invert":
        result = wasmModule.invert(imageToFilter);
        break;
      case "blur":
        const sigma = parseFloat(args[0]);
        result = wasmModule.blur(imageToFilter, sigma);
        break;
      case "brighten":
        const brightness = parseInt(args[0]);
        result = wasmModule.brighten(imageToFilter, brightness);
        break;
      case "adjust_contrast":
        const contrast = parseFloat(args[0]);
        result = wasmModule.adjust_contrast(imageToFilter, contrast);
        break;
      case "sepia":
        result = wasmModule.sepia(imageToFilter);
        break;
      case "rotate90":
        result = wasmModule.rotate90(imageToFilter);
        break;
      case "rotate180":
        result = wasmModule.rotate180(imageToFilter);
        break;
      case "rotate270":
        result = wasmModule.rotate270(imageToFilter);
        break;
      case "fliph":
        result = wasmModule.fliph(imageToFilter);
        break;
      case "flipv":
        result = wasmModule.flipv(imageToFilter);
        break;
      case "combine_filter_top":
        if (!overlayImageData) {
          throw new Error(
            "Overlay image not loaded. Please ensure lightning.png is available.",
          );
        }
        result = wasmModule.combine_filter_top(imageToFilter, overlayImageData);
        break;
      case "combine_filter_bottom":
        if (!overlayImageData) {
          throw new Error(
            "Overlay image not loaded. Please ensure lightning.png is available.",
          );
        }
        result = wasmModule.combine_filter_bottom(
          imageToFilter,
          overlayImageData,
        );
        break;
      case "combine_filter_left":
        if (!overlayImageData) {
          throw new Error(
            "Overlay image not loaded. Please ensure lightning.png is available.",
          );
        }
        result = wasmModule.combine_filter_left(
          imageToFilter,
          overlayImageData,
        );
        break;
      case "combine_filter_right":
        if (!overlayImageData) {
          throw new Error(
            "Overlay image not loaded. Please ensure lightning.png is available.",
          );
        }
        result = wasmModule.combine_filter_right(
          imageToFilter,
          overlayImageData,
        );
        break;
      case "combine_diagonal_tl_br":
        if (!overlayImageData) {
          throw new Error(
            "Overlay image not loaded. Please ensure lightning.png is available.",
          );
        }
        result = wasmModule.combine_diagonal_tl_br(
          imageToFilter,
          overlayImageData,
        );
        break;
      case "combine_diagonal_tr_bl":
        if (!overlayImageData) {
          throw new Error(
            "Overlay image not loaded. Please ensure lightning.png is available.",
          );
        }
        result = wasmModule.combine_diagonal_tr_bl(
          imageToFilter,
          overlayImageData,
        );
        break;
      default:
        throw new Error("Unknown filter: " + filterName);
    }

    // Update current image data
    currentImageData = result;

    // Display processed image
    displayImage(currentImageData, processedCanvas, processedInfo);

    showLoading(false);
  } catch (error) {
    showError("Processing failed: " + error.message);
    showLoading(false);
    console.error("Filter error:", error);
  }
}

/**
 * Reset to original uploaded image
 */
async function resetImage() {
  if (!uploadedImageData) return;

  // Reset to the originally uploaded image
  originalImageData = uploadedImageData;
  currentImageData = uploadedImageData;
  pendingCropParams = null;

  // Redisplay both canvases with uploaded image
  // Wait for both images to finish loading before proceeding
  try {
    await Promise.all([
      displayImage(uploadedImageData, originalCanvas, originalInfo),
      displayImage(uploadedImageData, processedCanvas, processedInfo),
    ]);

    // Check if image is square-ish and re-show crop mode if needed
    const isSquare = await wasmModule.is_square_ish(uploadedImageData);
    if (!isSquare) {
      // Re-show crop mode for non-square images
      enterCropMode();
    } else {
      // Square image: no crop needed
      cropMode = false;
      if (cropOverlayCanvas) {
        cropOverlayCanvas.remove();
        cropOverlayCanvas = null;
      }
    }
  } catch (error) {
    console.error("Error checking if image is square:", error);
    // Default to showing crop mode if check fails
    enterCropMode();
  }
}

/**
 * Download processed image
 */
function downloadImage() {
  if (!currentImageData) {
    showError("No processed image to download");
    return;
  }

  const blob = new Blob([currentImageData], { type: "image/png" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  // Generate filename
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
  const baseName = originalFileName.replace(/\.[^/.]+$/, "");
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
    y: Math.max(0, Math.min(canvasY, originalCanvas.height)),
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
  cropOverlayCanvas = document.createElement("canvas");
  cropOverlayCanvas.id = "cropOverlay";
  cropOverlayCanvas.className = "crop-overlay";

  // Get the image wrapper for the original image
  const imageWrapper = originalCanvas.parentElement;

  // Set canvas to match original canvas dimensions (both internal and display)
  cropOverlayCanvas.width = originalCanvas.width;
  cropOverlayCanvas.height = originalCanvas.height;
  cropOverlayCanvas.style.width = originalCanvas.offsetWidth + "px";
  cropOverlayCanvas.style.height = originalCanvas.offsetHeight + "px";

  // Append to image wrapper (which should have position: relative)
  imageWrapper.style.position = "relative";
  imageWrapper.appendChild(cropOverlayCanvas);

  // Position after next paint to ensure layout is settled
  // This fixes Safari timing issues with getBoundingClientRect()
  requestAnimationFrame(() => {
    const canvasRect = originalCanvas.getBoundingClientRect();
    const wrapperRect = imageWrapper.getBoundingClientRect();

    const leftOffset = canvasRect.left - wrapperRect.left;
    const topOffset = canvasRect.top - wrapperRect.top;

    cropOverlayCanvas.style.position = "absolute";
    cropOverlayCanvas.style.left = leftOffset + "px";
    cropOverlayCanvas.style.top = topOffset + "px";
  });

  cropOverlayCanvas.style.pointerEvents = "none";
}

/**
 * Draw crop selection rectangle
 */
function drawCropSelection() {
  if (!cropOverlayCanvas || !pendingCropParams) return;

  const ctx = cropOverlayCanvas.getContext("2d");
  const width = cropOverlayCanvas.width;
  const height = cropOverlayCanvas.height;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Draw semi-transparent overlay
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(0, 0, width, height);

  // Calculate crop square from constrained coordinates
  const cropX = pendingCropParams.x;
  const cropY = pendingCropParams.y;
  const size = pendingCropParams.size;

  // Clear the selection area
  ctx.clearRect(cropX, cropY, size, size);

  // Draw selection border
  ctx.strokeStyle = "#6366f1";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(cropX, cropY, size, size);
  ctx.setLineDash([]);

  // Draw corner handles
  const handleSize = 8;
  ctx.fillStyle = "#6366f1";
  const corners = [
    [cropX, cropY],
    [cropX + size, cropY],
    [cropX, cropY + size],
    [cropX + size, cropY + size],
  ];
  corners.forEach(([x, y]) => {
    ctx.fillRect(
      x - handleSize / 2,
      y - handleSize / 2,
      handleSize,
      handleSize,
    );
  });
}

/**
 * Update crop preview in processed canvas
 */
function updateCropPreview() {
  if (!pendingCropParams) return;

  try {
    const croppedData = wasmModule.crop_square(
      originalImageData,
      pendingCropParams.x,
      pendingCropParams.y,
      pendingCropParams.size,
    );
    displayImage(croppedData, processedCanvas, processedInfo);
  } catch (error) {
    console.error("Error updating crop preview:", error);
  }
}

/**
 * Enter crop mode (on original image)
 */
function enterCropMode() {
  cropMode = true;
  cropInstructions.style.display = "block";

  createCropOverlay();
  originalCanvas.style.cursor = "grab";

  // Calculate default centered square selection (maximum size = 100% of smaller dimension)
  const canvasWidth = originalCanvas.width;
  const canvasHeight = originalCanvas.height;
  const smallerDimension = Math.min(canvasWidth, canvasHeight);
  const defaultSize = smallerDimension;

  // Determine if landscape or portrait
  isLandscape = canvasWidth > canvasHeight;

  // Center the selection
  const centerX = Math.floor(canvasWidth / 2);
  const centerY = Math.floor(canvasHeight / 2);
  const offsetSize = Math.floor(defaultSize / 2);

  // Initialize pending crop params
  pendingCropParams = {
    x: Math.floor(centerX - offsetSize),
    y: Math.floor(centerY - offsetSize),
    size: defaultSize,
  };

  // Draw the default selection immediately
  drawCropSelection();
  updateCropPreview();
}

/**
 * Exit crop mode
 */
function exitCropMode() {
  cropMode = false;
  cropInstructions.style.display = "none";
  originalCanvas.style.cursor = "default";

  if (cropOverlayCanvas) {
    cropOverlayCanvas.remove();
    cropOverlayCanvas = null;
  }

  cropStartX = null;
  cropStartY = null;
  cropCurrentX = null;
  cropCurrentY = null;
  cropSize = null;
  isDragging = false;
  dragStartX = null;
  dragStartY = null;
}


// Event Listeners

// File input change handler (label triggers file picker via HTML)
fileInput.addEventListener("change", (e) => {
  if (e.target.files.length > 0) {
    handleFileSelect(e.target.files[0]);
  }
});

// Drag and drop
uploadArea.addEventListener("click", (e) => {
  // Avoid double-triggering when clicking the label (it already triggers file input via for attribute)
  if (e.target.id === "selectFileBtn" || e.target.closest("#selectFileBtn")) {
    return;
  }
  fileInput.click();
});

// Keyboard accessibility for upload area
uploadArea.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fileInput.click();
  }
});

uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadArea.classList.add("dragover");
});

uploadArea.addEventListener("dragleave", () => {
  uploadArea.classList.remove("dragover");
});

uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadArea.classList.remove("dragover");

  if (e.dataTransfer.files.length > 0) {
    handleFileSelect(e.dataTransfer.files[0]);
  }
});

// Filter buttons
document.querySelectorAll(".btn-filter").forEach((btn) => {
  btn.addEventListener("click", function () {
    const filter = this.getAttribute("data-filter");

    applyFilter(filter);
  });
});

// Action buttons
resetBtn.addEventListener("click", resetImage);
downloadBtn.addEventListener("click", downloadImage);

// Canvas mouse events for crop selection (on original canvas)
originalCanvas.addEventListener("mousedown", (e) => {
  if (!cropMode || !pendingCropParams) return;

  const coords = getCanvasCoordinates(e.clientX, e.clientY);

  // Store click position temporarily
  dragStartX = coords.x;
  dragStartY = coords.y;
  isDragging = false;
});

originalCanvas.addEventListener("mousemove", (e) => {
  if (!cropMode || dragStartX === null || !pendingCropParams) return;

  const coords = getCanvasCoordinates(e.clientX, e.clientY);

  // Check if user has dragged beyond threshold
  const dragDistance = Math.hypot(coords.x - dragStartX, coords.y - dragStartY);

  if (!isDragging && dragDistance < MIN_DRAG_DISTANCE) {
    // Not dragging yet, ignore small movements
    return;
  }

  if (!isDragging) {
    isDragging = true;
    originalCanvas.style.cursor = "grabbing";
  }

  // Calculate new position based on drag direction
  const canvasWidth = originalCanvas.width;
  const canvasHeight = originalCanvas.height;
  const size = pendingCropParams.size;

  if (isLandscape) {
    // Allow horizontal dragging only
    let newX = pendingCropParams.x + (coords.x - dragStartX);
    // Constrain to image bounds
    newX = Math.max(0, Math.min(newX, canvasWidth - size));
    pendingCropParams.x = Math.floor(newX);
  } else {
    // Allow vertical dragging only
    let newY = pendingCropParams.y + (coords.y - dragStartY);
    // Constrain to image bounds
    newY = Math.max(0, Math.min(newY, canvasHeight - size));
    pendingCropParams.y = Math.floor(newY);
  }

  dragStartX = coords.x;
  dragStartY = coords.y;

  drawCropSelection();
  updateCropPreview();
});

originalCanvas.addEventListener("mouseup", () => {
  if (!cropMode) return;

  // Reset drag tracking
  dragStartX = null;
  dragStartY = null;
  isDragging = false;

  // Reset cursor back to grab when drag ends
  originalCanvas.style.cursor = "grab";
});

originalCanvas.addEventListener("mouseleave", () => {
  if (cropMode && dragStartX !== null) {
    // User left canvas while clicking - cancel the drag
    dragStartX = null;
    dragStartY = null;
    isDragging = false;

    // Reset cursor back to grab
    originalCanvas.style.cursor = "grab";
  }
});

// Initialize WASM on page load
initWasm();
