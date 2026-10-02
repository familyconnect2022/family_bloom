import type { HomeMusicTrack } from "@/types/homeLiving";
import type { MusicProvider, MusicSearchOptions } from "./musicProvider";

const API_ROOT = "https://api.audius.co/v1";
const DEFAULT_LIMIT = 20;
const REQUEST_TIMEOUT_MS = 6_500;

type AudiusArtwork = { "150x150"?: string; "480x480"?: string; "1000x1000"?: string } | null;
type AudiusTrack = {
  id?: string;
  title?: string;
  duration?: number;
  genre?: string;
  mood?: string;
  release_date?: string;
  artwork?: AudiusArtwork;
  user?: { name?: string; handle?: string };
  artist_name?: string;
  is_stream_gated?: boolean;
};

type AudiusResponse = { data?: AudiusTrack[] };

const toTrack = (raw: AudiusTrack): HomeMusicTrack | null => {
  const providerTrackId = String(raw.id ?? "").trim();
  const title = String(raw.title ?? "").trim();
  if (!providerTrackId || !title || raw.is_stream_gated) return null;
  const artwork = raw.artwork ?? null;
  return {
    id: `audius:${providerTrackId}`,
    provider: "audius",
    providerTrackId,
    title,
    artist: String(raw.user?.name || raw.artist_name || raw.user?.handle || "Nghệ sĩ Audius").trim(),
    artworkUrl: artwork?.["480x480"] || artwork?.["150x150"] || artwork?.["1000x1000"] || null,
    durationSec: Math.max(0, Number(raw.duration ?? 0) || 0),
    genre: raw.genre ? String(raw.genre) : null,
    mood: raw.mood ? String(raw.mood) : null,
    releaseDate: raw.release_date ? String(raw.release_date) : null,
  };
};

const requestTracks = async (path: string, params: Record<string, string | number | undefined>, signal?: AbortSignal) => {
  const url = new URL(`${API_ROOT}${path}`);
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== "") url.searchParams.set(key, String(value));

  if (signal?.aborted) throw new Error("Nguồn nhạc đã dừng chờ.");
  const controller = new AbortController();
  const forwardAbort = () => controller.abort();
  signal?.addEventListener?.("abort", forwardAbort, { once: true });
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Nguồn nhạc đang bận (${response.status}).`);
    const payload = await response.json() as AudiusResponse;
    return (payload.data ?? []).map(toTrack).filter((track): track is HomeMusicTrack => !!track);
  } catch (error) {
    if (signal?.aborted) throw new Error("Nguồn nhạc đã dừng chờ.");
    if (controller.signal.aborted) throw new Error("Nguồn nhạc phản hồi chậm.");
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener?.("abort", forwardAbort);
  }
};

export const audiusMusicProvider: MusicProvider = {
  id: "audius",

  search(query: string, options: MusicSearchOptions = {}) {
    return requestTracks("/tracks/search", {
      query: query.trim(),
      limit: Math.max(1, Math.min(options.limit ?? DEFAULT_LIMIT, 40)),
      offset: Math.max(0, options.offset ?? 0),
      sort_method: options.sort ?? "relevant",
    }, options.signal);
  },

  trending(limit = DEFAULT_LIMIT, signal?: AbortSignal) {
    return requestTracks("/tracks/trending", { time: "week", limit: Math.max(1, Math.min(limit, 40)) }, signal);
  },

  recent(limit = DEFAULT_LIMIT, signal?: AbortSignal) {
    return requestTracks("/tracks/search", {
      limit: Math.max(1, Math.min(limit, 40)),
      sort_method: "recent",
    }, signal);
  },

  streamUrl(track: HomeMusicTrack) {
    return `${API_ROOT}/tracks/${encodeURIComponent(track.providerTrackId)}/stream`;
  },
};
