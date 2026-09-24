import { useEffect, useMemo, useState } from "react";
import { useFamilyMembersRealtime } from "../context/FamilyRealtimeContext";
import { familyService } from "../services/family/familyService";
import type { FamilyMember } from "../types";

export const useFamilyMembers = (familyId: string | null | undefined) => {
  const shared = useFamilyMembersRealtime();
  const useShared = !!familyId && shared?.familyId === familyId;
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(!!familyId);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    setMembers([]);
    setError(null);
    if (!familyId || useShared) {
      setLoading(false);
      return;
    }
    setLoading(true);
    return familyService.watchMembers(
      familyId,
      (items) => {
        setMembers([...items].sort((a, b) => a.displayName.localeCompare(b.displayName, "vi")));
        setLoading(false);
      },
      (nextError) => {
        setError(nextError);
        setLoading(false);
      },
    );
  }, [familyId, useShared]);

  const localMemberByUid = useMemo(
    () => new Map(members.map((member) => [member.uid, member])),
    [members],
  );

  if (useShared && shared) {
    return {
      members: shared.members,
      memberByUid: shared.memberByUid,
      loading: shared.loading,
      error: shared.error,
    };
  }

  return { members, memberByUid: localMemberByUid, loading, error };
};
