export const BLOOM_MOTION = {
  screen: {
    animation: "fade_from_bottom" as const,
    duration: 190,
  },
  tabs: {
    // P2.4: bottom-tab feature surfaces switch without full-screen scene motion.
    // The tiny tabbar indicator remains Reanimated/UI-thread owned.
    animation: "none" as const,
  },
  modal: {
    animation: "fade" as const,
  },
  durations: {
    fast: 110,
    standard: 160,
    gentle: 210,
  },
} as const;
