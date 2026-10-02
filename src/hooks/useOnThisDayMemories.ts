import { useEffect, useMemo, useState } from "react";
import { momentsService } from "../services/moments/momentsService";
import type { MomentPost } from "../types/moments";

export function useOnThisDayMemories(familyId?: string | null) {
  const [items, setItems] = useState<MomentPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const todayKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  }, []);

  useEffect(() => {
    let alive = true;
    setItems([]);
    setError(null);
    if (!familyId) return;
    setLoading(true);
    momentsService.listOnThisDay(familyId, new Date(), 6, 12)
      .then((next) => { if (alive) setItems(next.slice(0, 8)); })
      .catch((nextError) => { if (alive) setError(nextError); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [familyId, todayKey]);

  return { items, loading, error };
}
