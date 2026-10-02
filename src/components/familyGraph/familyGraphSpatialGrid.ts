export type FamilyGraphSpatialPoint = {
  x: number;
  y: number;
};

export type FamilyGraphSpatialRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type FamilyGraphSpatialSegment = {
  a: FamilyGraphSpatialPoint;
  b: FamilyGraphSpatialPoint;
};

export type FamilyGraphSpatialNodeEntry = {
  id: string;
  kind: "node";
  rect: FamilyGraphSpatialRect;
};

export type FamilyGraphSpatialConnectorEntry = {
  id: string;
  kind: "connector";
  familyKey: string;
  segment: FamilyGraphSpatialSegment;
};

export type FamilyGraphSpatialEntry = FamilyGraphSpatialNodeEntry | FamilyGraphSpatialConnectorEntry;

const pointKey = (point: FamilyGraphSpatialPoint) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`;

export const getSpatialSegmentBounds = (segment: FamilyGraphSpatialSegment): FamilyGraphSpatialRect => ({
  left: Math.min(segment.a.x, segment.b.x),
  top: Math.min(segment.a.y, segment.b.y),
  right: Math.max(segment.a.x, segment.b.x),
  bottom: Math.max(segment.a.y, segment.b.y),
});

export const expandSpatialRect = (rect: FamilyGraphSpatialRect, padding: number): FamilyGraphSpatialRect => ({
  left: rect.left - padding,
  top: rect.top - padding,
  right: rect.right + padding,
  bottom: rect.bottom + padding,
});

/**
 * Invisible spatial hash for Family Graph routing.
 *
 * Nodes keep their exact layout coordinates. The grid only indexes occupied
 * space so route collision checks scale with nearby geometry instead of the
 * whole family tree.
 */
export class FamilyGraphSpatialGrid {
  private readonly buckets = new Map<string, FamilyGraphSpatialEntry[]>();

  constructor(readonly cellSize: number) {}

  insertNode(id: string, rect: FamilyGraphSpatialRect) {
    this.insert({ id, kind: "node", rect }, rect);
  }

  insertConnector(id: string, familyKey: string, segment: FamilyGraphSpatialSegment) {
    this.insert(
      { id, kind: "connector", familyKey, segment },
      getSpatialSegmentBounds(segment),
    );
  }

  querySegment(segment: FamilyGraphSpatialSegment, padding = 0): FamilyGraphSpatialEntry[] {
    const bounds = expandSpatialRect(getSpatialSegmentBounds(segment), padding);
    return this.queryRect(bounds);
  }

  /**
   * Query only buckets touched by one rectangle. Phase 6.4 reuses the same
   * spatial-hash primitive for viewport culling, so a pan never scans all
   * 300/500+ people just to decide which nodes should stay mounted.
   */
  queryRect(rect: FamilyGraphSpatialRect): FamilyGraphSpatialEntry[] {
    const entries = new Map<string, FamilyGraphSpatialEntry>();
    for (const key of this.keysForRect(rect)) {
      const bucket = this.buckets.get(key);
      if (!bucket) continue;
      for (const entry of bucket) {
        const uniqueKey = entry.kind === "node"
          ? `n:${entry.id}`
          : `c:${entry.id}:${pointKey(entry.segment.a)}:${pointKey(entry.segment.b)}`;
        entries.set(uniqueKey, entry);
      }
    }
    return [...entries.values()];
  }

  private insert(entry: FamilyGraphSpatialEntry, rect: FamilyGraphSpatialRect) {
    for (const key of this.keysForRect(rect)) {
      const bucket = this.buckets.get(key) ?? [];
      bucket.push(entry);
      this.buckets.set(key, bucket);
    }
  }

  private keysForRect(rect: FamilyGraphSpatialRect) {
    const size = Math.max(24, this.cellSize);
    const minX = Math.floor(rect.left / size);
    const maxX = Math.floor(rect.right / size);
    const minY = Math.floor(rect.top / size);
    const maxY = Math.floor(rect.bottom / size);
    const keys: string[] = [];
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) keys.push(`${x}:${y}`);
    }
    return keys;
  }
}
