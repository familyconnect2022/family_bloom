/**
 * Build-time boundary between internal diagnostics/test tooling and a release build.
 * React Native replaces __DEV__ at bundle time, so production releases cannot
 * expose the Performance Lab / E2E controls through normal UI or deep links.
 */
export const INTERNAL_TOOLS_ENABLED = typeof __DEV__ !== "undefined" && __DEV__;
export const RELEASE_BUILD = !INTERNAL_TOOLS_ENABLED;
