import type { EventStatus, FamilyEvent } from "../types/event";

export const startOfLocalDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const parseEventDate = (dateISO: string) => {
  const date = new Date(dateISO);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const eventDateParts = (dateISO: string) => {
  const date = parseEventDate(dateISO);
  if (!date) return null;
  return {
    dateKey: toDateKey(date),
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
};

export const isDateBeforeToday = (date: Date, now = new Date()) =>
  startOfLocalDay(date).getTime() < startOfLocalDay(now).getTime();

/**
 * A yearly event is represented by one canonical document. For rendering we derive
 * the occurrence relevant to the current year/next year instead of duplicating documents.
 */
export const getEffectiveEventDate = (event: FamilyEvent, now = new Date()) => {
  const source = parseEventDate(event.dateISO) ?? now;
  if (event.recurrence !== "yearly") return source;

  const thisYear = new Date(
    now.getFullYear(),
    source.getMonth(),
    source.getDate(),
    event.allDay ? 12 : source.getHours(),
    event.allDay ? 0 : source.getMinutes(),
    0,
    0,
  );
  if (startOfLocalDay(thisYear).getTime() >= startOfLocalDay(now).getTime()) return thisYear;
  return new Date(
    now.getFullYear() + 1,
    source.getMonth(),
    source.getDate(),
    event.allDay ? 12 : source.getHours(),
    event.allDay ? 0 : source.getMinutes(),
    0,
    0,
  );
};

export const getEventStatus = (event: FamilyEvent, now = new Date()): EventStatus => {
  const effective = event.recurrence === "yearly" ? getEffectiveEventDate(event, now) : (parseEventDate(event.dateISO) ?? now);
  const eventDay = startOfLocalDay(effective).getTime();
  const today = startOfLocalDay(now).getTime();
  if (eventDay === today) return "today";
  return eventDay > today ? "upcoming" : "past";
};

export const formatEventDate = (event: FamilyEvent, now = new Date()) => {
  const date = event.recurrence === "yearly" ? getEffectiveEventDate(event, now) : (parseEventDate(event.dateISO) ?? now);
  const dateText = `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  if (event.allDay) return dateText;
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  return `${time} · ${dateText}`;
};

export const mergeEventsById = (...groups: FamilyEvent[][]) => {
  const map = new Map<string, FamilyEvent>();
  groups.flat().forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
};
