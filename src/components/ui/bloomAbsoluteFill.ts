/** Absolute positioning object for RN 0.86 / Expo SDK 57.
 * Unlike StyleSheet.absoluteFill, this is a plain object and can be spread
 * into static StyleSheet.create entries without relying on a removed type.
 */
export const BLOOM_ABSOLUTE_FILL = Object.freeze({
  position: 'absolute' as const, left: 0, right: 0, top: 0, bottom: 0,
});
