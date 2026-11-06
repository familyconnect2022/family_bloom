import { INTERNAL_TOOLS_ENABLED } from "./buildMode";

/** Phase 11.2B/13 internal E2E harness.
 * Never grants authorization. Firebase Auth + Firestore Rules remain authoritative.
 * Release builds always keep this disabled.
 */
export const E2E_TEST_HARNESS = {
  enabled: __DEV__ && INTERNAL_TOOLS_ENABLED,
  familyNamePrefix: "Bloom E2E",
  documentTitlePrefix: "[BLOOM-E2E]",
  cleanupAfterRun: true,
} as const;

export const isE2ETestHarnessAvailable = () => E2E_TEST_HARNESS.enabled && INTERNAL_TOOLS_ENABLED;
