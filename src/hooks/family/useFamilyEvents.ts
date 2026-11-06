import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFamilyEventsRealtime } from "../../context/FamilyRealtimeContext";
import { useTabLiveEffect, type MainTabId } from "../../context/TabRuntimeContext";
import { calendarService } from "../../services/calendar/calendarService";
import { subscribeSharedRealtime } from "../../services/realtime/sharedRealtimeRegistry";
import { canonicalizeFamilyEvents, canonicalizeFamilyEventsStable } from "../../services/event/eventEntityCache";
import type { EventPage, EventPageCursor, FamilyEvent } from "../../types";
import { getEffectiveEventDate, mergeEventsById } from "../../utils/event";

type UseFamilyEventsOptions = {
  familyId: string | null | undefined;
  viewDate: Date;
  calendarEnabled?: boolean;
  listEnabled?: boolean;
  runtimeTabId?: MainTabId;
};

const EMPTY_PAGE: EventPage = { items: [], cursor: null, hasMore: false };
const PLANNER_REALTIME_KEEP_ALIVE_MS = 1800;

const sameEventList = (current: FamilyEvent[], next: FamilyEvent[]) =>
  current.length === next.length
  && current.every((event, index) => {
    const candidate = next[index];
    return event.id === candidate?.id
      && event.updatedAt === candidate.updatedAt
      && event.moderationStatus === candidate.moderationStatus;
  });

const keepEventList = (current: FamilyEvent[], next: FamilyEvent[]) =>
  sameEventList(current, next) ? current : next;

const keepEventPage = (current: EventPage, next: EventPage) =>
  current.hasMore === next.hasMore && sameEventList(current.items, next.items)
    ? current
    : next;

export const useFamilyEvents = ({
  familyId,
  viewDate,
  calendarEnabled = true,
  listEnabled = true,
  runtimeTabId = "planner",
}: UseFamilyEventsOptions) => {
  const shared = useFamilyEventsRealtime();
  const sharedMatches = !!familyId && shared?.familyId === familyId;

  const [monthBase, setMonthBase] = useState<FamilyEvent[]>([]);
  const [upcomingLocal, setUpcomingLocal] = useState<EventPage>(EMPTY_PAGE);
  const [yearlyLocal, setYearlyLocal] = useState<FamilyEvent[]>([]);
  const [pastBase, setPastBase] = useState<FamilyEvent[]>([]);
  const [upcomingExtra, setUpcomingExtra] = useState<FamilyEvent[]>([]);
  const [pastExtra, setPastExtra] = useState<FamilyEvent[]>([]);
  const [loadingMonth, setLoadingMonth] = useState(!!familyId && calendarEnabled);
  const [upcomingLoadingLocal, setUpcomingLoadingLocal] = useState(false);
  const [yearlyLoadingLocal, setYearlyLoadingLocal] = useState(false);
  const [pastLoading, setPastLoading] = useState(false);
  const [loadingMoreUpcoming, setLoadingMoreUpcoming] = useState(false);
  const [loadingMorePast, setLoadingMorePast] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [hasMoreUpcoming, setHasMoreUpcoming] = useState(false);
  const [hasMorePast, setHasMorePast] = useState(false);

  const upcomingCursor = useRef<EventPageCursor | null>(null);
  const pastCursor = useRef<EventPageCursor | null>(null);
  const upcomingExtraCursor = useRef<EventPageCursor | null>(null);
  const pastExtraCursor = useRef<EventPageCursor | null>(null);
  const upcomingHeadIdsRef = useRef("");
  const pastHeadIdsRef = useRef("");
  const upcomingHeadVersionRef = useRef(0);
  const pastHeadVersionRef = useRef(0);
  const activeFamilyRef = useRef<string | null | undefined>(familyId);
  const upcomingLoadRef = useRef(false);
  const pastLoadRef = useRef(false);
  activeFamilyRef.current = familyId;
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth() + 1;

  // Phase 17.8: keep the last month snapshot warm while the user switches
  // between Calendar/List modes. Only a real family/month change invalidates it.
  // This prevents mode toggles from blanking the list and rebuilding the month
  // immediately before the listener reconnects.
  useEffect(() => {
    setMonthBase([]);
    setError(null);
    setLoadingMonth(!!familyId);
  }, [familyId, month, year]);

  useTabLiveEffect(runtimeTabId, (scope) => {
    if (!familyId || !calendarEnabled) return;
    const subscribeMonth = calendarService.subscribeMonthRegular;
    return subscribeSharedRealtime<FamilyEvent[]>({
      key: `planner.events.month:${familyId}:${year}:${month}:regular`,
      listenerName: "planner.events.month",
      start: (onData, onError) => subscribeMonth(familyId, year, month, onData, onError),
      onData: (items) => {
        if (!scope.isCurrent()) return;
        setMonthBase((current) => canonicalizeFamilyEventsStable(familyId, current, items));
        setLoadingMonth(false);
      },
      onError: (nextError) => {
        if (!scope.isCurrent()) return;
        setError(nextError);
        setLoadingMonth(false);
      },
      keepAliveMs: PLANNER_REALTIME_KEEP_ALIVE_MS,
    });
  }, [calendarEnabled, familyId, month, year]);

  useEffect(() => {
    const cachedUpcoming = sharedMatches && shared ? shared.upcomingPage : EMPTY_PAGE;
    const cachedYearly = sharedMatches && shared ? shared.yearlyEvents : [];
    setUpcomingLocal(cachedUpcoming);
    setYearlyLocal(cachedYearly);
    setUpcomingLoadingLocal(!!familyId && cachedUpcoming.items.length === 0);
    setYearlyLoadingLocal(!!familyId && cachedYearly.length === 0);
  }, [familyId, shared, sharedMatches]);

  useTabLiveEffect(runtimeTabId, (scope) => {
    if (!familyId || !listEnabled) return;
    const stopUpcoming = subscribeSharedRealtime<EventPage>({
      key: `planner.events.upcoming_local:${familyId}`,
      listenerName: "planner.events.upcoming_local",
      start: (onData, onError) => calendarService.subscribeUpcoming(familyId, onData, onError),
      onData: (page) => {
        if (!scope.isCurrent()) return;
        setUpcomingLocal((current) => {
          const items = canonicalizeFamilyEventsStable(familyId, current.items, page.items);
          return current.hasMore === page.hasMore && current.items === items
            ? current
            : { ...page, items };
        });
        setUpcomingLoadingLocal(false);
      },
      onError: (nextError) => {
        if (!scope.isCurrent()) return;
        setError(nextError);
        setUpcomingLoadingLocal(false);
      },
      keepAliveMs: PLANNER_REALTIME_KEEP_ALIVE_MS,
    });
    const stopYearly = subscribeSharedRealtime<FamilyEvent[]>({
      key: `planner.events.yearly_local:${familyId}`,
      listenerName: "planner.events.yearly_local",
      start: (onData, onError) => calendarService.subscribeYearly(familyId, onData, onError),
      onData: (items) => {
        if (!scope.isCurrent()) return;
        setYearlyLocal((current) => canonicalizeFamilyEventsStable(familyId, current, items));
        setYearlyLoadingLocal(false);
      },
      onError: (nextError) => {
        if (!scope.isCurrent()) return;
        setError(nextError);
        setYearlyLoadingLocal(false);
      },
      keepAliveMs: PLANNER_REALTIME_KEEP_ALIVE_MS,
    });
    return () => {
      stopUpcoming();
      stopYearly();
    };
  }, [familyId, listEnabled]);

  useEffect(() => {
    setPastBase([]);
    setPastExtra([]);
    pastCursor.current = null;
    pastExtraCursor.current = null;
    setHasMorePast(false);
    setPastLoading(!!familyId);
    setLoadingMoreUpcoming(false);
    setLoadingMorePast(false);
    setUpcomingExtra([]);
    upcomingExtraCursor.current = null;
    upcomingHeadIdsRef.current = "";
    upcomingLoadRef.current = false;
    pastLoadRef.current = false;
    upcomingHeadVersionRef.current += 1;
    pastHeadVersionRef.current += 1;
    pastHeadIdsRef.current = "";
  }, [familyId]);

  useTabLiveEffect(runtimeTabId, (scope) => {
    if (!familyId || !listEnabled) return;
    return subscribeSharedRealtime<EventPage>({
      key: `planner.events.past:${familyId}`,
      listenerName: "planner.events.past",
      start: (onData, onError) => calendarService.subscribePast(familyId, onData, onError),
      onData: (page) => {
        if (!scope.isCurrent()) return;
        const nextHeadIds = page.items.map((item) => item.id).join("|");
        if (pastHeadIdsRef.current && pastHeadIdsRef.current !== nextHeadIds) pastHeadVersionRef.current += 1;
        pastHeadIdsRef.current = nextHeadIds;
        setPastBase((current) => canonicalizeFamilyEventsStable(familyId, current, page.items));
        pastCursor.current = page.cursor;
        if (pastExtraCursor.current) {
          setPastExtra([]);
          pastExtraCursor.current = null;
        }
        setHasMorePast(page.hasMore);
        setPastLoading(false);
      },
      onError: (nextError) => {
        if (!scope.isCurrent()) return;
        setError(nextError);
        setPastLoading(false);
      },
      keepAliveMs: PLANNER_REALTIME_KEEP_ALIVE_MS,
    });
  }, [familyId, listEnabled]);

  const upcomingPageRaw = upcomingLocal;
  const yearlyEventsRaw = yearlyLocal;
  const upcomingPage = useMemo<EventPage>(() => ({
    ...upcomingPageRaw,
    items: familyId ? canonicalizeFamilyEvents(familyId, upcomingPageRaw.items) : upcomingPageRaw.items,
  }), [familyId, upcomingPageRaw]);
  const yearlyEvents = useMemo(
    () => familyId ? canonicalizeFamilyEvents(familyId, yearlyEventsRaw) : yearlyEventsRaw,
    [familyId, yearlyEventsRaw],
  );
  const monthEvents = useMemo(() => mergeEventsById(
    monthBase,
    yearlyEvents.filter((event) => event.month === month),
  ).sort((a, b) => a.day - b.day || a.dateISO.localeCompare(b.dateISO)), [monthBase, month, yearlyEvents]);

  useEffect(() => {
    setHasMoreUpcoming(upcomingPage.hasMore);
  }, [familyId, upcomingPage.hasMore]);

  useEffect(() => {
    if (!listEnabled) return;
    const nextIds = upcomingPage.items.map((item) => item.id).join("|");
    const changed = !!upcomingHeadIdsRef.current && nextIds !== upcomingHeadIdsRef.current;
    if (changed) upcomingHeadVersionRef.current += 1;
    upcomingHeadIdsRef.current = nextIds;
    upcomingCursor.current = upcomingPage.cursor;
    if (changed && upcomingExtraCursor.current) {
      setUpcomingExtra([]);
      upcomingExtraCursor.current = null;
      setHasMoreUpcoming(upcomingPage.hasMore);
    }
  }, [listEnabled, upcomingPage]);

  const loadMoreUpcoming = useCallback(async () => {
    if (!familyId || loadingMoreUpcoming || upcomingLoadRef.current || !hasMoreUpcoming) return;
    const cursor = upcomingExtraCursor.current ?? upcomingCursor.current;
    if (!cursor) return;
    const requestFamilyId = familyId;
    const requestHeadVersion = upcomingHeadVersionRef.current;
    upcomingLoadRef.current = true;
    setLoadingMoreUpcoming(true);
    try {
      const page = await calendarService.listMoreUpcoming(requestFamilyId, cursor);
      if (activeFamilyRef.current !== requestFamilyId || upcomingHeadVersionRef.current !== requestHeadVersion) return;
      setUpcomingExtra((current) => canonicalizeFamilyEvents(
        requestFamilyId,
        mergeEventsById(current, page.items),
      ));
      upcomingExtraCursor.current = page.cursor;
      setHasMoreUpcoming(page.hasMore);
    } catch (nextError) {
      if (activeFamilyRef.current === requestFamilyId && upcomingHeadVersionRef.current === requestHeadVersion) setError(nextError);
    } finally {
      if (activeFamilyRef.current === requestFamilyId) {
        upcomingLoadRef.current = false;
        setLoadingMoreUpcoming(false);
      }
    }
  }, [familyId, hasMoreUpcoming, loadingMoreUpcoming]);

  const loadMorePast = useCallback(async () => {
    if (!familyId || loadingMorePast || pastLoadRef.current || !hasMorePast) return;
    const requestFamilyId = familyId;
    const requestHeadVersion = pastHeadVersionRef.current;
    pastLoadRef.current = true;
    setLoadingMorePast(true);
    try {
      const cursor = pastExtraCursor.current ?? pastCursor.current;
      const page = await calendarService.listMorePast(requestFamilyId, cursor);
      if (activeFamilyRef.current !== requestFamilyId || pastHeadVersionRef.current !== requestHeadVersion) return;
      setPastExtra((current) => canonicalizeFamilyEvents(
        requestFamilyId,
        mergeEventsById(current, page.items),
      ));
      pastExtraCursor.current = page.cursor;
      setHasMorePast(page.hasMore);
    } catch (nextError) {
      if (activeFamilyRef.current === requestFamilyId && pastHeadVersionRef.current === requestHeadVersion) setError(nextError);
    } finally {
      if (activeFamilyRef.current === requestFamilyId) {
        pastLoadRef.current = false;
        setLoadingMorePast(false);
      }
    }
  }, [familyId, hasMorePast, loadingMorePast]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return mergeEventsById(upcomingPage.items, upcomingExtra, yearlyEvents)
      .filter((event) => getEffectiveEventDate(event, now).getTime() >= new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime())
      .sort((a, b) => getEffectiveEventDate(a, now).getTime() - getEffectiveEventDate(b, now).getTime());
  }, [upcomingExtra, upcomingPage.items, yearlyEvents]);

  const pastEvents = useMemo(() => mergeEventsById(pastBase, pastExtra)
    .filter((event) => event.recurrence !== "yearly")
    .sort((a, b) => b.dateISO.localeCompare(a.dateISO)), [pastBase, pastExtra]);

  const sharedListLoading = upcomingLoadingLocal || yearlyLoadingLocal;

  return {
    monthEvents,
    upcomingEvents,
    pastEvents,
    loadingMonth,
    loadingList: listEnabled && (pastLoading || sharedListLoading),
    loadingMoreUpcoming,
    loadingMorePast,
    hasMoreUpcoming,
    hasMorePast,
    loadMoreUpcoming,
    loadMorePast,
    error,
  };
};
