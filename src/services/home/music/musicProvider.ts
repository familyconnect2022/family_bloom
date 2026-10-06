import type { HomeMusicTrack } from "@/types/homeLiving";

export type MusicSearchOptions = {
  limit?: number;
  offset?: number;
  sort?: "relevant" | "popular" | "recent";
  signal?: AbortSignal;
};

export interface MusicProvider {
  readonly id: HomeMusicTrack["provider"];
  search(query: string, options?: MusicSearchOptions): Promise<HomeMusicTrack[]>;
  trending(limit?: number, signal?: AbortSignal): Promise<HomeMusicTrack[]>;
  recent(limit?: number, signal?: AbortSignal): Promise<HomeMusicTrack[]>;
  streamUrl(track: HomeMusicTrack): string;
}
