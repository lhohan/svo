# Square Selection Specification

## Feature Overview

The square selection feature enables users to interactively select a square region on their uploaded image where a lightning bolt overlay will be composited. Users can resize and reposition the square in real-time, with live preview updates showing how the lightning effect will appear in the selected region.

## User Interaction Model

### Activation
Clicking any lightning filter button (Horizontal Split, Vertical Split, Diagonal TL-BR, Diagonal TR-BL) activates selection mode instead of immediately applying the filter.

### Selection Overlay
An overlay canvas appears on top of the original image (left side) displaying:
- A semi-transparent dark layer covering the entire image
- A clear square selection showing the selected region
- Four corner handles (small orange squares at each corner)
- The selected region's pixel dimensions
- Instructions panel above the image showing how to interact
- Done and Cancel buttons below the image

### Interaction Modes

**1. Resize via Corner Dragging**
- User clicks and drags any of the four corners to resize the square
- Square constraint is maintained (equal width and height)
- Each corner can resize independently based on diagonal direction:
  - Top-left corner: resizes from top-left inward, moving both X and Y
  - Top-right corner: resizes from top-right, changing Y and size
  - Bottom-left corner: resizes from bottom-left, changing X and size
  - Bottom-right corner: resizes from bottom-right outward
- Square size is bounded by:
  - Minimum: 1 pixel (enforced via Math.max)
  - Maximum: remaining image space in affected dimensions
  - Cannot extend beyond image boundaries

**2. Reposition via Center Dragging**
- User clicks and drags within the square (not on a corner) to move the entire square
- Selection moves as a unit while maintaining size
- Prevented from extending beyond image boundaries on any side
- Dragging distance is continuous without discrete steps

**3. Initial State**
- On mode activation, square is automatically initialized to maximum possible size
- Calculated as: size = min(image_width, image_height)
- Positioned at center: x = (image_width - size) / 2, y = (image_height - size) / 2

## Real-Time Processing and Preview

### Debounced Updates
- Selection changes (dragging) do not immediately trigger processing
- Processing is debounced with 300ms delay to avoid performance bottleneck
- After user stops dragging for 300ms, the preview updates
- Debounce is implemented via setTimeout with clearTimeout on each drag event

### Preview Behavior
- Processed image (right side) updates automatically as selection changes
- Each preview shows the original image with the lightning effect composited only in the selected square region
- Processing uses the original image data to ensure clean previews (not applied-on-applied)
- Lightning image is scaled to "cover" the square while preserving aspect ratio

## Technical Behavior

### Corner Hit Detection
- Corner interaction is detected when mouse is within CORNER_RADIUS (10 pixels) of a corner point
- Uses Euclidean distance: Math.hypot(x - corner_x, y - corner_y) <= 10
- All four corners have equal hit detection radius
- Center detection occurs only when point is inside square boundaries but not in corner radius

### Coordinate System
- Selection coordinates (selectionX, selectionY, selectionSize) are stored in image pixel coordinates
- Canvas display size may differ from actual image size (responsive canvas rendering)
- Mouse events from canvas are converted to image coordinates via getBoundingClientRect()
- Coordinates passed to WASM are rounded to integers

### Boundary Constraints
- Selection cannot have negative X or Y coordinates
- Selection cannot extend beyond image dimensions (X + Size <= image_width, Y + Size <= image_height)
- Constraints are applied dynamically during corner dragging and center movement
- Math.max/Math.min enforce bounds at each interaction step

### Visual Feedback
- Corner handles are drawn as small squares (8x8 pixels) at each corner center point
- Selection border is dashed orange line (2px width, 5px dash pattern)
- Overlay text shows current selection size in pixels (e.g., "500px")
- Cursor changes to auto (default) during interaction; no specific resize cursor styling

## State Management

### Global State Variables
- `isSelectionMode`: Boolean indicating if selection overlay is active
- `selectionFilter`: String name of the lightning filter being applied (e.g., 'combine_top_bottom')
- `selectionX`: Integer X coordinate of selection top-left corner
- `selectionY`: Integer Y coordinate of selection top-left corner
- `selectionSize`: Integer dimension of square (width = height = size)
- `isDraggingCorner`: String or null indicating which corner is being dragged ('tl', 'tr', 'bl', 'br', or null)
- `isDraggingCenter`: Boolean indicating if square center is being dragged
- `dragStartX`: Integer X coordinate where current drag operation started
- `dragStartY`: Integer Y coordinate where current drag operation started
- `debounceTimer`: Timeout ID for debounced processing (cleared and reset on each drag)
- `selectionOverlay`: Canvas DOM element reference for drawing selection UI

## WASM API Contract

### Function: combine_with_square_region()

**Parameters:**
- `user_img_data`: Uint8Array of original image bytes
- `overlay_img_data`: Uint8Array of overlay (lightning) image bytes
- `x`: Unsigned 32-bit integer, X coordinate of selection top-left corner
- `y`: Unsigned 32-bit integer, Y coordinate of selection top-left corner
- `size`: Unsigned 32-bit integer, dimension of square region

**Returns:**
- Uint8Array containing PNG-encoded bytes of result image
- Throws JsValue error if image decoding, processing, or encoding fails

**Behavior:**
- Loads both input images from bytes
- Scales overlay image to fit the square using "cover" mode:
  - Calculates overlay aspect ratio
  - Scales to fill square while maintaining aspect ratio (no stretching)
  - Crops excess to fit square region (crop is centered)
- Composites scaled overlay onto user image at position (x, y)
- Returns PNG-encoded result
- Preserves circular shape of overlay image through aspect-ratio-preserving scaling and centered cropping

## UI Components

### Selection Overlay Canvas
- Positioned absolute over the original image container
- Dimensions match original canvas (width and height)
- Z-index 10 to appear above image but below other overlays
- Transparent background with canvas drawing for selection visualization
- Disabled scroll events and pointer-events are default (canvas is interactive)

### Instruction Panel
- Container with ID `selectionInstruction`
- Shows title, user instructions, and tips
- Background gradient matching app theme
- Displayed only when selection mode is active
- Hidden when exiting selection mode

### Control Buttons
- Container with ID `selectionControls`
- Contains two buttons: Done (green/success) and Cancel (red/danger)
- Displayed only during selection mode
- Horizontally centered below image

**Done Button:**
- Keeps the current processed image as result
- Updates currentImageData with latest preview
- Exits selection mode

**Cancel Button:**
- Reverts processed image to original image data
- Does not apply any lightning effect
- Exits selection mode

## Integration with Lightning Filters

### Button Binding
Lightning filter buttons with data attributes in HTML:
- `data-filter="combine_top_bottom"` (Horizontal Split)
- `data-filter="combine_left_right"` (Vertical Split)
- `data-filter="combine_diagonal_tl_br"` (Diagonal)
- `data-filter="combine_diagonal_tr_bl"` (Diagonal)

### Event Handler
JavaScript click handler detects lightning filter buttons and calls `enterSelectionMode(filterName)` instead of immediate `applyFilter()`.

### Filter Parameter Preservation
The filter name is stored in `selectionFilter` variable but currently unused in final processing. All lightning effects use the same `combine_with_square_region()` function regardless of which filter was selected. The filter selection is preserved for potential future use (e.g., different blending modes per filter).

## Entry and Exit Conditions

### Entering Selection Mode
- User clicks a lightning filter button
- `enterSelectionMode(filterName)` is called
- Maximum square is initialized and displayed
- Initial preview is generated and displayed on processed canvas
- Instruction and control elements become visible
- Overlay event listeners are attached

### Exiting Selection Mode (Done)
- User clicks Done button
- Current processed image is retained as the result
- `currentImageData` remains updated with the processed version
- All selection UI elements are hidden
- Event listeners are removed from overlay
- Selection state variables are reset

### Exiting Selection Mode (Cancel)
- User clicks Cancel button
- Processed image is reverted to original image
- `currentImageData` is reset to `originalImageData`
- Processed canvas redisplays original image
- All selection UI elements are hidden
- Event listeners are removed from overlay
- Selection state variables are reset

## Performance Considerations

### Debounce Strategy
- 300ms debounce prevents excessive WASM calls during rapid dragging
- Without debounce, processing would trigger dozens of times per second for smooth drag
- With debounce, processing occurs only after user pauses or completes drag
- Improves responsiveness and prevents browser freezing on slow devices

### Canvas Rendering
- Selection overlay is redrawn on every mousemove event (not debounced)
- Canvas drawing operations are fast (simple shapes, no complex processing)
- Only WASM processing is debounced, not visual feedback
- Users see smooth cursor and selection outline, with delayed image processing

### Memory Management
- Original image data is preserved and never modified
- Processed image data is replaced on each update
- Event listeners are explicitly removed on exit to prevent memory leaks
- Canvas overlay DOM element is reused (not recreated) across multiple uses

## Error Handling

### Missing Image Data
- If `originalImageData` or `overlayImageData` is null, applyCombineWithSquare returns early (no error shown during preview)
- If either is missing, user sees the last valid preview (no crash)

### WASM Processing Errors
- Errors from `combine_with_square_region()` are caught in try-catch
- Error message is logged to console but not shown to user during preview
- User continues to see last valid preview or original image
- No visual disruption from processing errors

### Invalid Selection
- Minimum selection size enforced: cannot be smaller than 1 pixel due to Math.max constraints
- No validation checks needed (boundary constraints prevent invalid states)
- Selection is always valid for WASM processing

## Accessibility and Mobile Considerations

### Cursor Feedback
- Default cursor during selection (no specific resize cursor indicators)
- Future enhancement: Could add cursor: "nwse-resize" or "nesw-resize" for corner hints

### Touch Support
- Current implementation uses mouse events only (mousedown, mousemove, mouseup, mouseleave)
- Not optimized for touch devices
- Touch support would require adding touchstart, touchmove, touchend handlers
- Would need to handle touch point mapping similarly to mouse events

### Responsive Design
- Overlay canvas dimensions adapt to image display size
- Selection works on any size image (from small to very large)
- Performance may degrade on very large images (2000x2000+) due to WASM processing time
- No downsampling or optimization for large images currently implemented
