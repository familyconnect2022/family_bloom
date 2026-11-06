import type { EventType, FamilyEvent } from "../../types";

export type DaySummary = {
  eventCount: number;
  hasImportantEvent: boolean;
  hasBirthday: boolean;
  hasReminder: boolean;
  dominantType: EventType | null;
};

export type CalendarMonthProjection = {
  key: string;
  byDay: ReadonlyMap<number, readonly string[]>;
  summaries: ReadonlyMap<number, DaySummary>;
};

const EMPTY_SUMMARY: DaySummary = Object.freeze({
  eventCount: 0,
  hasImportantEvent: false,
  hasBirthday: false,
  hasReminder: false,
  dominantType: null,
});

const typeWeight: Record<EventType, number> = {
  birthday: 90,
  memorial: 80,
  anniversary: 70,
  wedding: 65,
  gathering: 60,
  travel: 50,
  family: 40,
  personal: 30,
  other: 10,
};

const sameSummary = (a: DaySummary | undefined, b: DaySummary) => !!a
  && a.eventCount === b.eventCount
  && a.hasImportantEvent === b.hasImportantEvent
  && a.hasBirthday === b.hasBirthday
  && a.hasReminder === b.hasReminder
  && a.dominantType === b.dominantType;

export const monthKey = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`;
export const dayKey = (year: number, month: number, day: number) => `${monthKey(year, month)}-${String(day).padStart(2, "0")}`;

export const buildCalendarMonthProjection = (
  events: readonly FamilyEvent[],
  year: number,
  month: number,
  previous?: CalendarMonthProjection | null,
): CalendarMonthProjection => {
  const idsByDay = new Map<number, string[]>();
  const eventsByDay = new Map<number, FamilyEvent[]>();
  for (const event of events) {
    if (event.month !== month) continue;
    if (event.year !== year && event.recurrence !== "yearly") continue;
    const ids = idsByDay.get(event.day) ?? [];
    ids.push(event.id);
    idsByDay.set(event.day, ids);
    const dayEvents = eventsByDay.get(event.day) ?? [];
    dayEvents.push(event);
    eventsByDay.set(event.day, dayEvents);
  }

  const summaries = new Map<number, DaySummary>();
  for (const [day, dayEvents] of eventsByDay) {
    let dominantType: EventType | null = null;
    let dominantWeight = -1;
    for (const event of dayEvents) {
      const weight = typeWeight[event.eventType] ?? 0;
      if (weight > dominantWeight) { dominantType = event.eventType; dominantWeight = weight; }
    }
    const next: DaySummary = {
      eventCount: dayEvents.length,
      hasImportantEvent: dayEvents.some((event) => event.notificationLevel === "important"),
      hasBirthday: dayEvents.some((event) => event.eventType === "birthday"),
      hasReminder: dayEvents.some((event) => event.notificationLevel !== "normal"),
      dominantType,
    };
    const old = previous?.summaries.get(day);
    summaries.set(day, sameSummary(old, next) ? old! : Object.freeze(next));
  }

  const byDay = new Map<number, readonly string[]>();
  for (const [day, ids] of idsByDay) {
    const old = previous?.byDay.get(day);
    const stable = old && old.length === ids.length && old.every((id, index) => id === ids[index]);
    byDay.set(day, stable ? old : Object.freeze(ids));
  }

  return Object.freeze({ key: monthKey(year, month), byDay, summaries });
};

export const getDaySummary = (projection: CalendarMonthProjection, day: number) => projection.summaries.get(day) ?? EMPTY_SUMMARY;
