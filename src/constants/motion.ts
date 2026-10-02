export const BLOOM_MOTION = {
  screen: {
    animation: "fade_from_bottom" as const,
    duration: 190,
  },
  tabs: {
    // Tabs are used constantly; instant switching feels lighter than replaying a fade every time.
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
