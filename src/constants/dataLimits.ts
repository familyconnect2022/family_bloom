/**
 * Small, explicit page budgets keep Family Bloom responsive as family history grows.
 * Screens should render windows/pages instead of materializing an entire collection.
 */
export const DATA_LIMITS = {
  events: {
    realtimePage: 24,
    monthWindow: 250,
    yearlyRecurring: 120,
  },
  dashboard: {
    upcomingEvents: 4,
    recentMoments: 4,
    visibleMembers: 6,
  },
  moments: {
    initialFeed: 18,
    pageSize: 18,
    commentsPage: 12,
    reactionsPage: 30,
  },
} as const;
