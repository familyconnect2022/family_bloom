import { useEffect, useRef, useState } from "react";
import { fingerprintFamilyGraphSnapshot, getFamilyGraphWarmRecord, primeFamilyGraphWarmCache } from "../../components/familyGraph/familyGraphWarmCache";
import { familyGraphService } from "../../services/familyGraph/familyGraphService";
import type { FamilyGraphSnapshot } from "../../types/familyGraph";

const EMPTY: FamilyGraphSnapshot = { familyId: "", persons: [], relationships: [] };

/**
 * Realtime Family Graph hook with A14 cache-first entry.
 *
 * The linked current Person is derived from the already-loaded persons snapshot;
 * no extra personLinks -> person document round trip is opened during normal entry.
 */
export const useFamilyGraph = (
  familyId: string | null | undefined,
  currentUid?: string | null,
  enabled = true,
) => {
  const warmAtRender = getFamilyGraphWarmRecord(familyId);
  const [snapshot, setSnapshot] = useState<FamilyGraphSnapshot>(() => warmAtRender?.snapshot ?? EMPTY);
  const [defaultFocusId, setDefaultFocusId] = useState<string | null>(() => warmAtRender?.defaultFocusId ?? null);
  const [loading, setLoading] = useState(!!familyId && enabled && !warmAtRender);
  const [error, setError] = useState<unknown>(null);
  const loadedFamilyRef = useRef<string | null>(warmAtRender?.familyId ?? null);
  const snapshotFingerprintRef = useRef(warmAtRender?.fingerprint ?? "");

  useEffect(() => {
    setError(null);
    if (!familyId) {
      loadedFamilyRef.current = null;
      snapshotFingerprintRef.current = "";
      setSnapshot(EMPTY);
      setDefaultFocusId(null);
      setLoading(false);
      return;
    }
    if (!enabled) {
      setLoading(false);
      return;
    }

    const warm = getFamilyGraphWarmRecord(familyId);
    const familyChanged = loadedFamilyRef.current !== familyId;
    if (familyChanged) {
      if (warm) {
        loadedFamilyRef.current = familyId;
        snapshotFingerprintRef.current = warm.fingerprint;
        setSnapshot(warm.snapshot);
        setDefaultFocusId(
          warm.snapshot.persons.find((person) => person.linkedUid === currentUid)?.id
          ?? warm.defaultFocusId
          ?? null,
        );
        setLoading(false);
      } else {
        snapshotFingerprintRef.current = "";
        setSnapshot({ familyId, persons: [], relationships: [] });
        setDefaultFocusId(null);
        setLoading(true);
      }
    }

    const stop = familyGraphService.watchSnapshot(
      familyId,
      (next) => {
        loadedFamilyRef.current = familyId;
        const nextFingerprint = fingerprintFamilyGraphSnapshot(next);
        const linked = currentUid ? next.persons.find((person) => person.linkedUid === currentUid) : null;
        const nextFocusId = linked?.id ?? null;
        // P2.5: resubscribing after a route return is allowed, but an identical
        // Firestore snapshot must not rebuild the graph/visual tree.
        if (nextFingerprint === snapshotFingerprintRef.current) {
          setDefaultFocusId((current) => current === nextFocusId ? current : nextFocusId);
          setLoading(false);
          return;
        }
        snapshotFingerprintRef.current = nextFingerprint;
        setSnapshot(next);
        setDefaultFocusId(nextFocusId);
        primeFamilyGraphWarmCache(next, currentUid);
        setLoading(false);
      },
      (nextError) => {
        setError(nextError);
        setLoading(false);
      },
    );
    return stop;
  }, [currentUid, enabled, familyId]);

  useEffect(() => {
    if (!enabled) return;
    if (!currentUid) {
      setDefaultFocusId(null);
      return;
    }
    const linked = snapshot.persons.find((person) => person.linkedUid === currentUid);
    setDefaultFocusId(linked?.id ?? null);
  }, [currentUid, enabled, snapshot.persons]);

  return {
    snapshot,
    persons: snapshot.persons,
    relationships: snapshot.relationships,
    defaultFocusId,
    loading,
    error,
  };
};
