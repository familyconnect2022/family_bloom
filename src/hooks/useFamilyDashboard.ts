import { useEffect, useMemo, useState } from "react";
import { DATA_LIMITS } from "../constants/dataLimits";
import { useFamilyEventsRealtime, useFamilyMomentsRealtime } from "../context/FamilyRealtimeContext";
import { calendarService } from "../services/calendar/calendarService";
import { momentsService } from "../services/moments/momentsService";
import type { FamilyEvent, MomentPost } from "../types";
import { getEffectiveEventDate, mergeEventsById } from "../utils/event";
import { useFamilyMembers } from "./useFamilyMembers";

/**
 * Tiny Home projection. When the active-family cache is available it derives from FamilyRealtimeProvider,
 * so opening Home no longer creates duplicate member / Moment / upcoming-event listeners.
 */
export const useFamilyDashboard = (familyId: string | null | undefined) => {
  const sharedEvents = useFamilyEventsRealtime();
  const sharedMoments = useFamilyMomentsRealtime();
  const useSharedEvents = !!familyId && sharedEvents?.familyId === familyId;
  const useSharedMoments = !!familyId && sharedMoments?.familyId === familyId;
  const { members, memberByUid, loading: membersLoading, error: membersError } = useFamilyMembers(familyId);

  const [upcomingBaseLocal, setUpcomingBaseLocal] = useState<FamilyEvent[]>([]);
  const [yearlyEventsLocal, setYearlyEventsLocal] = useState<FamilyEvent[]>([]);
  const [upcomingHasMoreLocal, setUpcomingHasMoreLocal] = useState(false);
  const [recentMomentsLocal, setRecentMomentsLocal] = useState<MomentPost[]>([]);
  const [momentsHaveMoreLocal, setMomentsHaveMoreLocal] = useState(false);
  const [eventsLoadingLocal, setEventsLoadingLocal] = useState(!!familyId);
  const [yearlyLoadingLocal, setYearlyLoadingLocal] = useState(!!familyId);
  const [momentsLoadingLocal, setMomentsLoadingLocal] = useState(!!familyId);
  const [errorLocal, setErrorLocal] = useState<unknown>(null);

  useEffect(() => {
    setUpcomingBaseLocal([]);
    setUpcomingHasMoreLocal(false);
    setEventsLoadingLocal(!!familyId && !useSharedEvents);
    setErrorLocal(null);
    if (!familyId || useSharedEvents) return;

    return calendarService.subscribeUpcoming(
      familyId,
      (page) => {
        setUpcomingBaseLocal(page.items);
        setUpcomingHasMoreLocal(page.hasMore);
        setEventsLoadingLocal(false);
      },
      (nextError) => {
        setErrorLocal(nextError);
        setEventsLoadingLocal(false);
      },
      DATA_LIMITS.dashboard.upcomingEvents,
    );
  }, [familyId, useSharedEvents]);

  useEffect(() => {
    setYearlyEventsLocal([]);
    setYearlyLoadingLocal(!!familyId && !useSharedEvents);
    if (!familyId || useSharedEvents) return;

    return calendarService.subscribeYearly(
      familyId,
      (items) => {
        setYearlyEventsLocal(items);
        setYearlyLoadingLocal(false);
      },
      (nextError) => {
        setErrorLocal(nextError);
        setYearlyLoadingLocal(false);
      },
    );
  }, [familyId, useSharedEvents]);

  useEffect(() => {
    setRecentMomentsLocal([]);
    setMomentsHaveMoreLocal(false);
    setMomentsLoadingLocal(!!familyId && !useSharedMoments);
    if (!familyId || useSharedMoments) return;

    return momentsService.subscribeLatest(
      familyId,
      (page) => {
        setRecentMomentsLocal(page.items);
        setMomentsHaveMoreLocal(page.hasMore);
        setMomentsLoadingLocal(false);
      },
      (nextError) => {
        setErrorLocal(nextError);
        setMomentsLoadingLocal(false);
      },
      DATA_LIMITS.dashboard.recentMoments,
    );
  }, [familyId, useSharedMoments]);

  const upcomingBase = useSharedEvents && sharedEvents ? sharedEvents.upcomingPage.items : upcomingBaseLocal;
  const yearlyEvents = useSharedEvents && sharedEvents ? sharedEvents.yearlyEvents : yearlyEventsLocal;
  const recentMoments = (useSharedMoments && sharedMoments ? sharedMoments.page.items : recentMomentsLocal)
    .slice(0, DATA_LIMITS.dashboard.recentMoments);
  const upcomingHasMoreBase = useSharedEvents && sharedEvents ? sharedEvents.upcomingPage.hasMore : upcomingHasMoreLocal;
  const momentsHaveMore = useSharedMoments && sharedMoments
    ? sharedMoments.page.hasMore || sharedMoments.page.items.length > DATA_LIMITS.dashboard.recentMoments
    : momentsHaveMoreLocal;

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return mergeEventsById(upcomingBase, yearlyEvents)
      .filter((event) => getEffectiveEventDate(event, now).getTime() >= today)
      .sort((a, b) => getEffectiveEventDate(a, now).getTime() - getEffectiveEventDate(b, now).getTime())
      .slice(0, DATA_LIMITS.dashboard.upcomingEvents);
  }, [upcomingBase, yearlyEvents]);

  const upcomingHasMore = upcomingHasMoreBase
    || mergeEventsById(upcomingBase, yearlyEvents).length > DATA_LIMITS.dashboard.upcomingEvents;

  const sharedLoading = (useSharedEvents && sharedEvents ? sharedEvents.upcomingLoading || sharedEvents.yearlyLoading : false)
    || (useSharedMoments && sharedMoments ? sharedMoments.loading : false);
  const sharedError = (useSharedEvents && sharedEvents ? sharedEvents.upcomingError ?? sharedEvents.yearlyError : null)
    ?? (useSharedMoments && sharedMoments ? sharedMoments.error : null);

  return {
    members,
    memberByUid,
    upcomingEvents,
    upcomingHasMore,
    recentMoments,
    momentsHaveMore,
    loading: membersLoading || sharedLoading || eventsLoadingLocal || yearlyLoadingLocal || momentsLoadingLocal,
    error: sharedError ?? errorLocal ?? membersError,
  };
};
