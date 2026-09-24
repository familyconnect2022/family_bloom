export type EventType = "birthday" | "anniversary" | "family" | "personal" | "other";
export type EventParticipantsMode = "all" | "selected";
export type EventRecurrence = "none" | "daily" | "weekly" | "monthly" | "yearly";
export type EventStatus = "today" | "upcoming" | "past";
export type EventModerationStatus = "visible" | "hidden";

/** Canonical event model returned by the service boundary. */
export interface FamilyEvent {
  id: string;
  familyId: string;
  title: string;
  /** Canonical date/time. Existing documents keep working because this field already existed. */
  dateISO: string;
  /** Local calendar key used by UI/domain logic. New writes always include it. */
  dateKey: string;
  year: number;
  month: number;
  day: number;
  allDay: boolean;
  eventType: EventType;
  participantsMode: EventParticipantsMode;
  participantIds: string[];
  /** FamilyPerson references explicitly linked to this event. */
  personIds: string[];
  recurrence: EventRecurrence;
  description: string | null;
  location: string | null;
  /** Legacy URL projection is kept for backward compatibility until media_assets migration. */
  attachments: string[];
  attachmentPublicIds: string[];
  coverAttachmentId: string | null;
  createdByUid: string;
  moderationStatus: EventModerationStatus;
  moderatedByUid: string | null;
  moderatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CreateEventInput = {
  title: string;
  dateISO: string;
  allDay?: boolean;
  eventType?: EventType;
  participantsMode?: EventParticipantsMode;
  participantIds?: string[];
  personIds?: string[];
  recurrence?: EventRecurrence;
  description?: string | null;
  location?: string | null;
  attachments?: string[];
  attachmentPublicIds?: string[];
  coverAttachmentId?: string | null;
  createdByUid: string;
};

export type UpdateEventInput = Partial<Omit<CreateEventInput, "createdByUid">>;

/** Opaque Firestore cursor. UI/hooks must never inspect provider snapshots directly. */
export type EventPageCursor = unknown;

export interface EventPage {
  items: FamilyEvent[];
  cursor: EventPageCursor | null;
  hasMore: boolean;
}
