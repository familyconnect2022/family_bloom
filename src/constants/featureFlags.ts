import { getCloudFunctionsRuntimeEnabled } from "./cloudRuntimeState";
/**
 * Runtime and deployment feature switches for Family Bloom.
 *
 * Firebase Spark / Direct Mode is the default. Cloud Functions must remain
 * disabled until the backend and Cloud Rules have been explicitly deployed.
 * Keep this configuration independent of temporary UI visibility flags.
 */
export const FEATURE_FLAGS = {
  get USE_CLOUD_FUNCTIONS(): boolean { return getCloudFunctionsRuntimeEnabled(); },
  // Existing family-graph bridge capability: opt-in only.
  CROSS_FAMILY_GRAPH_BRIDGE_AVAILABLE: true,
  CROSS_FAMILY_GRAPH_BRIDGE_DEFAULT_ENABLED: false,
} as const;

/**
 * The family bulletin is deferred. Its routes, components, and data are retained
 * for a later release, but its entry points stay hidden for now.
 */
export const ENABLE_FAMILY_BULLETIN: boolean = false;
