import { useEffect, useState } from "react";
import { eventService } from "../services/event/eventService";
import { momentsService } from "../services/moments/momentsService";
import type { FamilyEvent } from "../types/event";
import type { MomentPost } from "../types/moments";

export function useFamilyPersonIntegrations({
  familyId,
  personId,
  momentsEnabled,
  eventsEnabled,
}: {
  familyId?: string | null;
  personId?: string | null;
  momentsEnabled: boolean;
  eventsEnabled: boolean;
}) {
  const [moments, setMoments] = useState<MomentPost[]>([]);
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [momentsLoading, setMomentsLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [momentsError, setMomentsError] = useState<unknown>(null);
  const [eventsError, setEventsError] = useState<unknown>(null);

  useEffect(() => {
    setMoments([]);
    setMomentsError(null);
    if (!familyId || !personId || !momentsEnabled) {
      setMomentsLoading(false);
      return;
    }
    setMomentsLoading(true);
    return momentsService.subscribeForPerson(
      familyId,
      personId,
      (items) => { setMoments(items); setMomentsLoading(false); },
      (error) => { setMomentsError(error); setMomentsLoading(false); },
    );
  }, [familyId, momentsEnabled, personId]);

  useEffect(() => {
    setEvents([]);
    setEventsError(null);
    if (!familyId || !personId || !eventsEnabled) {
      setEventsLoading(false);
      return;
    }
    setEventsLoading(true);
    return eventService.subscribeForPerson(
      familyId,
      personId,
      (items) => { setEvents(items); setEventsLoading(false); },
      (error) => { setEventsError(error); setEventsLoading(false); },
    );
  }, [eventsEnabled, familyId, personId]);

  return { moments, events, momentsLoading, eventsLoading, momentsError, eventsError };
}
