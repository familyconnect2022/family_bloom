import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
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
 * P2 cache bridge for the active family.
 *
 * IMPORTANT: despite the legacy public name, this provider no longer owns any
 * Firestore feature listener. It only hydrates the uid/family-scoped warm cache
 * so Home and a newly-focused feature can paint familiar content immediately.
 *
 * Live ownership now belongs to the feature hook/surface that is ACTIVE. This
 * removes the old root fan-out where members, Moments, upcoming Events and
 * yearly Events all stayed live simply because the app root was mounted.
 * Keeping the narrow contexts during migration preserves existing call sites
 * without re-introducing root listener ownership.
 */
export const FamilyRealtimeProvider = ({ children }: { children: React.ReactNode; liveReady?: boolean }) => {
  const { user, userProfile, families, profileStatus } = useAuth();
  const requestedFamilyId = userProfile?.activeFamilyId ?? null;
  const familyId = profileStatus === "ready" && requestedFamilyId && families.some((item) => item.familyId === requestedFamilyId)
    ? requestedFamilyId
    : null;

  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [momentsPage, setMomentsPage] = useState<MomentPage>(EMPTY_MOMENT_PAGE);
  const [upcomingPage, setUpcomingPage] = useState<EventPage>(EMPTY_EVENT_PAGE);
  const [yearlyEvents, setYearlyEvents] = useState<FamilyEvent[]>([]);
  const [loading, setLoading] = useState(!!familyId);
  const [error, setError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reloadCache = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    setMembers([]);
    setMomentsPage(EMPTY_MOMENT_PAGE);
    setUpcomingPage(EMPTY_EVENT_PAGE);
    setYearlyEvents([]);
    setLoading(!!familyId);
    setError(null);

    if (!user?.uid || !familyId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const apply = (cached: Awaited<ReturnType<typeof familyHomeWarmCache.read>> | null) => {
      if (cancelled) return;
      if (cached) {
        setMembers(cached.members);
        setUpcomingPage({ items: cached.upcomingEvents, cursor: null, hasMore: cached.upcomingHasMore });
        setYearlyEvents(cached.yearlyEvents);
        setMomentsPage({ items: cached.moments, cursor: null, hasMore: cached.momentsHaveMore });
      }
      setLoading(false);
    };

    const memory = familyHomeWarmCache.peek(user.uid, familyId);
    if (memory) {
      apply(memory);
      return () => { cancelled = true; };
    }

    void familyHomeWarmCache.read(user.uid, familyId)
      .then(apply)
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [familyId, reloadKey, user?.uid]);

  const memberByUid = useMemo(
    () => new Map(members.map((member) => [member.uid, member])),
    [members],
  );

  const membersValue = useMemo<FamilyMembersRealtimeValue>(() => ({
    familyId,
    members,
    memberByUid,
    loading,
    error,
    retryRealtime: reloadCache,
  }), [error, familyId, loading, memberByUid, members, reloadCache]);

  const momentsValue = useMemo<FamilyMomentsRealtimeValue>(() => ({
    familyId,
    page: momentsPage,
    loading,
    error,
    retryRealtime: reloadCache,
  }), [error, familyId, loading, momentsPage, reloadCache]);

  const eventsValue = useMemo<FamilyEventsRealtimeValue>(() => ({
    familyId,
    upcomingPage,
    upcomingLoading: loading,
    upcomingError: error,
    yearlyEvents,
    yearlyLoading: loading,
    yearlyError: error,
    retryRealtime: reloadCache,
  }), [error, familyId, loading, reloadCache, upcomingPage, yearlyEvents]);

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
