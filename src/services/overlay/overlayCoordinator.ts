export type OverlayPriority = "TOAST" | "BOTTOM_SHEET" | "MODAL" | "CHALLENGE" | "GAME_RESULT" | "CRITICAL";

const PRIORITY_WEIGHT: Record<OverlayPriority, number> = {
  TOAST: 10,
  BOTTOM_SHEET: 20,
  MODAL: 30,
  CHALLENGE: 40,
  GAME_RESULT: 45,
  CRITICAL: 100,
};

export type OverlayEnvelope<T = unknown> = {
  id: string;
  priority: OverlayPriority;
  payload: T;
  dedupeKey?: string;
  familyId?: string | null;
  gameId?: string | null;
  generation?: number;
  blocking?: boolean;
  createdAt: number;
};

/**
 * Small model-only coordinator. React hosts stay mounted and subscribe to their
 * own store; this class only owns ordering/dedupe/scope semantics.
 */
export class OverlayCoordinator<T = unknown> {
  private queue: OverlayEnvelope<T>[] = [];
  private current: OverlayEnvelope<T> | null = null;

  getCurrent() { return this.current; }
  getQueue() { return [...this.queue]; }

  enqueue(next: OverlayEnvelope<T>) {
    const key = next.dedupeKey;
    if (key && (this.current?.dedupeKey === key || this.queue.some((item) => item.dedupeKey === key))) return this.current;
    if (!this.current) {
      this.current = next;
      return next;
    }
    if (PRIORITY_WEIGHT[next.priority] > PRIORITY_WEIGHT[this.current.priority]) {
      this.queue.unshift(this.current);
      this.current = next;
      return next;
    }
    this.queue.push(next);
    this.queue.sort((a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] || a.createdAt - b.createdAt);
    return this.current;
  }

  dismiss(id?: string) {
    if (!this.current) return null;
    if (id && this.current.id !== id) {
      this.queue = this.queue.filter((item) => item.id !== id);
      return this.current;
    }
    this.current = this.queue.shift() ?? null;
    return this.current;
  }

  discardStaleScope(scope: { familyId?: string | null; gameId?: string | null; generation?: number }) {
    const valid = (item: OverlayEnvelope<T>) => {
      if (scope.generation != null && item.generation != null && item.generation !== scope.generation) return false;
      if (scope.familyId != null && item.familyId != null && item.familyId !== scope.familyId) return false;
      if (scope.gameId != null && item.gameId != null && item.gameId !== scope.gameId) return false;
      return true;
    };
    if (this.current && !valid(this.current)) this.current = null;
    this.queue = this.queue.filter(valid);
    if (!this.current) this.current = this.queue.shift() ?? null;
    return this.current;
  }

  reset() {
    this.current = null;
    this.queue = [];
  }
}
