import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  startAfter,
  updateDoc,
  where,
} from "@react-native-firebase/firestore";
import { getAuth } from "@react-native-firebase/auth";
import { DATA_LIMITS } from "../../constants/dataLimits";
import type {
  CreateEventInput,
  EventPage,
  EventPageCursor,
  EventParticipantsMode,
  EventModerationStatus,
  EventRecurrence,
  EventType,
  FamilyEvent,
  UpdateEventInput,
} from "../../types";
import { AppError } from "../../types/errors";
import { eventDateParts, isDateBeforeToday, mergeEventsById, parseEventDate } from "../../utils/event";
import { removeUndefinedDeep } from "../../utils/firestore";
import { FIRESTORE_PATHS } from "../firebase/firestorePaths";
import { familyGraphRepository } from "../familyGraph/familyGraphRepository";

const nowIso = () => new Date().toISOString();
const cleanNullable = (value: unknown) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length ? text : null;
};
const cleanArray = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
const unique = (values: string[]) => Array.from(new Set(values));

const normalizeType = (value: unknown): EventType =>
  value === "birthday" || value === "anniversary" || value === "personal" || value === "other" ? value : "family";
const normalizeRecurrence = (value: unknown): EventRecurrence =>
  value === "daily" || value === "weekly" || value === "monthly" || value === "yearly" ? value : "none";
const normalizeParticipantsMode = (value: unknown, participantIds: string[]): EventParticipantsMode =>
  value === "selected" || (!value && participantIds.length > 0) ? "selected" : "all";

export const normalizeFamilyEvent = (raw: Record<string, unknown>, fallbackId = "", fallbackFamilyId = ""): FamilyEvent => {
  const dateISO = typeof raw.dateISO === "string" ? raw.dateISO : nowIso();
  const parts = eventDateParts(dateISO) ?? eventDateParts(nowIso())!;
  const participantIds = unique(cleanArray(raw.participantIds));
  const participantsMode = normalizeParticipantsMode(raw.participantsMode, participantIds);
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : fallbackId,
    familyId: typeof raw.familyId === "string" && raw.familyId ? raw.familyId : fallbackFamilyId,
    title: typeof raw.title === "string" ? raw.title.trim() : "Sự kiện gia đình",
    dateISO,
    dateKey: typeof raw.dateKey === "string" && raw.dateKey ? raw.dateKey : parts.dateKey,
    year: typeof raw.year === "number" ? raw.year : parts.year,
    month: typeof raw.month === "number" ? raw.month : parts.month,
    day: typeof raw.day === "number" ? raw.day : parts.day,
    allDay: typeof raw.allDay === "boolean" ? raw.allDay : true,
    eventType: normalizeType(raw.eventType),
    participantsMode,
    participantIds: participantsMode === "selected" ? participantIds : [],
    personIds: unique(cleanArray(raw.personIds)),
    recurrence: normalizeRecurrence(raw.recurrence),
    description: cleanNullable(raw.description),
    location: cleanNullable(raw.location),
    attachments: cleanArray(raw.attachments),
    attachmentPublicIds: cleanArray(raw.attachmentPublicIds),
    coverAttachmentId: cleanNullable(raw.coverAttachmentId),
    createdByUid: typeof raw.createdByUid === "string" ? raw.createdByUid : "",
    moderationStatus: raw.moderationStatus === "hidden" ? "hidden" : "visible",
    moderatedByUid: typeof raw.moderatedByUid === "string" && raw.moderatedByUid ? raw.moderatedByUid : null,
    moderatedAt: typeof raw.moderatedAt === "string" && raw.moderatedAt ? raw.moderatedAt : null,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : nowIso(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : (typeof raw.createdAt === "string" ? raw.createdAt : nowIso()),
  };
};

const validateDate = (dateISO: string, recurrence: EventRecurrence = "none") => {
  const date = parseEventDate(dateISO);
  if (!date) throw new AppError("EVENT_INVALID_DATE", "EVENT");
  // A yearly anniversary/birthday may intentionally keep its original historical date.
  // The calendar derives the next occurrence; only one-off events must start today/future.
  if (isDateBeforeToday(date) && recurrence !== "yearly") {
    throw new AppError("EVENT_DATE_IN_PAST", "EVENT");
  }
  return date;
};

const validateParticipants = async (familyId: string, mode: EventParticipantsMode, ids: string[]) => {
  if (mode === "all") return [];
  const participantIds = unique(ids.filter(Boolean));
  if (!participantIds.length) throw new AppError("EVENT_PARTICIPANTS_REQUIRED", "EVENT");

  const db = getFirestore();
  const snapshots = await Promise.all(
    participantIds.map((uid) => getDoc(doc(db, FIRESTORE_PATHS.familyMember(familyId, uid)))),
  );
  if (snapshots.some((snapshot) => !snapshot.exists())) {
    throw new AppError("EVENT_PARTICIPANT_NOT_MEMBER", "EVENT");
  }
  return participantIds;
};

const validatePersonIds = async (familyId: string, ids: string[] | undefined) => {
  const personIds = unique((ids ?? []).map((id) => String(id).trim()).filter(Boolean)).slice(0, 24);
  if (!personIds.length) return [];
  const persons = await familyGraphRepository.listPersons(familyId);
  const available = new Set(persons.map((person) => person.id));
  if (personIds.some((id) => !available.has(id))) throw new AppError("PERSON_NOT_FOUND", "PERSON");
  return personIds;
};

const normalizeCreateInput = async (familyId: string, input: CreateEventInput) => {
  const title = input.title.trim();
  if (!title) throw new AppError("EVENT_TITLE_REQUIRED", "EVENT");
  const recurrence = normalizeRecurrence(input.recurrence);
  validateDate(input.dateISO, recurrence);
  const parts = eventDateParts(input.dateISO);
  if (!parts) throw new AppError("EVENT_INVALID_DATE", "EVENT");

  const participantsMode: EventParticipantsMode = input.participantsMode === "selected" ? "selected" : "all";
  const participantIds = await validateParticipants(familyId, participantsMode, input.participantIds ?? []);
  const personIds = await validatePersonIds(familyId, input.personIds);

  return {
    title,
    dateISO: input.dateISO,
    ...parts,
    allDay: input.allDay ?? true,
    eventType: normalizeType(input.eventType),
    participantsMode,
    participantIds,
    personIds,
    recurrence,
    description: cleanNullable(input.description),
    location: cleanNullable(input.location),
    attachments: cleanArray(input.attachments),
    attachmentPublicIds: cleanArray(input.attachmentPublicIds),
    coverAttachmentId: cleanNullable(input.coverAttachmentId),
    createdByUid: input.createdByUid,
  };
};

const pageFromSnapshot = (snapshot: { docs: Array<{ id?: string; data: () => unknown }> }, pageSize: number, familyId = ""): EventPage => {
  const items = snapshot.docs
    .map((item) => normalizeFamilyEvent(item.data() as Record<string, unknown>, item.id ?? "", familyId))
    .filter((item) => item.recurrence !== "yearly" && item.moderationStatus !== "hidden");
  return {
    items,
    cursor: snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1] as unknown : null,
    hasMore: snapshot.docs.length >= pageSize,
  };
};

const monthRangeIso = (year: number, month: number) => ({
  start: new Date(year, month - 1, 1, 0, 0, 0, 0).toISOString(),
  end: new Date(year, month, 1, 0, 0, 0, 0).toISOString(),
});


const getEventById = async (familyId: string, eventId: string): Promise<FamilyEvent | null> => {
  const snapshot = await getDoc(doc(getFirestore(), FIRESTORE_PATHS.familyEvent(familyId, eventId)));
  return snapshot.exists()
    ? normalizeFamilyEvent(snapshot.data() as Record<string, unknown>, eventId, familyId)
    : null;
};

const todayStartIso = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
};

export const eventService = {
  async create(familyId: string, input: CreateEventInput): Promise<FamilyEvent> {
    const db = getFirestore();
    const ref = doc(collection(db, FIRESTORE_PATHS.familyEvents(familyId)));
    const timestamp = nowIso();
    const clean = await normalizeCreateInput(familyId, input);
    const event: FamilyEvent = {
      ...clean,
      id: ref.id,
      familyId,
      moderationStatus: "visible",
      moderatedByUid: null,
      moderatedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await setDoc(ref, removeUndefinedDeep(event));
    return event;
  },

  async getById(familyId: string, eventId: string): Promise<FamilyEvent | null> {
    return getEventById(familyId, eventId);
  },

  subscribeById(
    familyId: string,
    eventId: string,
    onChange: (event: FamilyEvent | null) => void,
    onError?: (error: unknown) => void,
  ) {
    return onSnapshot(
      doc(getFirestore(), FIRESTORE_PATHS.familyEvent(familyId, eventId)),
      (snapshot) => onChange(snapshot.exists() ? normalizeFamilyEvent(snapshot.data() as Record<string, unknown>, eventId, familyId) : null),
      onError,
    );
  },

  subscribeForPerson(
    familyId: string,
    personId: string,
    onChange: (items: FamilyEvent[]) => void,
    onError?: (error: unknown) => void,
    pageSize = 40,
  ) {
    return onSnapshot(
      query(
        collection(getFirestore(), FIRESTORE_PATHS.familyEvents(familyId)),
        where("personIds", "array-contains", personId),
        limit(pageSize),
      ),
      (snapshot) => onChange(
        snapshot.docs
          .map((item) => normalizeFamilyEvent(item.data() as Record<string, unknown>, item.id, familyId))
          .filter((item) => item.moderationStatus !== "hidden")
          .sort((a, b) => a.dateISO.localeCompare(b.dateISO)),
      ),
      onError,
    );
  },

  /** Legacy-compatible one-shot list. Avoid using this for feeds; it intentionally remains for service compatibility. */
  async list(familyId: string): Promise<FamilyEvent[]> {
    const snapshot = await getDocs(query(collection(getFirestore(), FIRESTORE_PATHS.familyEvents(familyId)), limit(DATA_LIMITS.events.monthWindow)));
    return snapshot.docs
      .map((item) => normalizeFamilyEvent(item.data() as Record<string, unknown>, item.id, familyId))
      .filter((event) => event.moderationStatus !== "hidden");
  },

  async listByMonth(familyId: string, month: number, year = new Date().getFullYear()): Promise<FamilyEvent[]> {
    const db = getFirestore();
    const range = monthRangeIso(year, month);
    const [regularSnapshot, yearlySnapshot] = await Promise.all([
      getDocs(query(
        collection(db, FIRESTORE_PATHS.familyEvents(familyId)),
        where("dateISO", ">=", range.start),
        where("dateISO", "<", range.end),
        orderBy("dateISO", "asc"),
        limit(DATA_LIMITS.events.monthWindow),
      )),
      getDocs(query(
        collection(db, FIRESTORE_PATHS.familyEvents(familyId)),
        where("recurrence", "==", "yearly"),
        limit(DATA_LIMITS.events.yearlyRecurring),
      )),
    ]);
    const regular = regularSnapshot.docs
      .map((item) => normalizeFamilyEvent(item.data() as Record<string, unknown>, item.id, familyId))
      .filter((event) => event.moderationStatus !== "hidden");
    const yearly = yearlySnapshot.docs
      .map((item) => normalizeFamilyEvent(item.data() as Record<string, unknown>, item.id, familyId))
      .filter((event) => event.moderationStatus !== "hidden" && event.month === month);
    return mergeEventsById(regular, yearly).sort((a, b) => a.day - b.day || a.dateISO.localeCompare(b.dateISO));
  },

  /**
   * Regular month window without a second yearly listener. Phase 5.6 uses this
   * inside the tab shell and merges the shared yearly snapshot from
   * FamilyRealtimeProvider, eliminating a duplicate recurring-event listener.
   */
  subscribeMonthRegular(
    familyId: string,
    year: number,
    month: number,
    onChange: (events: FamilyEvent[]) => void,
    onError?: (error: unknown) => void,
  ) {
    const range = monthRangeIso(year, month);
    return onSnapshot(
      query(
        collection(getFirestore(), FIRESTORE_PATHS.familyEvents(familyId)),
        where("dateISO", ">=", range.start),
        where("dateISO", "<", range.end),
        orderBy("dateISO", "asc"),
        limit(DATA_LIMITS.events.monthWindow),
      ),
      (snapshot) => onChange(
        snapshot.docs
          .map((item) => normalizeFamilyEvent(item.data() as Record<string, unknown>, item.id, familyId))
          .filter((event) => event.recurrence !== "yearly" && event.moderationStatus !== "hidden")
          .sort((a, b) => a.day - b.day || a.dateISO.localeCompare(b.dateISO)),
      ),
      onError,
    );
  },

  /** Month listener stays bounded; 2,000 historical events are never materialized at once. */
  subscribeMonth(
    familyId: string,
    year: number,
    month: number,
    onChange: (events: FamilyEvent[]) => void,
    onError?: (error: unknown) => void,
  ) {
    const db = getFirestore();
    const range = monthRangeIso(year, month);
    let regular: FamilyEvent[] = [];
    let yearly: FamilyEvent[] = [];
    const emit = () => onChange(
      mergeEventsById(regular, yearly)
        .sort((a, b) => a.day - b.day || a.dateISO.localeCompare(b.dateISO)),
    );

    const unsubRegular = onSnapshot(
      query(
        collection(db, FIRESTORE_PATHS.familyEvents(familyId)),
        where("dateISO", ">=", range.start),
        where("dateISO", "<", range.end),
        orderBy("dateISO", "asc"),
        limit(DATA_LIMITS.events.monthWindow),
      ),
      (snapshot) => {
        regular = snapshot.docs
          .map((item) => normalizeFamilyEvent(item.data() as Record<string, unknown>, item.id, familyId))
          .filter((event) => event.moderationStatus !== "hidden");
        emit();
      },
      onError,
    );
    const unsubYearly = onSnapshot(
      query(
        collection(db, FIRESTORE_PATHS.familyEvents(familyId)),
        where("recurrence", "==", "yearly"),
        limit(DATA_LIMITS.events.yearlyRecurring),
      ),
      (snapshot) => {
        yearly = snapshot.docs
          .map((item) => normalizeFamilyEvent(item.data() as Record<string, unknown>, item.id, familyId))
          .filter((event) => event.moderationStatus !== "hidden" && event.month === month);
        emit();
      },
      onError,
    );
    return () => {
      unsubRegular();
      unsubYearly();
    };
  },

  subscribeUpcoming(
    familyId: string,
    onChange: (page: EventPage) => void,
    onError?: (error: unknown) => void,
    pageSize = DATA_LIMITS.events.realtimePage,
  ) {
    const q = query(
      collection(getFirestore(), FIRESTORE_PATHS.familyEvents(familyId)),
      where("dateISO", ">=", todayStartIso()),
      orderBy("dateISO", "asc"),
      limit(pageSize),
    );
    return onSnapshot(q, (snapshot) => onChange(pageFromSnapshot(snapshot, pageSize, familyId)), onError);
  },

  subscribePast(
    familyId: string,
    onChange: (page: EventPage) => void,
    onError?: (error: unknown) => void,
    pageSize = DATA_LIMITS.events.realtimePage,
  ) {
    const q = query(
      collection(getFirestore(), FIRESTORE_PATHS.familyEvents(familyId)),
      where("dateISO", "<", todayStartIso()),
      orderBy("dateISO", "desc"),
      limit(pageSize),
    );
    return onSnapshot(q, (snapshot) => onChange(pageFromSnapshot(snapshot, pageSize, familyId)), onError);
  },

  /** Yearly documents are few and shared across views; deriving occurrences avoids duplicating documents every year. */
  subscribeYearly(
    familyId: string,
    onChange: (events: FamilyEvent[]) => void,
    onError?: (error: unknown) => void,
  ) {
    return onSnapshot(
      query(
        collection(getFirestore(), FIRESTORE_PATHS.familyEvents(familyId)),
        where("recurrence", "==", "yearly"),
        limit(DATA_LIMITS.events.yearlyRecurring),
      ),
      (snapshot) => onChange(
        snapshot.docs
          .map((item) => normalizeFamilyEvent(item.data() as Record<string, unknown>, item.id, familyId))
          .filter((event) => event.moderationStatus !== "hidden"),
      ),
      onError,
    );
  },

  async listMoreUpcoming(familyId: string, cursor: EventPageCursor | null, pageSize = DATA_LIMITS.events.realtimePage): Promise<EventPage> {
    if (!cursor) return { items: [], cursor: null, hasMore: false };
    const snapshot = await getDocs(query(
      collection(getFirestore(), FIRESTORE_PATHS.familyEvents(familyId)),
      where("dateISO", ">=", todayStartIso()),
      orderBy("dateISO", "asc"),
      startAfter(cursor as never),
      limit(pageSize),
    ));
    return pageFromSnapshot(snapshot, pageSize, familyId);
  },

  async listMorePast(familyId: string, cursor: EventPageCursor | null, pageSize = DATA_LIMITS.events.realtimePage): Promise<EventPage> {
    if (!cursor) return { items: [], cursor: null, hasMore: false };
    const snapshot = await getDocs(query(
      collection(getFirestore(), FIRESTORE_PATHS.familyEvents(familyId)),
      where("dateISO", "<", todayStartIso()),
      orderBy("dateISO", "desc"),
      startAfter(cursor as never),
      limit(pageSize),
    ));
    return pageFromSnapshot(snapshot, pageSize, familyId);
  },

  async update(familyId: string, eventId: string, data: UpdateEventInput): Promise<FamilyEvent> {
    const current = await getEventById(familyId, eventId);
    if (!current) throw new AppError("EVENT_NOT_FOUND", "EVENT");
    const uid = getAuth().currentUser?.uid;
    if (!uid || current.createdByUid !== uid) throw new AppError("EVENT_NOT_OWNER", "EVENT");

    const nextDateISO = data.dateISO ?? current.dateISO;
    const nextRecurrence = data.recurrence ? normalizeRecurrence(data.recurrence) : current.recurrence;
    if (data.dateISO || data.recurrence !== undefined) validateDate(nextDateISO, nextRecurrence);
    const parts = eventDateParts(nextDateISO);
    if (!parts) throw new AppError("EVENT_INVALID_DATE", "EVENT");

    const nextMode: EventParticipantsMode = data.participantsMode ?? current.participantsMode;
    const nextIds = data.participantIds ?? current.participantIds;
    const participantIds = data.participantsMode !== undefined || data.participantIds !== undefined
      ? await validateParticipants(familyId, nextMode, nextIds)
      : current.participantIds;
    const personIds = data.personIds !== undefined
      ? await validatePersonIds(familyId, data.personIds)
      : current.personIds;

    const title = data.title !== undefined ? data.title.trim() : current.title;
    if (!title) throw new AppError("EVENT_TITLE_REQUIRED", "EVENT");

    const updated: FamilyEvent = {
      ...current,
      title,
      dateISO: nextDateISO,
      ...parts,
      allDay: data.allDay ?? current.allDay,
      eventType: data.eventType ? normalizeType(data.eventType) : current.eventType,
      participantsMode: nextMode,
      participantIds: nextMode === "selected" ? participantIds : [],
      personIds,
      recurrence: nextRecurrence,
      description: data.description !== undefined ? cleanNullable(data.description) : current.description,
      location: data.location !== undefined ? cleanNullable(data.location) : current.location,
      attachments: data.attachments !== undefined ? cleanArray(data.attachments) : current.attachments,
      attachmentPublicIds: data.attachmentPublicIds !== undefined ? cleanArray(data.attachmentPublicIds) : current.attachmentPublicIds,
      coverAttachmentId: data.coverAttachmentId !== undefined ? cleanNullable(data.coverAttachmentId) : current.coverAttachmentId,
      updatedAt: nowIso(),
    };

    await updateDoc(
      doc(getFirestore(), FIRESTORE_PATHS.familyEvent(familyId, eventId)),
      removeUndefinedDeep(updated) as unknown as Record<string, unknown>,
    );
    return updated;
  },

  async delete(familyId: string, eventId: string): Promise<void> {
    const current = await getEventById(familyId, eventId);
    if (!current) return;
    const uid = getAuth().currentUser?.uid;
    if (!uid || current.createdByUid !== uid) throw new AppError("EVENT_NOT_OWNER", "EVENT");
    await deleteDoc(doc(getFirestore(), FIRESTORE_PATHS.familyEvent(familyId, eventId)));
  },

  async setModerationStatus(
    familyId: string,
    eventId: string,
    status: EventModerationStatus,
  ): Promise<void> {
    const uid = getAuth().currentUser?.uid;
    if (!uid) throw new AppError("EVENT_MODERATION_DENIED", "EVENT");
    const timestamp = nowIso();
    await updateDoc(doc(getFirestore(), FIRESTORE_PATHS.familyEvent(familyId, eventId)), {
      moderationStatus: status,
      moderatedByUid: uid,
      moderatedAt: timestamp,
      updatedAt: timestamp,
    });
  },

  subscribeHiddenForModeration(
    familyId: string,
    onChange: (events: FamilyEvent[]) => void,
    onError?: (error: unknown) => void,
  ) {
    const q = query(
      collection(getFirestore(), FIRESTORE_PATHS.familyEvents(familyId)),
      where("moderationStatus", "==", "hidden"),
      limit(DATA_LIMITS.events.realtimePage),
    );
    return onSnapshot(
      q,
      (snapshot) => onChange(
        snapshot.docs
          .map((item) => normalizeFamilyEvent(item.data() as Record<string, unknown>, item.id, familyId))
          .sort((a, b) => (b.moderatedAt || b.updatedAt).localeCompare(a.moderatedAt || a.updatedAt)),
      ),
      onError,
    );
  },

  mergePages(...groups: FamilyEvent[][]) {
    return mergeEventsById(...groups);
  },
};
