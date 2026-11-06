import { useEffect, useMemo, useState } from "react";
import { familyGraphService } from "../../services/familyGraph/familyGraphService";
import type { FamilyPerson } from "../../types/familyGraph";

const normalizeIds = (ids: readonly string[]) => Array.from(
  new Set(ids.map((id) => id.trim()).filter(Boolean)),
).sort();

/**
 * Lightweight Person lookup for screens that only need labels for a bounded set
 * of references. This deliberately avoids materializing the whole family graph.
 */
export function useFamilyPersonsByIds(
  familyId: string | null | undefined,
  personIds: readonly string[],
) {
  const idsKey = useMemo(() => normalizeIds(personIds).join("|"), [personIds]);
  const normalizedIds = useMemo(() => idsKey ? idsKey.split("|") : [], [idsKey]);
  const [persons, setPersons] = useState<FamilyPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    setPersons([]);
    setError(null);
    if (!familyId || normalizedIds.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    familyGraphService.getPersonsByIds(familyId, normalizedIds)
      .then((items) => {
        if (!cancelled) setPersons(items);
      })
      .catch((nextError) => {
        if (!cancelled) setError(nextError);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [familyId, idsKey]);

  const personById = useMemo(
    () => new Map(persons.map((person) => [person.id, person])),
    [persons],
  );

  return { persons, personById, loading, error };
}
