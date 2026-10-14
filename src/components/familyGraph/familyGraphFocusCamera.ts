export type FocusCameraPoint = { x: number; y: number };

/** UI-thread safe P2.21 Focus camera math. No graph/layout clamp is applied. */
export function applyFocusPanDelta(
  startX: number,
  startY: number,
  translationX: number,
  translationY: number,
): FocusCameraPoint {
  "worklet";
  return {
    x: startX + translationX,
    y: startY + translationY,
  };
}

export function applyFocusPinchScale(startScale: number, gestureScale: number, minimumScale: number) {
  "worklet";
  return Math.max(minimumScale, startScale * gestureScale);
}
