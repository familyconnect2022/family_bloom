import { useEffect, useMemo, useState } from "react";
import { DATA_LIMITS } from "../../constants/dataLimits";
import { useFamilyEventsRealtime, useFamilyMomentsRealtime } from "../../context/FamilyRealtimeContext";
import { useTabLiveEffect } from "../../context/TabRuntimeContext";
import { calendarService } from "../../services/calendar/calendarService";
import { familyHomeWarmCache } from "../../services/bootstrap/familyHomeWarmCache";
import { momentsService } from "../../services/moments/momentsService";
import { subscribeSharedRealtime } from "../../services/realtime/sharedRealtimeRegistry";
import type { FamilyEvent, MomentPost } from "../../types";
import { getEffectiveEventDate, mergeEventsById } from "../../utils/event";
import { useAuth } from "../../context/AuthContext";
import { useFamilyMembers } from "./useFamilyMembers";

/**
 * Home projection over cache + ACTIVE-owned realtime heads.
 *
 * The root provider supplies display cache only. Home itself owns the tiny live
 * heads while ACTIVE, then releases them as soon as the surface becomes WARM.
 */
export const useFamilyDashboard = (familyId: string | null | undefined) => {
  const { user } = useAuth();
  const sharedEvents = useFamilyEventsRealtime();
  const sharedMoments = useFamilyMomentsRealtime();
  const sharedEventsMatch = !!familyId && sharedEvents?.familyId === familyId;
  const sharedMomentsMatch = !!familyId && sharedMoments?.familyId === familyId;
  const { members, memberByUid, loading: membersLoading, error: membersError } = useFamilyMembers(familyId, { runtimeTabId: "home" });

  const [upcomingBase, setUpcomingBase] = useState<FamilyEvent[]>([]);
  const [yearlyEvents, setYearlyEvents] = useState<FamilyEvent[]>([]);
  const [upcomingHasMoreBase, setUpcomingHasMoreBase] = useState(false);
  const [recentMoments, setRecentMoments] = useState<MomentPost[]>([]);
  const [momentsHaveMore, setMomentsHaveMore] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(!!familyId);
  const [momentsLoading, setMomentsLoading] = useState(!!familyId);
  const [error, setError] = useState<unknown>(null);

  // Re-seed projection from the family cache whenever ownership changes.
  useEffect(() => {
    const cachedUpcoming = sharedEventsMatch ? sharedEvents?.upcomingPage.items ?? [] : [];
    const cachedYearly = sharedEventsMatch ? sharedEvents?.yearlyEvents ?? [] : [];
    const cachedMoments = sharedMomentsMatch ? sharedMoments?.page.items ?? [] : [];
    setUpcomingBase(cachedUpcoming);
    setYearlyEvents(cachedYearly);
    setUpcomingHasMoreBase(sharedEventsMatch ? !!sharedEvents?.upcomingPage.hasMore : false);
    setRecentMoments(cachedMoments.slice(0, DATA_LIMITS.dashboard.recentMoments));
    setMomentsHaveMore(sharedMomentsMatch ? !!sharedMoments?.page.hasMore : false);
    setEventsLoading(!!familyId && cachedUpcoming.length === 0 && cachedYearly.length === 0);
    setMomentsLoading(!!familyId && cachedMoments.length === 0);
    setError(null);
  }, [familyId, sharedEvents?.upcomingPage, sharedEvents?.yearlyEvents, sharedEventsMatch, sharedMoments?.page, sharedMomentsMatch]);

  useTabLiveEffect("home", (scope) => {
    if (!familyId) return;
    const stops = [
      subscribeSharedRealtime({
        key: `home.events.upcoming:${familyId}:${DATA_LIMITS.dashboard.upcomingEvents}`,
        listenerName: "home.events.upcoming",
        start: (onData, onError) => calendarService.subscribeUpcoming(
          familyId,
          onData,
          onError,
          DATA_LIMITS.dashboard.upcomingEvents,
        ),
        onData: (page) => {
          if (!scope.isCurrent()) return;
          setUpcomingBase(page.items);
          setUpcomingHasMoreBase(page.hasMore);
          setEventsLoading(false);
          if (user?.uid) familyHomeWarmCache.update(user.uid, familyId, { upcomingEvents: page.items, upcomingHasMore: page.hasMore });
        },
        onError: (nextError) => {
          if (!scope.isCurrent()) return;
          setError(nextError);
          setEventsLoading(false);
        },
        keepAliveMs: 1200,
      }),
      subscribeSharedRealtime({
        key: `home.events.yearly:${familyId}`,
        listenerName: "home.events.yearly",
        start: (onData, onError) => calendarService.subscribeYearly(familyId, onData, onError),
        onData: (items) => {
          if (!scope.isCurrent()) return;
          setYearlyEvents(items);
          setEventsLoading(false);
          if (user?.uid) familyHomeWarmCache.update(user.uid, familyId, { yearlyEvents: items });
        },
        onError: (nextError) => {
          if (!scope.isCurrent()) return;
          setError(nextError);
          setEventsLoading(false);
        },
        keepAliveMs: 1200,
      }),
      subscribeSharedRealtime({
        key: `home.moments.latest:${familyId}:${DATA_LIMITS.dashboard.recentMoments}`,
        listenerName: "home.moments.latest",
        start: (onData, onError) => momentsService.subscribeLatest(
          familyId,
          onData,
          onError,
          DATA_LIMITS.dashboard.recentMoments,
        ),
        onData: (page) => {
          if (!scope.isCurrent()) return;
          const next = page.items.slice(0, DATA_LIMITS.dashboard.recentMoments);
          setRecentMoments(next);
          setMomentsHaveMore(page.hasMore);
          setMomentsLoading(false);
          if (user?.uid) familyHomeWarmCache.update(user.uid, familyId, { moments: next, momentsHaveMore: page.hasMore });
        },
        onError: (nextError) => {
          if (!scope.isCurrent()) return;
          setError(nextError);
          setMomentsLoading(false);
        },
        keepAliveMs: 1200,
      }),
    ];
    return () => stops.forEach((stop) => stop());
  }, [familyId, user?.uid]);

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

  return {
    members,
    memberByUid,
    upcomingEvents,
    upcomingHasMore,
    recentMoments,
    momentsHaveMore,
    membersLoading,
    eventsLoading,
    momentsLoading,
    loading: membersLoading || eventsLoading || momentsLoading,
    error: error ?? membersError,
  };
};
