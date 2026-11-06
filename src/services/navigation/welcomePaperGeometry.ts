/** Full-bleed (cover) geometry for one stationery image. The paper content has
 * a source-image-space inset INSIDE BOTH ornamental printed borders; the visible
 * intersection is clipped again to the device viewport and safe horizontal
 * margins. Nothing is positioned using arbitrary device top/margin percentages.
 */
export const WELCOME_ART = { width: 941, height: 1672 } as const;
export const WELCOME_SAFE_PAPER = { left: 128, top: 389, right: 807, bottom: 1406 } as const;

export function computeWelcomePaperGeometry(screenWidth: number, screenHeight: number) {
  const width = Number.isFinite(screenWidth) && screenWidth > 0 ? screenWidth : 360;
  const height = Number.isFinite(screenHeight) && screenHeight > 0 ? screenHeight : 720;
  // Equivalent to React Native resizeMode=cover with centered alignment.
  const scale = Math.max(width / WELCOME_ART.width, height / WELCOME_ART.height);
  const imageWidth = WELCOME_ART.width * scale;
  const imageHeight = WELCOME_ART.height * scale;
  const imageLeft = (width - imageWidth) / 2;
  const imageTop = (height - imageHeight) / 2;
  const rawLeft = imageLeft + WELCOME_SAFE_PAPER.left * scale;
  const rawRight = imageLeft + WELCOME_SAFE_PAPER.right * scale;
  const rawTop = imageTop + WELCOME_SAFE_PAPER.top * scale;
  const rawBottom = imageTop + WELCOME_SAFE_PAPER.bottom * scale;
  // 14pt padding protects text from the literal ink lines and physical display edge.
  const safeEdgeX = 17;
  const safeEdgeY = 12;
  const paperLeft = Math.max(rawLeft, safeEdgeX);
  const paperTop = Math.max(rawTop, safeEdgeY);
  const paperRight = Math.min(rawRight, width - safeEdgeX);
  const paperBottom = Math.min(rawBottom, height - safeEdgeY);
  const paperWidth = Math.max(0, paperRight - paperLeft);
  const paperHeight = Math.max(0, paperBottom - paperTop);
  // An especially narrow screen or landscape viewport cannot fit a comfortable
  // handwritten reader. Keep the COVER background and show a high-contrast card.
  const compactFallback = paperWidth < 230 || paperHeight < 295 || width > height;
  return { width,height,imageLeft,imageTop,imageWidth,imageHeight,
    paperLeft,paperTop,paperWidth,paperHeight,scale,compactFallback };
}
