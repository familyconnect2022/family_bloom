export type HintGridPoint = { col: number; row: number };

export const HINT_REVEAL_BUDGET_MS = 96;
export const HINT_POP_MS = 44;

const sign = (value: number) => value === 0 ? 0 : value > 0 ? 1 : -1;

function isRayMove(dx: number, dy: number) {
  return dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy);
}

/**
 * Family Bloom hint scheduler.
 *
 * A fixed sub-100 ms budget is shared by the WHOLE legal-hint set. Linear rays
 * (rook/queen/bishop and Xiangqi rook/cannon directions) start in parallel;
 * only squares inside the same ray cascade outward. This prevents four rook
 * rays from becoming a long serial reveal while preserving the visual "wave" from the
 * selected piece toward farther squares.
 */
export function buildParallelHintDelays<T extends HintGridPoint>(
  source: HintGridPoint,
  targets: readonly T[],
  totalBudgetMs = HINT_REVEAL_BUDGET_MS,
  popMs = HINT_POP_MS,
) {
  const groups = new Map<string, Array<{ key: string; point: T; distance: number; order: number }>>();
  const availableStaggerMs = Math.max(0, totalBudgetMs - popMs);

  targets.forEach((point, order) => {
    const dx = point.col - source.col;
    const dy = point.row - source.row;
    const ray = isRayMove(dx, dy);
    const groupKey = ray ? `ray:${sign(dx)}:${sign(dy)}` : "jump";
    const distance = ray ? Math.max(Math.abs(dx), Math.abs(dy)) : Math.hypot(dx, dy);
    const key = `${point.col}:${point.row}`;
    const group = groups.get(groupKey) ?? [];
    group.push({ key, point, distance, order });
    groups.set(groupKey, group);
  });

  const delays = new Map<string, number>();
  for (const group of groups.values()) {
    group.sort((a, b) => a.distance - b.distance || a.order - b.order);
    const lastIndex = group.length - 1;
    group.forEach((entry, index) => {
      const delay = lastIndex <= 0 ? 0 : Math.round((index / lastIndex) * availableStaggerMs);
      delays.set(entry.key, delay);
    });
  }
  return delays;
}
