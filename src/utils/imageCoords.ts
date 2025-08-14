/**
 * Utilities for mapping between source image pixel coordinates and viewport/screen coordinates
 * taking into account the application's pan/zoom/rotation state and devicePixelRatio.
 *
 * This file is defensive about DOM element types (Image vs Video) and avoids assuming
 * properties exist on a union type.
 */

export type TransformState = {
  panX: number;
  panY: number;
  zoom: number; // percent (100 = 1.0)
  rotation: number; // degrees
};

export function isImageElement(el: any): el is HTMLImageElement {
  return typeof el === 'object' && el !== null && 'naturalWidth' in el;
}

export function isVideoElement(el: any): el is HTMLVideoElement {
  return typeof el === 'object' && el !== null && 'videoWidth' in el;
}

export function getImageNaturalSize(img: HTMLImageElement | HTMLVideoElement) {
  if (isImageElement(img)) {
    return { width: img.naturalWidth || 0, height: img.naturalHeight || 0 };
  }
  if (isVideoElement(img)) {
    return { width: img.videoWidth || 0, height: img.videoHeight || 0 };
  }
  return { width: 0, height: 0 };
}

/**
 * Returns scale factor (image->screen) and offsets given the wrapper rect and transform state.
 * This function computes the mapping from an image's natural pixel coordinate to screen pixels
 * within the canvas-wrap area honoring the transform approach used in Viewer.vue.
 *
 * Note: The implementation intentionally avoids assuming exact CSS layout; it computes a best-effort
 * mapping based on the wrapper size and the image natural size, centering the image inside the wrapper.
 */
export function computeImageToViewportParams(
  imgEl: HTMLImageElement | HTMLVideoElement,
  wrapperRect: DOMRect,
  state: TransformState
) {
  const natural = getImageNaturalSize(imgEl);
  const natW = Math.max(1, natural.width);
  const natH = Math.max(1, natural.height);
  const imageAspect = natW / natH;

  // Compute how the image would display inside the wrapper when preserving aspect ratio
  let displayW = wrapperRect.width;
  let displayH = wrapperRect.height;
  const wrapperAspect = wrapperRect.width / wrapperRect.height;
  if (imageAspect > wrapperAspect) {
    // constrained by width
    displayW = wrapperRect.width;
    displayH = displayW / imageAspect;
  } else {
    // constrained by height
    displayH = wrapperRect.height;
    displayW = displayH * imageAspect;
  }

  const zoomFactor = Math.max(0.01, state.zoom / 100);
  const displayScaledW = displayW * zoomFactor;
  const displayScaledH = displayH * zoomFactor;

  // The image is centered in the wrapper initially; panX/panY are applied as additional translation
  const imageScreenCenterX = wrapperRect.left + wrapperRect.width / 2 + state.panX;
  const imageScreenCenterY = wrapperRect.top + wrapperRect.height / 2 + state.panY;

  // Top-left corner of the displayed (transformed) image in screen/client coordinates
  const displayLeft = imageScreenCenterX - displayScaledW / 2;
  const displayTop = imageScreenCenterY - displayScaledH / 2;

  // scale maps source-image-pixels -> screen (client) pixels
  const scale = displayScaledW / natW;

  return {
    natural: { width: natW, height: natH },
    display: { width: displayScaledW, height: displayScaledH, left: displayLeft, top: displayTop },
    scale,
    imageScreenCenterX,
    imageScreenCenterY
  };
}

/**
 * Converts a rectangle in source image pixel coordinates to screen pixels (DOM client coordinates).
 * rect: {x, y, w, h} in source image pixels.
 *
 * Returns { left, top, width, height } in client coordinates suitable for absolutely positioned overlays.
 */
export function imageRectToScreenRect(
  rect: { x: number; y: number; w: number; h: number },
  imgEl: HTMLImageElement | HTMLVideoElement,
  wrapperRect: DOMRect,
  state: TransformState
) {
  const p = computeImageToViewportParams(imgEl, wrapperRect, state);
  const { scale, display } = p;
  const left = display.left + rect.x * scale;
  const top = display.top + rect.y * scale;
  const width = rect.w * scale;
  const height = rect.h * scale;
  return { left, top, width, height };
}

/**
 * Converts a screen rectangle in client coordinates to source image pixel coordinates.
 * Accepts rectangles relative to the viewport/wrapper client coordinates.
 *
 * Returns { x, y, w, h } in source image pixels (clamped to image bounds).
 */
export function screenRectToImageRect(
  rect: { left: number; top: number; width: number; height: number },
  imgEl: HTMLImageElement | HTMLVideoElement,
  wrapperRect: DOMRect,
  state: TransformState
) {
  const p = computeImageToViewportParams(imgEl, wrapperRect, state);
  const { natural, scale, display } = p;

  const x = (rect.left - display.left) / scale;
  const y = (rect.top - display.top) / scale;
  const w = rect.width / scale;
  const h = rect.height / scale;

  // Clamp and sanitize numbers
  const clampedX = Math.max(0, Math.min(natural.width, Math.round(x)));
  const clampedY = Math.max(0, Math.min(natural.height, Math.round(y)));
  const clampedW = Math.max(0, Math.min(natural.width - clampedX, Math.round(w)));
  const clampedH = Math.max(0, Math.min(natural.height - clampedY, Math.round(h)));

  return { x: clampedX, y: clampedY, w: clampedW, h: clampedH };
}

/**
 * Map bounding boxes from one scale to another (e.g., preview->fullres).
 * boxes: Array of {x,y,w,h} in source coords of 'fromSize', returns mapped boxes for 'toSize'.
 */
export function mapBoxesBetweenScales(
  boxes: Array<{ x: number; y: number; w: number; h: number }>,
  fromSize: { w: number; h: number },
  toSize: { w: number; h: number }
) {
  const fromW = Math.max(1, fromSize.w);
  const fromH = Math.max(1, fromSize.h);
  const scaleX = toSize.w / fromW;
  const scaleY = toSize.h / fromH;
  return boxes.map(b => ({
    x: Math.round(b.x * scaleX),
    y: Math.round(b.y * scaleY),
    w: Math.round(b.w * scaleX),
    h: Math.round(b.h * scaleY)
  }));
}
