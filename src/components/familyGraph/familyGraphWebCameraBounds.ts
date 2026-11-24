/** Native UI-thread counterpart of Web clampGraphCamera.
 * Keep the actual person-bounding-box inside the viewport for pan/pinch/fit.
 * The native renderer applies scale about the logical canvas center, then pan:
 * screen = canvasCenter + translate + scale * (node - canvasCenter).
 * This is transform-only; it never changes node/connector layout or Firestore.
 */
export type NativeGraphCameraBounds = { left: number; top: number; right: number; bottom: number };
export type NativeGraphCameraTranslate = { x: number; y: number };
export function clampNativeFamilyGraphPan(
  panX: number, panY: number, scale: number,
  viewportWidth: number, viewportHeight: number,
  canvasWidth: number, canvasHeight: number,
  bounds: NativeGraphCameraBounds, margin = 36,
): NativeGraphCameraTranslate {
  'worklet';
  if (viewportWidth <= 0 || viewportHeight <= 0 || scale <= 0
    || !Number.isFinite(scale) || bounds.right <= bounds.left || bounds.bottom <= bounds.top) {
    return { x: panX, y: panY };
  }
  const axis = (pan: number, min: number, max: number, viewport: number, center: number) => {
    'worklet';
    const safe = Math.min(margin, viewport * 0.15);
    const a = center + scale * (min - center);
    const b = center + scale * (max - center);
    const width = (max - min) * scale;
    // Small trees must be centered, otherwise the user can drag them away.
    if (width <= viewport - 2 * safe) return viewport / 2 - (a + b) / 2;
    return Math.max(viewport - safe - b, Math.min(safe - a, pan));
  };
  return {
    x: axis(panX, bounds.left, bounds.right, viewportWidth, canvasWidth / 2),
    y: axis(panY, bounds.top, bounds.bottom, viewportHeight, canvasHeight / 2),
  };
}
