import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useFamilyMomentsRealtime } from "../../context/FamilyRealtimeContext";
import { useTabLiveEffect } from "../../context/TabRuntimeContext";
import { familyHomeWarmCache } from "../../services/bootstrap/familyHomeWarmCache";
import { momentsService } from "../../services/moments/momentsService";
import { canonicalizeFamilyMoments } from "../../services/moments/momentEntityCache";
import type { MomentPage, MomentPageCursor, MomentPost } from "../../types/moments";

const mergeMomentsById = (...groups: MomentPost[][]) => {
  const byId = new Map<string, MomentPost>();
  groups.flat().forEach((item) => byId.set(item.id, item));
  return Array.from(byId.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

/** Cache-first feed head; the physical head listener exists only while Moments is ACTIVE. */
export const useFamilyMoments = (familyId: string | null | undefined) => {
  const { user } = useAuth();
  const shared = useFamilyMomentsRealtime();
  const sharedMatches = !!familyId && shared?.familyId === familyId;
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
  const bridgeTokenRef = useRef(0);
  const activeFamilyRef = useRef<string | null | undefined>(familyId);
  const loadMoreInFlightRef = useRef(false);
  activeFamilyRef.current = familyId;

  const applyHeadPage = useCallback((page: MomentPage, currentFamilyId: string, version: number) => {
    if (version !== familyVersionRef.current) return;
    const canonicalItems = canonicalizeFamilyMoments(currentFamilyId, page.items);
    const nextIds = canonicalItems.map((item) => item.id).join("|");
    const identitiesChanged = !!headIdsRef.current && nextIds !== headIdsRef.current;
    headIdsRef.current = nextIds;
    headCursorRef.current = page.cursor;
    setHead(canonicalItems);
    setLoading(false);
    if (user?.uid) familyHomeWarmCache.update(user.uid, currentFamilyId, { moments: canonicalItems, momentsHaveMore: page.hasMore });

    if (!tailLoadedRef.current) {
      setHasMore(page.hasMore);
      return;
    }

    // A changed realtime head can move the pagination boundary. Bridge one page
    // only while the surface remains current, then keep the deepest tail cursor.
    if (identitiesChanged && page.cursor && !bridgeRunningRef.current) {
      bridgeRunningRef.current = true;
      const bridgeToken = ++bridgeTokenRef.current;
      void momentsService.listMore(currentFamilyId, page.cursor)
        .then((bridge) => {
          if (version !== familyVersionRef.current) return;
          setTail((current) => mergeMomentsById(canonicalizeFamilyMoments(currentFamilyId, bridge.items), current));
          if (!tailCursorRef.current) {
            tailCursorRef.current = bridge.cursor;
            setHasMore(bridge.hasMore);
          }
        })
        .catch((nextError) => {
          if (version === familyVersionRef.current) setError(nextError);
        })
        .finally(() => {
          if (bridgeToken === bridgeTokenRef.current) bridgeRunningRef.current = false;
        });
    }
  }, [user?.uid]);

  useEffect(() => {
    familyVersionRef.current += 1;
    const cached = sharedMatches ? shared?.page : null;
    const items = cached?.items && familyId ? canonicalizeFamilyMoments(familyId, cached.items) : [];
    setHead(items);
    setTail([]);
    setLoading(!!familyId && items.length === 0);
    setLoadingMore(false);
    setHasMore(cached?.hasMore ?? false);
    setError(sharedMatches ? shared?.error ?? null : null);
    headCursorRef.current = cached?.cursor ?? null;
    tailCursorRef.current = null;
    headIdsRef.current = items.map((item) => item.id).join("|");
    tailLoadedRef.current = false;
    bridgeTokenRef.current += 1;
    bridgeRunningRef.current = false;
    loadMoreInFlightRef.current = false;
  }, [familyId, shared?.error, shared?.page, sharedMatches]);

  useTabLiveEffect("moments", (scope) => {
    if (!familyId) return;
    const version = familyVersionRef.current;
    return momentsService.subscribeLatest(
      familyId,
      (page) => {
        if (!scope.isCurrent()) return;
        applyHeadPage(page, familyId, version);
      },
      (nextError) => {
        if (!scope.isCurrent() || version !== familyVersionRef.current) return;
        setError(nextError);
        setLoading(false);
      },
    );
  }, [applyHeadPage, familyId, reloadKey]);

  const loadMore = useCallback(async () => {
    if (!familyId || loadingMore || loadMoreInFlightRef.current || !hasMore) return;
    const cursor = tailCursorRef.current ?? headCursorRef.current;
    if (!cursor) {
      // A cache-only first paint has no Firestore cursor yet. Do not incorrectly
      // erase hasMore; the ACTIVE head sync will provide the cursor shortly.
      return;
    }

    const requestFamilyId = familyId;
    const requestVersion = familyVersionRef.current;
    const requestHeadIds = headIdsRef.current;
    loadMoreInFlightRef.current = true;
    setLoadingMore(true);
    try {
      const page = await momentsService.listMore(requestFamilyId, cursor);
      if (activeFamilyRef.current !== requestFamilyId || familyVersionRef.current !== requestVersion || headIdsRef.current !== requestHeadIds) return;
      tailLoadedRef.current = true;
      setTail((current) => mergeMomentsById(current, canonicalizeFamilyMoments(requestFamilyId, page.items)));
      tailCursorRef.current = page.cursor;
      setHasMore(page.hasMore);
    } catch (nextError) {
      if (activeFamilyRef.current === requestFamilyId && familyVersionRef.current === requestVersion && headIdsRef.current === requestHeadIds) setError(nextError);
    } finally {
      if (activeFamilyRef.current === requestFamilyId && familyVersionRef.current === requestVersion) {
        loadMoreInFlightRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [familyId, hasMore, loadingMore]);

  const moments = useMemo(() => mergeMomentsById(head, tail), [head, tail]);
  const retry = useCallback(() => {
    familyVersionRef.current += 1;
    loadMoreInFlightRef.current = false;
    setLoadingMore(false);
    setTail([]);
    tailCursorRef.current = null;
    tailLoadedRef.current = false;
    setReloadKey((value) => value + 1);
  }, []);

  return { moments, loading, loadingMore, hasMore, loadMore, retry, error };
};
