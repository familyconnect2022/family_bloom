export type MainFamilyGraphCameraPoint = { x: number; y: number };

/** Main Family Tree UI-thread camera math. Kept separate from Focus View. */
export function applyMainFamilyGraphPanDelta(
  startX: number,
  startY: number,
  translationX: number,
  translationY: number,
): MainFamilyGraphCameraPoint {
  "worklet";
  return {
    x: startX + translationX,
    y: startY + translationY,
  };
}

export function applyMainFamilyGraphPinchScale(
  startScale: number,
  gestureScale: number,
  minimumScale: number,
) {
  "worklet";
  return Math.max(minimumScale, startScale * gestureScale);
}
