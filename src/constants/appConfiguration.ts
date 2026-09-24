export const FAMILY_GRAPH_MAX_PEOPLE_DEFAULT = 80;

/**
 * Central application defaults that are safe to consume without any remote config.
 *
 * Phase 6.3 rule: these are DEFAULTS only. A future Admin-managed configuration
 * screen may resolve runtime overrides (limits, colors, theme, etc.) through a
 * dedicated config service/provider, but that future persisted schema must pass
 * the Data Safety / Decision Gate before implementation.
 */
export const APP_CONFIG_DEFAULTS = {
  familyGraph: {
    query: {
      /** Default depth for generic ancestor/descendant traversal. */
      defaultTraversalDepth: 2,
      /** Safety cap. Never hard-code this value inside query algorithms. */
      maxPeople: FAMILY_GRAPH_MAX_PEOPLE_DEFAULT,
    },
    focusSubgraph: {
      ancestorDepth: 2,
      descendantDepth: 2,
      includePartners: true,
      includeSiblings: true,
      includeCousins: false,
      /** Phase 6.3 DG-9. Future admin config can override after a confirmed schema decision. */
      maxPeople: FAMILY_GRAPH_MAX_PEOPLE_DEFAULT,
    },
    render: {
      /** Progressive mount budget for Full Tree. This does not hide data; later batches mount after interactions. */
      fullTreeInitialBatch: 96,
      fullTreeBatchSize: 64,
      /** Extra viewport area kept mounted on each side to avoid blank edges while panning. */
      viewportOverscanScreens: 0.85,
      /** Coarse camera bucket. JS render state only updates when the camera crosses one of these cells. */
      viewportCameraCellSize: 128,
      /** Spatial-hash cell used to query visible nodes. Larger than one node slot to reduce bucket churn. */
      viewportGridCellSize: 256,
    },
    relationshipComposer: {
      /** Bound visible picker chips; Admin can search the remaining Persons without mounting hundreds at once. */
      maxVisibleChoices: 48,
    },
    layout: {
      /** Safe outer gutter for an expandable genealogy canvas. */
      rowSidePadding: 96,
      /** Gap inside an atomic partner/couple visual unit. */
      partnerGap: 16,
      /** Compact gap reserved only for siblings that share the exact explicit parent set. */
      siblingUnitGap: 30,
      /** Minimum separation between independent family units in one generation. */
      familyUnitGap: 72,
      /** First generation top position on the logical canvas. */
      generationTop: 24,
      /** Phase 6.4 visual-compat: wider than Phase 6.3 without creating oversized empty corridors. */
      generationStep: 216,
      /** Free canvas space below the last generation. */
      canvasBottomPadding: 96,
      /** Collision-routing spatial hash. Keep close to one node slot for stable local routing. */
      connectorGridCellSize: 128,
    },
    threeGenerationView: {
      ancestorDepth: 1,
      descendantDepth: 1,
      includePartners: true,
      includeSiblings: true,
      includeCousins: false,
      maxPeople: FAMILY_GRAPH_MAX_PEOPLE_DEFAULT,
    },
  },
  /**
   * Reserved architecture direction only. Do not persist Admin theme/settings yet.
   * A future confirmed config domain may override colors/theme/limits at runtime.
   */
  appearance: {
    themeMode: "bloom" as const,
  },
} as const;

export type FamilyGraphQueryRuntimeConfig = {
  defaultTraversalDepth: number;
  maxPeople: number;
};

export type FamilyGraphFocusRuntimeConfig = {
  ancestorDepth: number;
  descendantDepth: number;
  includePartners: boolean;
  includeSiblings: boolean;
  includeCousins: boolean;
  maxPeople: number;
};

export const DEFAULT_FAMILY_GRAPH_QUERY_CONFIG: FamilyGraphQueryRuntimeConfig = {
  defaultTraversalDepth: APP_CONFIG_DEFAULTS.familyGraph.query.defaultTraversalDepth,
  maxPeople: APP_CONFIG_DEFAULTS.familyGraph.query.maxPeople,
};

export const DEFAULT_FAMILY_GRAPH_FOCUS_CONFIG: FamilyGraphFocusRuntimeConfig = {
  ...APP_CONFIG_DEFAULTS.familyGraph.focusSubgraph,
};

export const DEFAULT_FAMILY_GRAPH_THREE_GENERATION_CONFIG: FamilyGraphFocusRuntimeConfig = {
  ...APP_CONFIG_DEFAULTS.familyGraph.threeGenerationView,
};

export const resolveFamilyGraphQueryConfig = (
  overrides?: Partial<FamilyGraphQueryRuntimeConfig> | null,
): FamilyGraphQueryRuntimeConfig => {
  const depth = overrides?.defaultTraversalDepth ?? DEFAULT_FAMILY_GRAPH_QUERY_CONFIG.defaultTraversalDepth;
  const maxPeople = overrides?.maxPeople ?? DEFAULT_FAMILY_GRAPH_QUERY_CONFIG.maxPeople;

  return {
    defaultTraversalDepth: Number.isInteger(depth) && depth >= 0
      ? depth
      : DEFAULT_FAMILY_GRAPH_QUERY_CONFIG.defaultTraversalDepth,
    maxPeople: Number.isInteger(maxPeople) && maxPeople > 0
      ? maxPeople
      : DEFAULT_FAMILY_GRAPH_QUERY_CONFIG.maxPeople,
  };
};

export const resolveFamilyGraphFocusConfig = (
  overrides?: Partial<FamilyGraphFocusRuntimeConfig> | null,
  fallback: FamilyGraphFocusRuntimeConfig = DEFAULT_FAMILY_GRAPH_FOCUS_CONFIG,
): FamilyGraphFocusRuntimeConfig => {
  const ancestorDepth = overrides?.ancestorDepth ?? fallback.ancestorDepth;
  const descendantDepth = overrides?.descendantDepth ?? fallback.descendantDepth;
  const maxPeople = overrides?.maxPeople ?? fallback.maxPeople;

  return {
    ancestorDepth: Number.isInteger(ancestorDepth) && ancestorDepth >= 0 ? ancestorDepth : fallback.ancestorDepth,
    descendantDepth: Number.isInteger(descendantDepth) && descendantDepth >= 0 ? descendantDepth : fallback.descendantDepth,
    includePartners: overrides?.includePartners ?? fallback.includePartners,
    includeSiblings: overrides?.includeSiblings ?? fallback.includeSiblings,
    includeCousins: overrides?.includeCousins ?? fallback.includeCousins,
    maxPeople: Number.isInteger(maxPeople) && maxPeople > 0 ? maxPeople : fallback.maxPeople,
  };
};
