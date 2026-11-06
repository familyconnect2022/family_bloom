/**
 * Backward-compatible z-order constants for non-Focus root overlays.
 * P2.18 keeps Family Graph Focus inside the Phả hệ route, so root ordering no
 * longer owns a Focus surface.
 */
export const BLOOM_SURFACE_LAYER = {
  game: 9000,
  modal: 9300,
  globalOverlay: 9600,
} as const;

export type BloomSurfaceLayer = keyof typeof BLOOM_SURFACE_LAYER;
