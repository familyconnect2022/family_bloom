import { useEffect, useRef, useState } from "react";
import { familyGraphService } from "../services/familyGraph/familyGraphService";
import type { FamilyGraphSnapshot } from "../types/familyGraph";

const EMPTY: FamilyGraphSnapshot = { familyId: "", persons: [], relationships: [] };

/**
 * Bounded realtime Family Graph hook.
 * `enabled=false` explicitly releases Firestore listeners while a graph screen is
 * behind another full-screen route. This prevents multiple hidden graph screens
 * from recomputing the same snapshot during admin/editor navigation.
 */
export const useFamilyGraph = (
  familyId: string | null | undefined,
  currentUid?: string | null,
  enabled = true,
) => {
  const [snapshot, setSnapshot] = useState<FamilyGraphSnapshot>(EMPTY);
  const [defaultFocusId, setDefaultFocusId] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!familyId && enabled);
  const [error, setError] = useState<unknown>(null);
  const loadedFamilyRef = useRef<string | null>(null);

  useEffect(() => {
    setError(null);
    if (!familyId) {
      loadedFamilyRef.current = null;
      setSnapshot(EMPTY);
      setDefaultFocusId(null);
      setLoading(false);
      return;
    }
    if (!enabled) {
      setLoading(false);
      return;
    }

    const familyChanged = loadedFamilyRef.current !== familyId;
    if (familyChanged) {
      setSnapshot({ familyId, persons: [], relationships: [] });
      setDefaultFocusId(null);
      setLoading(true);
    }

    return familyGraphService.watchSnapshot(
      familyId,
      (next) => {
        loadedFamilyRef.current = familyId;
        setSnapshot(next);
        setLoading(false);
      },
      (nextError) => {
        setError(nextError);
        setLoading(false);
      },
    );
  }, [enabled, familyId]);

  useEffect(() => {
    let cancelled = false;
    if (!enabled || !familyId || !currentUid) {
      if (!enabled || !currentUid) setDefaultFocusId(null);
      return;
    }

    familyGraphService.getDefaultFocusPerson(familyId, currentUid)
      .then((person) => {
        if (!cancelled) setDefaultFocusId(person?.id ?? null);
      })
      .catch((nextError) => {
        if (!cancelled) setError(nextError);
      });

    return () => { cancelled = true; };
  }, [currentUid, enabled, familyId]);

  useEffect(() => {
    if (!enabled) return;
    if (!currentUid) {
      setDefaultFocusId(null);
      return;
    }
    const linked = snapshot.persons.find((person) => person.linkedUid === currentUid);
    if (linked) setDefaultFocusId(linked.id);
    else if (snapshot.familyId) setDefaultFocusId(null);
  }, [currentUid, enabled, snapshot.familyId, snapshot.persons]);

  return {
    snapshot,
    persons: snapshot.persons,
    relationships: snapshot.relationships,
    defaultFocusId,
    loading,
    error,
  };
};
