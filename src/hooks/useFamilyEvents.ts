import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFamilyEventsRealtime } from "../context/FamilyRealtimeContext";
import { calendarService } from "../services/calendar/calendarService";
import type { EventPage, EventPageCursor, FamilyEvent } from "../types";
import { getEffectiveEventDate, mergeEventsById } from "../utils/event";

type UseFamilyEventsOptions = {
  familyId: string | null | undefined;
  viewDate: Date;
  calendarEnabled?: boolean;
  listEnabled?: boolean;
};

const EMPTY_PAGE: EventPage = { items: [], cursor: null, hasMore: false };

export const useFamilyEvents = ({
  familyId,
  viewDate,
  calendarEnabled = true,
  listEnabled = true,
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

  useEffect(() => {
    setMonthBase([]);
    setError(null);
    if (!familyId || !calendarEnabled) {
      setLoadingMonth(false);
      return;
    }
    setLoadingMonth(true);
    const subscribeMonth = useShared ? calendarService.subscribeMonthRegular : calendarService.subscribeMonth;
    return subscribeMonth(
      familyId,
      viewDate.getFullYear(),
      viewDate.getMonth() + 1,
      (items) => {
        setMonthBase(items);
        setLoadingMonth(false);
      },
      (nextError) => {
        setError(nextError);
        setLoadingMonth(false);
      },
    );
  }, [calendarEnabled, familyId, useShared, viewDate.getFullYear(), viewDate.getMonth()]);

  useEffect(() => {
    setUpcomingLocal(EMPTY_PAGE);
    setYearlyLocal([]);
    setUpcomingLoadingLocal(!!familyId && listEnabled && !useShared);
    setYearlyLoadingLocal(!!familyId && listEnabled && !useShared);
    if (!familyId || !listEnabled || useShared) return;

    const unsubUpcoming = calendarService.subscribeUpcoming(
      familyId,
      (page) => {
        setUpcomingLocal(page);
        setUpcomingLoadingLocal(false);
      },
      (nextError) => {
        setError(nextError);
        setUpcomingLoadingLocal(false);
      },
    );
    const unsubYearly = calendarService.subscribeYearly(
      familyId,
      (items) => {
        setYearlyLocal(items);
        setYearlyLoadingLocal(false);
      },
      (nextError) => {
        setError(nextError);
        setYearlyLoadingLocal(false);
      },
    );
    return () => {
      unsubUpcoming();
      unsubYearly();
    };
  }, [familyId, listEnabled, useShared]);

  useEffect(() => {
    setPastBase([]);
    setPastExtra([]);
    pastCursor.current = null;
    pastExtraCursor.current = null;
    setHasMorePast(false);
    setPastLoading(!!familyId && listEnabled);
    if (!familyId || !listEnabled) return;

    return calendarService.subscribePast(
      familyId,
      (page) => {
        setPastBase(page.items);
        pastCursor.current = page.cursor;
        if (pastExtraCursor.current) {
          setPastExtra([]);
          pastExtraCursor.current = null;
        }
        setHasMorePast(page.hasMore);
        setPastLoading(false);
      },
      (nextError) => {
        setError(nextError);
        setPastLoading(false);
      },
    );
  }, [familyId, listEnabled]);

  const upcomingPage = useShared && shared ? shared.upcomingPage : upcomingLocal;
  const yearlyEvents = useShared && shared ? shared.yearlyEvents : yearlyLocal;
  const monthEvents = useMemo(() => {
    if (!useShared) return monthBase;
    const month = viewDate.getMonth() + 1;
    return mergeEventsById(monthBase, yearlyEvents.filter((event) => event.month === month))
      .sort((a, b) => a.day - b.day || a.dateISO.localeCompare(b.dateISO));
  }, [monthBase, useShared, viewDate, yearlyEvents]);

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
      setUpcomingExtra((current) => mergeEventsById(current, page.items));
      upcomingExtraCursor.current = page.cursor;
      // When the fetched page is exhausted, keep a null cursor so future taps stop.
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
      setPastExtra((current) => mergeEventsById(current, page.items));
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
