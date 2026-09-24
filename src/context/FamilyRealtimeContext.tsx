import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { DATA_LIMITS } from "../constants/dataLimits";
import { calendarService } from "../services/calendar/calendarService";
import { familyService } from "../services/family/familyService";
import { momentsService } from "../services/moments/momentsService";
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
export const FamilyRealtimeProvider = ({ children }: { children: React.ReactNode }) => {
  const { userProfile, families, profileStatus } = useAuth();
  const requestedFamilyId = userProfile?.activeFamilyId ?? null;
  const familyId = profileStatus === "ready" && requestedFamilyId && families.some((item) => item.familyId === requestedFamilyId)
    ? requestedFamilyId
    : null;
  const [restartKey, setRestartKey] = useState(0);
  const [appActive, setAppActive] = useState(AppState.currentState === "active");

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
  }, [familyId]);

  useEffect(() => {
    if (!familyId || !appActive) return;
    setMembersError(null);
    return familyService.watchMembers(
      familyId,
      (items) => {
        setMembers([...items].sort((a, b) => a.displayName.localeCompare(b.displayName, "vi")));
        setMembersLoading(false);
      },
      (error) => {
        setMembersError(error);
        setMembersLoading(false);
      },
    );
  }, [appActive, familyId, restartKey]);

  useEffect(() => {
    if (!familyId || !appActive) return;
    setMomentsError(null);
    return momentsService.subscribeLatest(
      familyId,
      (page) => {
        setMomentsPage(page);
        setMomentsLoading(false);
      },
      (error) => {
        setMomentsError(error);
        setMomentsLoading(false);
      },
      DATA_LIMITS.moments.initialFeed,
    );
  }, [appActive, familyId, restartKey]);

  useEffect(() => {
    if (!familyId || !appActive) return;
    setUpcomingError(null);
    return calendarService.subscribeUpcoming(
      familyId,
      (page) => {
        setUpcomingPage(page);
        setUpcomingLoading(false);
      },
      (error) => {
        setUpcomingError(error);
        setUpcomingLoading(false);
      },
      DATA_LIMITS.events.realtimePage,
    );
  }, [appActive, familyId, restartKey]);

  useEffect(() => {
    if (!familyId || !appActive) return;
    setYearlyError(null);
    return calendarService.subscribeYearly(
      familyId,
      (items) => {
        setYearlyEvents(items);
        setYearlyLoading(false);
      },
      (error) => {
        setYearlyError(error);
        setYearlyLoading(false);
      },
    );
  }, [appActive, familyId, restartKey]);

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
