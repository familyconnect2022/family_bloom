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
  const useShared = !!familyId && shared?.familyId === familyId;

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
    const subscribeMonth = useShared ? calendarService.subscribeMonthRegular : calendarService.subscribeMonth;
    return subscribeSharedRealtime<FamilyEvent[]>({
      key: `planner.events.month:${familyId}:${year}:${month}:${useShared ? "regular" : "combined"}`,
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
  }, [calendarEnabled, familyId, month, useShared, year]);

  useEffect(() => {
    setUpcomingLocal(EMPTY_PAGE);
    setYearlyLocal([]);
    setUpcomingLoadingLocal(!!familyId && !useShared);
    setYearlyLoadingLocal(!!familyId && !useShared);
  }, [familyId, useShared]);

  useTabLiveEffect(runtimeTabId, (scope) => {
    if (!familyId || !listEnabled || useShared) return;
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
  }, [familyId, listEnabled, useShared]);

  useEffect(() => {
    setPastBase([]);
    setPastExtra([]);
    pastCursor.current = null;
    pastExtraCursor.current = null;
    setHasMorePast(false);
    setPastLoading(!!familyId);
  }, [familyId]);

  useTabLiveEffect(runtimeTabId, (scope) => {
    if (!familyId || !listEnabled) return;
    return subscribeSharedRealtime<EventPage>({
      key: `planner.events.past:${familyId}`,
      listenerName: "planner.events.past",
      start: (onData, onError) => calendarService.subscribePast(familyId, onData, onError),
      onData: (page) => {
        if (!scope.isCurrent()) return;
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

  const upcomingPageRaw = useShared && shared ? shared.upcomingPage : upcomingLocal;
  const yearlyEventsRaw = useShared && shared ? shared.yearlyEvents : yearlyLocal;
  const upcomingPage = useMemo<EventPage>(() => ({
    ...upcomingPageRaw,
    items: familyId ? canonicalizeFamilyEvents(familyId, upcomingPageRaw.items) : upcomingPageRaw.items,
  }), [familyId, upcomingPageRaw]);
  const yearlyEvents = useMemo(
    () => familyId ? canonicalizeFamilyEvents(familyId, yearlyEventsRaw) : yearlyEventsRaw,
    [familyId, yearlyEventsRaw],
  );
  const monthEvents = useMemo(() => {
    if (!useShared) return monthBase;
    return mergeEventsById(monthBase, yearlyEvents.filter((event) => event.month === month))
      .sort((a, b) => a.day - b.day || a.dateISO.localeCompare(b.dateISO));
  }, [monthBase, month, useShared, yearlyEvents]);

  useEffect(() => {
    setHasMoreUpcoming(upcomingPage.hasMore);
  }, [familyId, upcomingPage.hasMore]);

  useEffect(() => {
    if (!listEnabled) return;
    const nextIds = upcomingPage.items.map((item) => item.id).join("|");
    const changed = !!upcomingHeadIdsRef.current && nextIds !== upcomingHeadIdsRef.current;
    upcomingHeadIdsRef.current = nextIds;
    upcomingCursor.current = upcomingPage.cursor;
    if (changed && upcomingExtraCursor.current) {
      setUpcomingExtra([]);
      upcomingExtraCursor.current = null;
      setHasMoreUpcoming(upcomingPage.hasMore);
    }
  }, [listEnabled, upcomingPage]);

  useEffect(() => {
    setUpcomingExtra([]);
    upcomingExtraCursor.current = null;
    upcomingHeadIdsRef.current = "";
  }, [familyId]);

  const loadMoreUpcoming = useCallback(async () => {
    if (!familyId || loadingMoreUpcoming || !hasMoreUpcoming) return;
    const cursor = upcomingExtraCursor.current ?? upcomingCursor.current;
    if (!cursor) return;
    setLoadingMoreUpcoming(true);
    try {
      const page = await calendarService.listMoreUpcoming(familyId, cursor);
      setUpcomingExtra((current) => canonicalizeFamilyEvents(
        familyId,
        mergeEventsById(current, page.items),
      ));
      upcomingExtraCursor.current = page.cursor;
      setHasMoreUpcoming(page.hasMore);
    } catch (nextError) {
      setError(nextError);
    } finally {
      setLoadingMoreUpcoming(false);
    }
  }, [familyId, hasMoreUpcoming, loadingMoreUpcoming]);

  const loadMorePast = useCallback(async () => {
    if (!familyId || loadingMorePast || !hasMorePast) return;
    setLoadingMorePast(true);
    try {
      const cursor = pastExtraCursor.current ?? pastCursor.current;
      const page = await calendarService.listMorePast(familyId, cursor);
      setPastExtra((current) => canonicalizeFamilyEvents(
        familyId,
        mergeEventsById(current, page.items),
      ));
      pastExtraCursor.current = page.cursor;
      setHasMorePast(page.hasMore);
    } catch (nextError) {
      setError(nextError);
    } finally {
      setLoadingMorePast(false);
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

  const sharedListLoading = useShared && shared
    ? shared.upcomingLoading || shared.yearlyLoading
    : upcomingLoadingLocal || yearlyLoadingLocal;
  const sharedError = useShared && shared ? shared.upcomingError ?? shared.yearlyError : null;

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
    error: error ?? sharedError,
  };
};
