import type { MomentPost } from "../types/moments";

export type MomentTimelineRow = {
  moment: MomentPost;
  showDayHeader: boolean;
  dayKey: string;
};

export type MomentTimelineSection = {
  key: string;
  year: string;
  month: number;
  showYear: boolean;
  data: MomentTimelineRow[];
};

/**
 * Shared adaptive Year → Month → Day projection used by the real Timeline and
 * the RAM-only Phase 10 stress harness. It never creates empty time buckets.
 */
export function buildMomentTimelineSections(items: MomentPost[]): MomentTimelineSection[] {
  const sorted = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const dayCounts = new Map<string, number>();
  sorted.forEach((item) => {
    const key = item.createdAt.slice(0, 10);
    dayCounts.set(key, (dayCounts.get(key) || 0) + 1);
  });

  const map = new Map<string, MomentTimelineRow[]>();
  sorted.forEach((moment) => {
    const date = new Date(moment.createdAt);
    const valid = Number.isFinite(date.getTime());
    const year = valid ? String(date.getFullYear()) : moment.createdAt.slice(0, 4) || "—";
    const month = valid ? date.getMonth() + 1 : Number(moment.createdAt.slice(5, 7)) || 1;
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const dayKey = moment.createdAt.slice(0, 10);
    const list = map.get(key) || [];
    list.push({
      moment,
      dayKey,
      showDayHeader: (dayCounts.get(dayKey) || 0) > 1 && !list.some((entry) => entry.dayKey === dayKey),
    });
    map.set(key, list);
  });

  let previousYear = "";
  return [...map.entries()].map(([key, data]) => {
    const [year, monthRaw] = key.split("-");
    const showYear = year !== previousYear;
    previousYear = year;
    return { key, year, month: Number(monthRaw), showYear, data };
  });
}
