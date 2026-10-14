import { useEffect, useMemo, useRef, useState } from "react";
import { useFamilyMembersRealtime } from "../../context/FamilyRealtimeContext";
import { useAuth } from "../../context/AuthContext";
import { useOptionalTabLiveEffect, type MainTabId } from "../../context/TabRuntimeContext";
import { familyService } from "../../services/family/familyService";
import { familyHomeWarmCache } from "../../services/bootstrap/familyHomeWarmCache";
import type { FamilyMember } from "../../types";

type Options = { runtimeTabId?: MainTabId };

const sortMembers = (items: FamilyMember[]) => [...items].sort((a, b) => a.displayName.localeCompare(b.displayName, "vi"));

/**
 * Cache-first member hook.
 *
 * Main-tab callers pass runtimeTabId so the physical Firestore listener exists
 * only while that surface is ACTIVE. Transient routes omit runtimeTabId and own
 * a normal mount-scoped listener. The legacy root provider is cache-only.
 */
export const useFamilyMembers = (familyId: string | null | undefined, options: Options = {}) => {
  const { user } = useAuth();
  const shared = useFamilyMembersRealtime();
  const sharedMatches = !!familyId && shared?.familyId === familyId;
  const [members, setMembers] = useState<FamilyMember[]>(() => sharedMatches ? shared?.members ?? [] : []);
  const [loading, setLoading] = useState(!!familyId && !(sharedMatches && shared?.members.length));
  const [error, setError] = useState<unknown>(null);
  const runtimeTabId = options.runtimeTabId;
  const activeFamilyRef = useRef<string | null | undefined>(familyId);
  const activeUserUidRef = useRef(user?.uid);
  activeFamilyRef.current = familyId;
  activeUserUidRef.current = user?.uid;

  useEffect(() => {
    const cached = sharedMatches ? shared?.members ?? [] : [];
    setMembers(cached);
    setError(sharedMatches ? shared?.error ?? null : null);
    setLoading(!!familyId && cached.length === 0);
  }, [familyId, shared?.error, shared?.members, sharedMatches]);

  // Transient/detail routes own a listener only for their mounted lifetime.
  useEffect(() => {
    if (!familyId || runtimeTabId) return;
    setLoading((current) => current || members.length === 0);
    return familyService.watchMembers(
      familyId,
      (items) => {
        const requestUid = user?.uid;
        if (activeFamilyRef.current !== familyId || activeUserUidRef.current !== requestUid) return;
        const sorted = sortMembers(items);
        setMembers(sorted);
        if (requestUid) familyHomeWarmCache.update(requestUid, familyId, { members: sorted });
        setLoading(false);
      },
      (nextError) => {
        if (activeFamilyRef.current !== familyId || activeUserUidRef.current !== user?.uid) return;
        setError(nextError);
        setLoading(false);
      },
    );
  }, [familyId, runtimeTabId, user?.uid]); // members intentionally excluded: it is only an initial-loading hint.

  // Main tabs do not stay live while hidden. The ACTIVE tab owns the listener.
  useOptionalTabLiveEffect(runtimeTabId, (scope) => {
    if (!runtimeTabId || !familyId) return;
    setLoading((current) => current || members.length === 0);
    return familyService.watchMembers(
      familyId,
      (items) => {
        const requestUid = user?.uid;
        if (!scope.isCurrent() || activeFamilyRef.current !== familyId || activeUserUidRef.current !== requestUid) return;
        const sorted = sortMembers(items);
        setMembers(sorted);
        if (requestUid) familyHomeWarmCache.update(requestUid, familyId, { members: sorted });
        setLoading(false);
      },
      (nextError) => {
        if (!scope.isCurrent() || activeFamilyRef.current !== familyId || activeUserUidRef.current !== user?.uid) return;
        setError(nextError);
        setLoading(false);
      },
    );
  }, [familyId, runtimeTabId, user?.uid]);

  const memberByUid = useMemo(
    () => new Map(members.map((member) => [member.uid, member])),
    [members],
  );

  return { members, memberByUid, loading, error };
};
