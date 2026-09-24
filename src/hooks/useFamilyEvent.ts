import { useEffect, useState } from "react";
import { calendarService } from "../services/calendar/calendarService";
import type { FamilyEvent } from "../types";

export const useFamilyEvent = (familyId: string | null | undefined, eventId: string | null | undefined) => {
  const [event, setEvent] = useState<FamilyEvent | null>(null);
  const [loading, setLoading] = useState(!!familyId && !!eventId);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    setEvent(null);
    setError(null);
    if (!familyId || !eventId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    return calendarService.subscribeEvent(
      familyId,
      eventId,
      (item) => {
        setEvent(item);
        setLoading(false);
      },
      (nextError) => {
        setError(nextError);
        setLoading(false);
      },
    );
  }, [eventId, familyId]);

  return { event, loading, error };
};
