import { useCallback, useEffect, useRef } from "react";

export type WebGameSound = "capture" | "castle" | "game-end" | "game-start" | "illegal" | "move-check" | "move-opponent" | "move-self" | "premove" | "promote" | "tenseconds";
const SOUNDS: WebGameSound[] = ["capture","castle","game-end","game-start","illegal","move-check","move-opponent","move-self","premove","promote","tenseconds"];

export function useWebGameAudio() {
  const players = useRef(new Map<WebGameSound, HTMLAudioElement>());
  const unlocked = useRef(false);
  useEffect(() => {
    if (typeof Audio === "undefined") return;
    for (const name of SOUNDS) {
      const player = new Audio(`/audio/board-game/${name}.mp3`);
      player.preload = "auto";
      players.current.set(name, player);
    }
    return () => { for (const player of players.current.values()) { player.pause(); player.src = ""; } players.current.clear(); };
  }, []);
  const unlock = useCallback(() => { unlocked.current = true; for (const p of players.current.values()) p.load(); }, []);
  const play = useCallback((name: WebGameSound, volume = 0.9) => {
    if (!unlocked.current) return;
    const original = players.current.get(name);
    if (!original) return;
    const p = original.cloneNode(true) as HTMLAudioElement;
    p.volume = Math.max(0, Math.min(1, volume));
    void p.play().catch(() => undefined);
  }, []);
  return { unlock, play };
}
