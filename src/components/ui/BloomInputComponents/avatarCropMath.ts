/** Shared geometry for the live avatar preview and the exported JPEG.
 * Coordinates are in original (EXIF-corrected ImagePicker) image pixels.
 */
export const AVATAR_BOX = 280;
export const AVATAR_OUTPUT = 512;
export type AvatarOffset = { x: number; y: number };
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function avatarCover(width: number, height: number, zoom = 1, box = AVATAR_BOX) {
  const w = Math.max(1, width), h = Math.max(1, height);
  const scale = Math.max(box / w, box / h) * clamp(zoom, 1, 4);
  return { scale, width: w * scale, height: h * scale };
}
export function constrainAvatarOffset(width: number, height: number, zoom: number, point: AvatarOffset, box = AVATAR_BOX): AvatarOffset {
  const cover = avatarCover(width, height, zoom, box);
  return {
    x: clamp(point.x, -(cover.width - box) / 2, (cover.width - box) / 2),
    y: clamp(point.y, -(cover.height - box) / 2, (cover.height - box) / 2),
  };
}
export function avatarCropRect(width: number, height: number, zoom: number, offset: AvatarOffset, box = AVATAR_BOX) {
  const w = Math.max(1, width), h = Math.max(1, height);
  const { scale } = avatarCover(w, h, zoom, box);
  const safe = constrainAvatarOffset(w, h, zoom, offset, box);
  const side = Math.min(w, h, box / scale);
  // Keep fractional coordinates until the very end; rounding too early can shift a face.
  const pixels = Math.max(1, Math.min(Math.floor(w), Math.floor(h), Math.round(side)));
  return {
    originX: Math.round(clamp((w - pixels) / 2 - safe.x / scale, 0, w - pixels)),
    originY: Math.round(clamp((h - pixels) / 2 - safe.y / scale, 0, h - pixels)),
    width: pixels,
    height: pixels,
  };
}
