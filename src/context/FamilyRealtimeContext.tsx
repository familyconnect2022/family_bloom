import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { DATA_LIMITS } from "../constants/dataLimits";
import { calendarService } from "../services/calendar/calendarService";
import { familyService } from "../services/family/familyService";
import { momentsService } from "../services/moments/momentsService";
import { canonicalizeFamilyEventsStable } from "../services/event/eventEntityCache";
import { subscribeSharedRealtime } from "../services/realtime/sharedRealtimeRegistry";
import { familyHomeWarmCache } from "../services/bootstrap/familyHomeWarmCache";
import type { EventPage, FamilyEvent, FamilyMember, MomentPage } from "../types";
import { useAuth } from "./AuthContext";

type FamilyMembersRealtimeValue = {
  familyId: string | null;
  members: FamilyMember[];
  memberByUid: Map<string, FamilyMember>;
  loading: boolean;
  error: unknown;
  retryRealtime: () => void;
};

type FamilyMomentsRealtimeValue = {
  familyId: string | null;
  page: MomentPage;
  loading: boolean;
  error: unknown;
  retryRealtime: () => void;
};

type FamilyEventsRealtimeValue = {
  familyId: string | null;
  upcomingPage: EventPage;
  upcomingLoading: boolean;
  upcomingError: unknown;
  yearlyEvents: FamilyEvent[];
  yearlyLoading: boolean;
  yearlyError: unknown;
  retryRealtime: () => void;
};

const EMPTY_MOMENT_PAGE: MomentPage = { items: [], cursor: null, hasMore: false };
const EMPTY_EVENT_PAGE: EventPage = { items: [], cursor: null, hasMore: false };

const FamilyMembersRealtimeContext = createContext<FamilyMembersRealtimeValue | null>(null);
const FamilyMomentsRealtimeContext = createContext<FamilyMomentsRealtimeValue | null>(null);
const FamilyEventsRealtimeContext = createContext<FamilyEventsRealtimeValue | null>(null);

/**
 * One bounded realtime cache for the active family.
 *
 * It owns exactly one listener each for members, the Moment head, upcoming events,
 * and yearly recurring events. The cache is exposed through THREE narrow contexts
 * so a Moment snapshot does not force Family-member-only screens to re-render.
 * Listeners are also released while the app is backgrounded and restored on resume.
 */
export const FamilyRealtimeProvider = ({ children, liveReady = true }: { children: React.ReactNode; liveReady?: boolean }) => {
  const { user, userProfile, families, profileStatus } = useAuth();
  const requestedFamilyId = userProfile?.activeFamilyId ?? null;
  const familyId = profileStatus === "ready" && requestedFamilyId && families.some((item) => item.familyId === requestedFamilyId)
    ? requestedFamilyId
    : null;
  const [restartKey, setRestartKey] = useState(0);
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  const [warmCacheReady, setWarmCacheReady] = useState(!familyId);

  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(!!familyId);
  const [membersError, setMembersError] = useState<unknown>(null);

  const [momentsPage, setMomentsPage] = useState<MomentPage>(EMPTY_MOMENT_PAGE);
  const [momentsLoading, setMomentsLoading] = useState(!!familyId);
  const [momentsError, setMomentsError] = useState<unknown>(null);

  const [upcomingPage, setUpcomingPage] = useState<EventPage>(EMPTY_EVENT_PAGE);
  const [upcomingLoading, setUpcomingLoading] = useState(!!familyId);
  const [upcomingError, setUpcomingError] = useState<unknown>(null);

  const [yearlyEvents, setYearlyEvents] = useState<FamilyEvent[]>([]);
  const [yearlyLoading, setYearlyLoading] = useState(!!familyId);
  const [yearlyError, setYearlyError] = useState<unknown>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      setAppActive(nextState === "active");
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    setMembers([]);
    setMomentsPage(EMPTY_MOMENT_PAGE);
    setUpcomingPage(EMPTY_EVENT_PAGE);
    setYearlyEvents([]);
    setMembersError(null);
    setMomentsError(null);
    setUpcomingError(null);
    setYearlyError(null);
    setMembersLoading(!!familyId);
    setMomentsLoading(!!familyId);
    setUpcomingLoading(!!familyId);
    setYearlyLoading(!!familyId);
    setWarmCacheReady(!familyId);
  }, [familyId]);

  // Display-only uid/family-scoped cache. It can paint familiar Home content
  // before network listeners are released, but it never decides Auth or access.
  useEffect(() => {
    if (!user?.uid || !familyId) return;
    let cancelled = false;
    const apply = (cached: Awaited<ReturnType<typeof familyHomeWarmCache.read>> | null) => {
      if (!cached || cancelled) return;
      setMembers(cached.members);
      setUpcomingPage({ items: cached.upcomingEvents, cursor: null, hasMore: cached.upcomingHasMore });
      setYearlyEvents(cached.yearlyEvents);
      setMomentsPage({ items: cached.moments, cursor: null, hasMore: cached.momentsHaveMore });
    };
    const memory = familyHomeWarmCache.peek(user.uid, familyId);
    if (memory) {
      apply(memory);
      setWarmCacheReady(true);
    } else {
      void familyHomeWarmCache.read(user.uid, familyId)
        .then(apply)
        .finally(() => { if (!cancelled) setWarmCacheReady(true); });
    }
    return () => { cancelled = true; };
  }, [familyId, user?.uid]);

  useEffect(() => {
    if (!familyId || !appActive || !liveReady || !warmCacheReady) return;
    setMembersError(null);
    const stop = subscribeSharedRealtime<FamilyMember[]>({
      key: `family.members:${familyId}`,
      listenerName: "family.members",
      start: (onData, onError) => familyService.watchMembers(familyId, onData, onError),
      onData: (items) => {
        const sorted = [...items].sort((a, b) => a.displayName.localeCompare(b.displayName, "vi"));
        setMembers(sorted);
        if (user?.uid) familyHomeWarmCache.update(user.uid, familyId, { members: sorted });
        setMembersLoading(false);
      },
      onError: (error) => {
        setMembersError(error);
        setMembersLoading(false);
      },
    });
    return stop;
  }, [appActive, familyId, liveReady, restartKey, user?.uid, warmCacheReady]);

  useEffect(() => {
    if (!familyId || !appActive || !liveReady || !warmCacheReady) return;
    setMomentsError(null);
    const stop = subscribeSharedRealtime<MomentPage>({
      key: `family.moments.latest:${familyId}:${DATA_LIMITS.moments.initialFeed}`,
      listenerName: "family.moments.latest",
      start: (onData, onError) => momentsService.subscribeLatest(
        familyId, onData, onError, DATA_LIMITS.moments.initialFeed,
      ),
      onData: (page) => {
        setMomentsPage(page);
        if (user?.uid) familyHomeWarmCache.update(user.uid, familyId, { moments: page.items, momentsHaveMore: page.hasMore });
        setMomentsLoading(false);
      },
      onError: (error) => {
        setMomentsError(error);
        setMomentsLoading(false);
      },
    });
    return stop;
  }, [appActive, familyId, liveReady, restartKey, user?.uid, warmCacheReady]);

  useEffect(() => {
    if (!familyId || !appActive || !liveReady || !warmCacheReady) return;
    setUpcomingError(null);
    const stop = subscribeSharedRealtime<EventPage>({
      key: `family.events.upcoming:${familyId}:${DATA_LIMITS.events.realtimePage}`,
      listenerName: "family.events.upcoming",
      start: (onData, onError) => calendarService.subscribeUpcoming(
        familyId, onData, onError, DATA_LIMITS.events.realtimePage,
      ),
      onData: (page) => {
        setUpcomingPage((current) => {
          const items = canonicalizeFamilyEventsStable(familyId, current.items, page.items);
          return current.hasMore === page.hasMore && current.items === items
            ? current
            : { ...page, items };
        });
        if (user?.uid) familyHomeWarmCache.update(user.uid, familyId, { upcomingEvents: page.items, upcomingHasMore: page.hasMore });
        setUpcomingLoading(false);
      },
      onError: (error) => {
        setUpcomingError(error);
        setUpcomingLoading(false);
      },
    });
    return stop;
  }, [appActive, familyId, liveReady, restartKey, user?.uid, warmCacheReady]);

  useEffect(() => {
    if (!familyId || !appActive || !liveReady || !warmCacheReady) return;
    setYearlyError(null);
    const stop = subscribeSharedRealtime<FamilyEvent[]>({
      key: `family.events.yearly:${familyId}`,
      listenerName: "family.events.yearly",
      start: (onData, onError) => calendarService.subscribeYearly(familyId, onData, onError),
      onData: (items) => {
        setYearlyEvents((current) => canonicalizeFamilyEventsStable(familyId, current, items));
        if (user?.uid) familyHomeWarmCache.update(user.uid, familyId, { yearlyEvents: items });
        setYearlyLoading(false);
      },
      onError: (error) => {
        setYearlyError(error);
        setYearlyLoading(false);
      },
    });
    return stop;
  }, [appActive, familyId, liveReady, restartKey, user?.uid, warmCacheReady]);

  const memberByUid = useMemo(
    () => new Map(members.map((member) => [member.uid, member])),
    [members],
  );

  const retryRealtime = useCallback(() => {
    if (!familyId) return;
    setMembersLoading(true);
    setMomentsLoading(true);
    setUpcomingLoading(true);
    setYearlyLoading(true);
    setRestartKey((value) => value + 1);
  }, [familyId]);

  const membersValue = useMemo<FamilyMembersRealtimeValue>(() => ({
    familyId,
    members,
    memberByUid,
    loading: membersLoading,
    error: membersError,
    retryRealtime,
  }), [familyId, members, memberByUid, membersLoading, membersError, retryRealtime]);

  const momentsValue = useMemo<FamilyMomentsRealtimeValue>(() => ({
    familyId,
    page: momentsPage,
    loading: momentsLoading,
    error: momentsError,
    retryRealtime,
  }), [familyId, momentsPage, momentsLoading, momentsError, retryRealtime]);

  const eventsValue = useMemo<FamilyEventsRealtimeValue>(() => ({
    familyId,
    upcomingPage,
    upcomingLoading,
    upcomingError,
    yearlyEvents,
    yearlyLoading,
    yearlyError,
    retryRealtime,
  }), [
    familyId,
    upcomingPage,
    upcomingLoading,
    upcomingError,
    yearlyEvents,
    yearlyLoading,
    yearlyError,
    retryRealtime,
  ]);

  return (
    <FamilyMembersRealtimeContext.Provider value={membersValue}>
      <FamilyMomentsRealtimeContext.Provider value={momentsValue}>
        <FamilyEventsRealtimeContext.Provider value={eventsValue}>
          {children}
        </FamilyEventsRealtimeContext.Provider>
      </FamilyMomentsRealtimeContext.Provider>
    </FamilyMembersRealtimeContext.Provider>
  );
};

export const useFamilyMembersRealtime = () => useContext(FamilyMembersRealtimeContext);
export const useFamilyMomentsRealtime = () => useContext(FamilyMomentsRealtimeContext);
export const useFamilyEventsRealtime = () => useContext(FamilyEventsRealtimeContext);
