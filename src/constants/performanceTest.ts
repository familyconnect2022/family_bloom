import { INTERNAL_TOOLS_ENABLED } from "./buildMode";

export const PERFORMANCE_TEST_BUILD = INTERNAL_TOOLS_ENABLED;
export const FAMILY_BLOOM_DEV_EMAIL = "huynh235@gmail.com";

/** Internal tools are available only in Debug/internal builds to the dedicated developer account. */
export const isPerformanceTestAccount = (email?: string | null) =>
  INTERNAL_TOOLS_ENABLED && (email ?? "").trim().toLowerCase() === FAMILY_BLOOM_DEV_EMAIL;
