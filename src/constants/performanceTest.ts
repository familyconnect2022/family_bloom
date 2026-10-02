import { INTERNAL_TOOLS_ENABLED } from "./buildMode";

/**
 * Performance instrumentation stays in source as a regression guard, but its
 * routes and UI are development-only. Release builds always resolve this false.
 */
export const PERFORMANCE_TEST_BUILD = INTERNAL_TOOLS_ENABLED;

/** Performance Lab is available to signed-in users only in a development build. */
export const isPerformanceTestAccount = (_email?: string | null) => INTERNAL_TOOLS_ENABLED;
