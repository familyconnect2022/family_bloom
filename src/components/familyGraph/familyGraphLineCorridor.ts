/** GRAPH-LINE-01 Android geometry: canvas units; deterministic and read-only.
 * Never infer parenthood from a partner union or from placement on screen.
 */
export const ANDROID_LINE_METRICS = {
  parentClearance: 20,
  childClearance: 20,
  siblingGlyphRadius: 13,
  privateLabelReserve: 36,
  expansionSlack: 16,
} as const;

export type GraphCorridor = {
  y: number;
  lower: number;
  upper: number;
  requiredExtra: number;
};

export function androidMinimumGenerationStep(
  nodeHeight: number,
  labelReserve = ANDROID_LINE_METRICS.privateLabelReserve,
): number {
  return Math.max(344,
    nodeHeight + ANDROID_LINE_METRICS.parentClearance
    + ANDROID_LINE_METRICS.childClearance + labelReserve
    + 2 * ANDROID_LINE_METRICS.siblingGlyphRadius
    + ANDROID_LINE_METRICS.expansionSlack);
}

export function androidSiblingCorridor(
  parentBottom: number,
  nextChildTop: number,
  labelReserve = ANDROID_LINE_METRICS.privateLabelReserve,
): GraphCorridor {
  const lower = parentBottom + ANDROID_LINE_METRICS.parentClearance + ANDROID_LINE_METRICS.siblingGlyphRadius;
  const upper = nextChildTop - labelReserve - ANDROID_LINE_METRICS.childClearance - ANDROID_LINE_METRICS.siblingGlyphRadius;
  return {
    y: lower <= upper ? (lower + upper) / 2 : lower,
    lower,
    upper,
    requiredExtra: lower <= upper ? 0 : Math.ceil(lower - upper + ANDROID_LINE_METRICS.expansionSlack),
  };
}
export function androidSiblingJunctionX(unionX: number, childXs: readonly number[]): number {
  if (!childXs.length) return unionX;
  return Math.max(Math.min(...childXs), Math.min(unionX, Math.max(...childXs)));
}
export function androidSiblingGlyphVisible(childCount: number): boolean {
  return childCount >= 2;
}
export function androidUnionLineStyle(status: string | null | undefined): "solid" | "dashed" | "unknown" {
  if (status === "married") return "solid";
  if (status === "partner") return "dashed";
  return "unknown";
}
