import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFamilyMomentsRealtime } from "../context/FamilyRealtimeContext";
import { momentsService } from "../services/moments/momentsService";
import type { MomentPage, MomentPageCursor, MomentPost } from "../types/moments";

const mergeMomentsById = (...groups: MomentPost[][]) => {
  const byId = new Map<string, MomentPost>();
  groups.flat().forEach((item) => byId.set(item.id, item));
  return Array.from(byId.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const useFamilyMoments = (familyId: string | null | undefined) => {
  const shared = useFamilyMomentsRealtime();
  const useShared = !!familyId && shared?.familyId === familyId;
  const sharedMomentsPage = shared?.page;
  const sharedMomentsLoading = shared?.loading ?? false;
  const sharedMomentsError = shared?.error ?? null;
  const retrySharedRealtime = shared?.retryRealtime;
  const [head, setHead] = useState<MomentPost[]>([]);
  const [tail, setTail] = useState<MomentPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const headCursorRef = useRef<MomentPageCursor | null>(null);
  const tailCursorRef = useRef<MomentPageCursor | null>(null);
  const headIdsRef = useRef("");
  const tailLoadedRef = useRef(false);
  const familyVersionRef = useRef(0);
  const bridgeRunningRef = useRef(false);

  const applyHeadPage = useCallback((page: MomentPage, currentFamilyId: string, version: number) => {
    if (version !== familyVersionRef.current) return;
    const nextIds = page.items.map((item) => item.id).join("|");
    const identitiesChanged = !!headIdsRef.current && nextIds !== headIdsRef.current;
    headIdsRef.current = nextIds;
    headCursorRef.current = page.cursor;
    setHead(page.items);
    setLoading(false);

    if (!tailLoadedRef.current) {
      setHasMore(page.hasMore);
      return;
    }

    // Realtime head changes can displace the former boundary item. Bridge one
    // small page, dedupe by id, and keep the deepest cursor already loaded.
    if (identitiesChanged && page.cursor && !bridgeRunningRef.current) {
      bridgeRunningRef.current = true;
      void momentsService.listMore(currentFamilyId, page.cursor)
        .then((bridge) => {
          if (version !== familyVersionRef.current) return;
          setTail((current) => mergeMomentsById(bridge.items, current));
          if (!tailCursorRef.current) {
            tailCursorRef.current = bridge.cursor;
            setHasMore(bridge.hasMore);
          }
        })
        .catch((nextError) => {
          if (version === familyVersionRef.current) setError(nextError);
        })
        .finally(() => {
          bridgeRunningRef.current = false;
        });
    }
  }, []);

  useEffect(() => {
    familyVersionRef.current += 1;
    const version = familyVersionRef.current;
    setHead([]);
    setTail([]);
    setLoading(!!familyId);
    setLoadingMore(false);
    setHasMore(false);
    setError(null);
    headCursorRef.current = null;
    tailCursorRef.current = null;
    headIdsRef.current = "";
    tailLoadedRef.current = false;
    bridgeRunningRef.current = false;

    if (!familyId || useShared) return;

    return momentsService.subscribeLatest(
      familyId,
      (page) => applyHeadPage(page, familyId, version),
      (nextError) => {
        if (version !== familyVersionRef.current) return;
        setError(nextError);
        setLoading(false);
      },
    );
  }, [applyHeadPage, familyId, reloadKey, useShared]);

  useEffect(() => {
    if (!familyId || !useShared || !sharedMomentsPage) return;
    const version = familyVersionRef.current;
    if (sharedMomentsError) setError(sharedMomentsError);
    setLoading(sharedMomentsLoading);
    applyHeadPage(sharedMomentsPage, familyId, version);
  }, [applyHeadPage, familyId, sharedMomentsError, sharedMomentsLoading, sharedMomentsPage, useShared]);

  const loadMore = useCallback(async () => {
    if (!familyId || loadingMore || !hasMore) return;
    const cursor = tailCursorRef.current ?? headCursorRef.current;
    if (!cursor) {
      setHasMore(false);
      return;
    }

    setLoadingMore(true);
    try {
      const page = await momentsService.listMore(familyId, cursor);
      tailLoadedRef.current = true;
      setTail((current) => mergeMomentsById(current, page.items));
      tailCursorRef.current = page.cursor;
      setHasMore(page.hasMore);
    } catch (nextError) {
      setError(nextError);
    } finally {
      setLoadingMore(false);
    }
  }, [familyId, hasMore, loadingMore]);

  const moments = useMemo(() => mergeMomentsById(head, tail), [head, tail]);
  const retry = useCallback(() => {
    setTail([]);
    tailCursorRef.current = null;
    tailLoadedRef.current = false;
    if (useShared && retrySharedRealtime) retrySharedRealtime();
    else setReloadKey((value) => value + 1);
  }, [retrySharedRealtime, useShared]);

  return {
    moments,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    retry,
    error,
  };
};
