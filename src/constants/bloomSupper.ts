/**
 * Shared Bloom Supper visual tokens.
 *
 * Keep visual surfaces centralized so cards, dialogs and toasts do not drift
 * into slightly different pinks/radii/shadows as features evolve.
 */
export const BLOOM_SUPPER = {
  surface: {
    card: "#FFFDFE",
    soft: "#FFF8FB",
    accent: "#FFF3F7",
    raised: "#FFFFFF",
    icon: "#FFEAF1",
  },
  border: {
    soft: "#F0DCE4",
    card: "#EBCED9",
    strong: "#EAB0C5",
    icon: "#F4CEDC",
  },
  radius: {
    card: 24,
    modal: 28,
    compact: 20,
    icon: 15,
    button: 18,
  },
  shadow: {
    color: "#A8657F",
    opacity: 0.09,
    radius: 16,
    y: 7,
    elevation: 3,
  },
  modal: {
    backdrop: "rgba(64,44,53,0.34)",
    glowPink: "rgba(244,162,190,0.17)",
    glowGold: "rgba(255,220,171,0.16)",
  },
  copy: {
    eyebrow: "FAMILY BLOOM",
  },
} as const;

export type BloomSupperTone = "default" | "soft" | "accent";
