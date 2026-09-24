import { useEffect, useMemo, useState } from "react";
import { familyGraphService } from "../services/familyGraph/familyGraphService";
import type { FamilyPerson } from "../types/familyGraph";

export function useFamilyPersonDirectory(familyId: string | null | undefined, enabled = true) {
  const [persons, setPersons] = useState<FamilyPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    setPersons([]);
    setError(null);
    if (!familyId || !enabled) return;
    setLoading(true);
    familyGraphService.listPersons(familyId)
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
  }, [enabled, familyId]);

  const personById = useMemo(() => new Map(persons.map((person) => [person.id, person])), [persons]);
  return { persons, personById, loading, error };
}
