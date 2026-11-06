/** D6: true centered floating card, never a nearly full-screen sheet.
 * The Native Session Gate stage (not Android window) supplies dimensions.
 * Leave visible margins on ALL edges; footer remains outside scroll region.
 */
export function computeWelcomeModalGeometry(width: number, height: number) {
  const w = Number.isFinite(width) && width > 0 ? width : 360;
  const h = Number.isFinite(height) && height > 0 ? height : 640;
  const compact = h < 690;
  const widthMargin = compact ? 17 : 25;
  const ratio = h < 420 ? 0.78 : h < 650 ? 0.76 : 0.72;
  return {
    compact,
    readerWidth: Math.max(0, Math.min(460, w - widthMargin * 2)),
    readerHeight: Math.max(0, Math.min(590, Math.floor(h * ratio), h - 64)),
  };
}
