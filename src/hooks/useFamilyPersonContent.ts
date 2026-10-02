import { useEffect, useState } from "react";
import { familyPersonContentService } from "../services/familyGraph/familyPersonContentService";
import type { FamilyPersonAlbumMedia, FamilyPersonTimelineEntry } from "../types/familyGraph";

type Options = {
  familyId?: string | null;
  personId?: string | null;
  enabled?: boolean;
};

export const useFamilyPersonContent = ({ familyId, personId, enabled = true }: Options) => {
  const [timeline, setTimeline] = useState<FamilyPersonTimelineEntry[]>([]);
  const [album, setAlbum] = useState<FamilyPersonAlbumMedia[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [albumLoading, setAlbumLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<unknown>(null);
  const [albumError, setAlbumError] = useState<unknown>(null);

  useEffect(() => {
    setTimeline([]);
    setAlbum([]);
    setTimelineError(null);
    setAlbumError(null);
    if (!enabled || !familyId || !personId) {
      setTimelineLoading(false);
      setAlbumLoading(false);
      return;
    }

    setTimelineLoading(true);
    setAlbumLoading(true);

    const unsubscribeTimeline = familyPersonContentService.watchTimeline(
      familyId,
      personId,
      (items) => {
        setTimeline(items);
        setTimelineError(null);
        setTimelineLoading(false);
      },
      (nextError) => {
        setTimelineError(nextError);
        setTimelineLoading(false);
      },
    );

    const unsubscribeAlbum = familyPersonContentService.watchAlbum(
      familyId,
      personId,
      (items) => {
        setAlbum(items);
        setAlbumError(null);
        setAlbumLoading(false);
      },
      (nextError) => {
        setAlbumError(nextError);
        setAlbumLoading(false);
      },
    );

    return () => {
      unsubscribeTimeline();
      unsubscribeAlbum();
    };
  }, [enabled, familyId, personId]);

  return {
    timeline,
    album,
    timelineLoading,
    albumLoading,
    timelineError,
    albumError,
    error: timelineError ?? albumError,
  };
};
