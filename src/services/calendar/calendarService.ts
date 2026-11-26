import type { CreateEventInput, UpdateEventInput } from "../../types";
import { eventService } from "../event/eventService";

/** Calendar stays a thin facade so event domain logic has a single source of truth. */
export const calendarService = {
  newEventId: (familyId: string) => eventService.newEventId(familyId),
  createEvent: (familyId: string, input: CreateEventInput, id?: string) => eventService.create(familyId, input, id),
  getEvent: (familyId: string, eventId: string) => eventService.getById(familyId, eventId),
  subscribeEvent: eventService.subscribeById,
  listEvents: (familyId: string) => eventService.list(familyId),
  listMonth: (familyId: string, month: number, year?: number) => eventService.listByMonth(familyId, month, year),
  subscribeMonth: eventService.subscribeMonth,
  subscribeMonthRegular: eventService.subscribeMonthRegular,
  subscribeUpcoming: eventService.subscribeUpcoming,
  subscribePast: eventService.subscribePast,
  subscribeYearly: eventService.subscribeYearly,
  listMoreUpcoming: eventService.listMoreUpcoming,
  listMorePast: eventService.listMorePast,
  updateEvent: (familyId: string, eventId: string, data: UpdateEventInput) => eventService.update(familyId, eventId, data),
  deleteEvent: (familyId: string, eventId: string) => eventService.delete(familyId, eventId),
};
