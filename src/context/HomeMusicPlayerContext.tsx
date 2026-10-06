import { createVideoPlayer, type VideoPlayer } from "expo-video";
import type { ReactNode } from "react";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { homeMusicService } from "@/services/home/music/homeMusicService";
import type { HomeMusicTrack } from "@/types/homeLiving";

type HomeMusicPlayerControlsValue = {
  currentTrack: HomeMusicTrack | null;
  playTrack: (track: HomeMusicTrack, queue?: HomeMusicTrack[]) => Promise<void>;
};

type HomeMusicPlayerValue = {
  currentTrack: HomeMusicTrack | null;
  queue: HomeMusicTrack[];
  currentIndex: number;
  playing: boolean;
  loading: boolean;
  currentTime: number;
  duration: number;
  error: string | null;
  playTrack: (track: HomeMusicTrack, queue?: HomeMusicTrack[]) => Promise<void>;
  toggle: () => void;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seekTo: (seconds: number) => void;
};

const HomeMusicPlayerContext = createContext<HomeMusicPlayerValue | null>(null);
const HomeMusicPlayerControlsContext = createContext<HomeMusicPlayerControlsValue | null>(null);

export function HomeMusicPlayerProvider({ children }: { children: ReactNode }) {
  const { activeFamilyId } = useAuth();
  const [player] = useState<VideoPlayer>(() => createVideoPlayer(null));
  const [currentTrack, setCurrentTrack] = useState<HomeMusicTrack | null>(null);
  const [queue, setQueue] = useState<HomeMusicTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const queueRef = useRef<HomeMusicTrack[]>([]);
  const indexRef = useRef(-1);
  const currentTrackRef = useRef<HomeMusicTrack | null>(null);
  const familyRef = useRef(activeFamilyId);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  useEffect(() => {
    indexRef.current = currentIndex;
  }, [currentIndex]);
  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  const loadTrack = useCallback(async (track: HomeMusicTrack, index: number, nextQueue: HomeMusicTrack[]) => {
    setLoading(true);
    setError(null);
    try {
      const playableTrack = await homeMusicService.resolveForPlayback(track);
      const streamUri = homeMusicService.provider.streamUrl(playableTrack);
      await player.replaceAsync({
        uri: streamUri,
        contentType: "auto",
        useCaching: true,
        metadata: { title: track.title, artist: track.artist, artwork: playableTrack.artworkUrl ?? track.artworkUrl ?? undefined },
      });
      player.staysActiveInBackground = true;
      player.showNowPlayingNotification = true;
      player.audioMixingMode = "auto";
      player.timeUpdateEventInterval = 1;
      setCurrentTrack(playableTrack);
      setQueue(nextQueue);
      setCurrentIndex(index);
      setCurrentTime(0);
      setDuration(track.durationSec || player.duration || 0);
      player.play();
    } catch (e) {
      const raw = e instanceof Error ? e.message : "";
      setError(raw === "TRACK_NOT_AVAILABLE"
        ? "Bài này hiện chưa nghe trực tiếp được trong Bloom."
        : "Bloom chưa phát được bài này lúc này. Thử lại sau nhé.");
    } finally {
      setLoading(false);
    }
  }, [player]);

  const playTrack = useCallback(async (track: HomeMusicTrack, requestedQueue?: HomeMusicTrack[]) => {
    const nextQueue = requestedQueue?.length ? requestedQueue : (queueRef.current.length ? queueRef.current : [track]);
    const index = Math.max(0, nextQueue.findIndex(item => item.id === track.id));
    if (currentTrackRef.current?.id === track.id) {
      if (!player.playing) player.play();
      return;
    }
    await loadTrack(track, index, nextQueue);
  }, [loadTrack, player]);

  const next = useCallback(async () => {
    const list = queueRef.current;
    if (!list.length) return;
    const nextIndex = indexRef.current + 1;
    if (nextIndex >= list.length) { player.pause(); return; }
    await loadTrack(list[nextIndex], nextIndex, list);
  }, [loadTrack, player]);

  const previous = useCallback(async () => {
    const list = queueRef.current;
    if (!list.length) return;
    if (player.currentTime > 4) { player.currentTime = 0; return; }
    const previousIndex = Math.max(0, indexRef.current - 1);
    await loadTrack(list[previousIndex], previousIndex, list);
  }, [loadTrack, player]);

  const toggle = useCallback(() => {
    if (!currentTrack) return;
    if (player.playing) player.pause(); else player.play();
  }, [currentTrack, player]);

  const seekTo = useCallback((seconds: number) => {
    player.currentTime = Math.max(0, Math.min(seconds, player.duration || seconds));
  }, [player]);

  useEffect(() => {
    const playingSub = player.addListener("playingChange", event => setPlaying(event.isPlaying));
    const timeSub = player.addListener("timeUpdate", event => setCurrentTime(event.currentTime));
    const loadSub = player.addListener("sourceLoad", event => setDuration(event.duration || 0));
    const statusSub = player.addListener("statusChange", event => {
      setLoading(event.status === "loading");
      if (event.status === "error") setError(event.error?.message || "Nguồn nhạc tạm thời không phát được.");
    });
    const endSub = player.addListener("playToEnd", () => { void next(); });
    return () => {
      playingSub.remove(); timeSub.remove(); loadSub.remove(); statusSub.remove(); endSub.remove();
    };
  }, [next, player]);

  useEffect(() => {
    if (familyRef.current === activeFamilyId) return;
    familyRef.current = activeFamilyId;
    player.pause();
    void player.replaceAsync(null).catch(() => {});
    setCurrentTrack(null); setQueue([]); setCurrentIndex(-1); setCurrentTime(0); setDuration(0); setError(null);
  }, [activeFamilyId, player]);

  useEffect(() => () => player.release(), [player]);

  return (
    <HomeMusicPlayerControlsContext.Provider value={{ currentTrack, playTrack }}>
      <HomeMusicPlayerContext.Provider value={{ currentTrack, queue, currentIndex, playing, loading, currentTime, duration, error, playTrack, toggle, next, previous, seekTo }}>
        {children}
      </HomeMusicPlayerContext.Provider>
    </HomeMusicPlayerControlsContext.Provider>
  );
}

export function useHomeMusicPlayerControls() {
  const value = useContext(HomeMusicPlayerControlsContext);
  if (!value) throw new Error("useHomeMusicPlayerControls must be used inside HomeMusicPlayerProvider");
  return value;
}

export function useHomeMusicPlayer() {
  const value = useContext(HomeMusicPlayerContext);
  if (!value) throw new Error("useHomeMusicPlayer must be used inside HomeMusicPlayerProvider");
  return value;
}
