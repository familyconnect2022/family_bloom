import { preload, useAudioPlayer, type AudioPlayer, type AudioSource } from "expo-audio";
import {
  createContext,
  createElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type BoardMoveSoundKind = "self" | "opponent" | "capture" | "check" | "castle" | "promote";

const SOURCES = {
  gameStart: require("../../../assets/audio/board-game/game-start.mp3"),
  moveSelf: require("../../../assets/audio/board-game/move-self.mp3"),
  moveOpponent: require("../../../assets/audio/board-game/move-opponent.mp3"),
  capture: require("../../../assets/audio/board-game/capture.mp3"),
  check: require("../../../assets/audio/board-game/move-check.mp3"),
  castle: require("../../../assets/audio/board-game/castle.mp3"),
  promote: require("../../../assets/audio/board-game/promote.mp3"),
  premove: require("../../../assets/audio/board-game/premove.mp3"),
  illegal: require("../../../assets/audio/board-game/illegal.mp3"),
  tenSeconds: require("../../../assets/audio/board-game/tenseconds.mp3"),
  gameEnd: require("../../../assets/audio/board-game/game-end.mp3"),
} as const satisfies Record<string, AudioSource>;

const ALL_SOURCES = Object.values(SOURCES);

// Process-lifetime source-cache warmup. P2.15.3 mounts this bank after app first
// paint, before either board game route opens. The first legal moves therefore do
// not become accidental "load requests" that can surface seconds later as stale
// duplicate cues. Chess and Xiangqi share this one native bank.
let boardAudioPreloadPromise: Promise<boolean> | null = null;
let boardAudioPreloadSettled = false;
let boardAudioPreloadSucceeded = false;

function ensureBoardAudioPreloaded() {
  if (boardAudioPreloadSettled) return Promise.resolve(boardAudioPreloadSucceeded);
  if (!boardAudioPreloadPromise) {
    boardAudioPreloadPromise = Promise.allSettled(ALL_SOURCES.map((source) => preload(source)))
      .then((results) => {
        boardAudioPreloadSucceeded = results.every((result) => result.status === "fulfilled");
        boardAudioPreloadSettled = true;
        return boardAudioPreloadSucceeded;
      });
  }
  return boardAudioPreloadPromise;
}

// P2.15.5: asset bytes start warming as soon as the app module graph loads, not
// only after BloomSurfaceStack reaches its deferred background-warm phase. These
// are tiny local MP3s; beginning the cache fill early removes the recurring real-
// device pattern where move #1/#2 are the calls that accidentally pay audio I/O.
void ensureBoardAudioPreloaded();

export type ReliableAudioCue = {
  player: AudioPlayer;
  loaded: boolean;
  play: () => void;
};

/**
 * One long-lived native player per supplied physical-board cue.
 *
 * P2.15 details:
 * - a cue requested while detached wakes attachment immediately;
 * - the newest request token owns the seek/play continuation, preventing stale
 *   async seek completions from replaying an older move after a newer one;
 * - idle polling stops after a bounded recovery window and wakes again only on
 *   a real cue request, so a failed player cannot leave 11 permanent JS timers;
 * - no gameplay path awaits audio readiness.
 */
export function useReliableAudioCue(source: AudioSource, enabled = true): ReliableAudioCue {
  // Bind the local asset at player creation. P2.15.4 created every player with a
  // null source and relied on replace()+polling; on some Android builds the first
  // two move requests arrived while those native players were still detached.
  // Direct binding plus eager module-level preload makes the normal path already
  // loaded long before the user can make a move.
  const player = useAudioPlayer(enabled ? source : null, { updateInterval: 80, downloadFirst: true });
  const [loaded, setLoaded] = useState(() => !!player.isLoaded);
  const playRequestRef = useRef(0);
  const hasPlayedRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAttachAttemptAtRef = useRef(0);

  const ensureAttached = useCallback(() => {
    if (!enabled || player.isLoaded) return;
    const now = Date.now();
    // replace() is recovery, not the normal loading path. Replacing the same
    // source repeatedly while Android is still decoding can restart attachment
    // and cause exactly the cold first-move silence we are preventing.
    if (now - lastAttachAttemptAtRef.current < 480) return;
    lastAttachAttemptAtRef.current = now;
    try { player.replace(source); } catch { /* later bounded recovery may retry */ }
  }, [enabled, player, source]);

  useEffect(() => {
    if (!enabled) {
      setLoaded(false);
      hasPlayedRef.current = false;
      return undefined;
    }
    let live = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const startedAt = Date.now();
    const poll = () => {
      if (!live) return;
      const ready = !!player.isLoaded;
      setLoaded(ready);
      const elapsed = Date.now() - startedAt;
      if (ready || elapsed >= 3000) return;
      // Source is already bound at useAudioPlayer creation. Give native decode a
      // real grace period before asking replace() to recover a detached player.
      if (elapsed >= 700) ensureAttached();
      timer = setTimeout(poll, 40);
    };
    poll();
    return () => {
      live = false;
      if (timer) clearTimeout(timer);
    };
  }, [enabled, ensureAttached, player]);

  useEffect(() => () => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
  }, []);

  const play = useCallback(() => {
    if (!enabled) return;
    const requestId = ++playRequestRef.current;
    const requestedAt = Date.now();
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    const attempt = (retryCount: number) => {
      if (requestId !== playRequestRef.current || !enabled) return;
      // Never let a missed cue wake up on a later chess move. We only retry
      // inside the perceptual window of the current gesture/animation.
      if (Date.now() - requestedAt > 140) return;
      if (!player.isLoaded) {
        // First retry simply gives the already-bound player one short decode
        // window. Only subsequent retries request a rate-limited recovery attach.
        if (retryCount > 0) ensureAttached();
        if (retryCount < 3) {
          retryTimerRef.current = setTimeout(() => attempt(retryCount + 1), retryCount === 0 ? 24 : 42);
        }
        return;
      }

      setLoaded(true);
      if (!hasPlayedRef.current) {
        try {
          player.play();
          hasPlayedRef.current = true;
        } catch {
          ensureAttached();
        }
        return;
      }

      void player.seekTo(0).then(() => {
        if (requestId !== playRequestRef.current || !enabled || !player.isLoaded) return;
        if (Date.now() - requestedAt > 140) return;
        try {
          player.play();
          hasPlayedRef.current = true;
        } catch {
          ensureAttached();
        }
      }).catch(() => {
        if (requestId === playRequestRef.current) ensureAttached();
      });
    };

    attempt(0);
  }, [enabled, ensureAttached, player]);

  return { player, loaded, play };
}

export type BoardGameSoundscape = {
  readonly audioReady: boolean;
  readonly criticalAudioReady: boolean;
  readonly audioLoadedCount: number;
  readonly audioExpectedCount: number;
  playMoveKind: (kind: BoardMoveSoundKind) => void;
  playGameStart: () => void;
  playMoveSelf: () => void;
  playMoveOpponent: () => void;
  playCapture: () => void;
  playCheck: () => void;
  playCastle: () => void;
  playPromote: () => void;
  playPremove: () => void;
  playIllegal: () => void;
  playTenSeconds: () => void;
  playGameEnd: () => void;
};

const noop = () => undefined;
const NO_SOUND: BoardGameSoundscape = {
  audioReady: false,
  criticalAudioReady: false,
  audioLoadedCount: 0,
  audioExpectedCount: ALL_SOURCES.length,
  playMoveKind: noop,
  playGameStart: noop,
  playMoveSelf: noop,
  playMoveOpponent: noop,
  playCapture: noop,
  playCheck: noop,
  playCastle: noop,
  playPromote: noop,
  playPremove: noop,
  playIllegal: noop,
  playTenSeconds: noop,
  playGameEnd: noop,
};

const BoardGameAudioContext = createContext<BoardGameSoundscape>(NO_SOUND);

function useBoardGameAudioBank(enabled: boolean): BoardGameSoundscape {
  useEffect(() => { if (enabled) void ensureBoardAudioPreloaded(); }, [enabled]);

  const gameStart = useReliableAudioCue(SOURCES.gameStart, enabled);
  const moveSelf = useReliableAudioCue(SOURCES.moveSelf, enabled);
  const moveOpponent = useReliableAudioCue(SOURCES.moveOpponent, enabled);
  const capture = useReliableAudioCue(SOURCES.capture, enabled);
  const check = useReliableAudioCue(SOURCES.check, enabled);
  const castle = useReliableAudioCue(SOURCES.castle, enabled);
  const promote = useReliableAudioCue(SOURCES.promote, enabled);
  const premove = useReliableAudioCue(SOURCES.premove, enabled);
  const illegal = useReliableAudioCue(SOURCES.illegal, enabled);
  const tenSeconds = useReliableAudioCue(SOURCES.tenSeconds, enabled);
  const gameEnd = useReliableAudioCue(SOURCES.gameEnd, enabled);

  useEffect(() => {
    gameStart.player.volume = 0.56;
    moveSelf.player.volume = 0.66;
    moveOpponent.player.volume = 0.62;
    capture.player.volume = 0.70;
    check.player.volume = 0.68;
    castle.player.volume = 0.68;
    promote.player.volume = 0.70;
    premove.player.volume = 0.44;
    illegal.player.volume = 0.46;
    tenSeconds.player.volume = 0.52;
    gameEnd.player.volume = 0.60;
  }, [capture.player, castle.player, check.player, gameEnd.player, gameStart.player, illegal.player, moveOpponent.player, moveSelf.player, premove.player, promote.player, tenSeconds.player]);

  const playMoveKind = useCallback((kind: BoardMoveSoundKind) => {
    if (kind === "promote") promote.play();
    else if (kind === "castle") castle.play();
    else if (kind === "check") check.play();
    else if (kind === "capture") capture.play();
    else if (kind === "opponent") moveOpponent.play();
    else moveSelf.play();
  }, [capture.play, castle.play, check.play, moveOpponent.play, moveSelf.play, promote.play]);

  // Keep the Context identity independent from per-player loaded-state changes.
  // This prevents the persistent Chess/Xiangqi trees from rerendering 11 times as
  // Android attaches the bank. Readiness remains queryable through getters.
  const cues = [
    gameStart, moveSelf, moveOpponent, capture, check, castle, promote, premove, illegal, tenSeconds, gameEnd,
  ];
  const loadedCount = cues.reduce((count, cue) => count + (cue.loaded ? 1 : 0), 0);
  const audioReady = loadedCount === cues.length;
  // Gameplay cannot become authoritative/interactive while the physical-board
  // vocabulary that can occur on move #1 is still detached. This flips at most
  // once per process-wide audio-bank mount, so consumers pay one readiness
  // rerender instead of eleven player-by-player rerenders.
  const criticalAudioReady = gameStart.loaded
    && moveSelf.loaded
    && moveOpponent.loaded
    && capture.loaded
    && check.loaded
    && castle.loaded
    && promote.loaded
    && gameEnd.loaded;
  const readinessRef = useRef({ loaded: 0, ready: false });
  readinessRef.current.loaded = loadedCount;
  readinessRef.current.ready = audioReady;

  return useMemo<BoardGameSoundscape>(() => ({
    get audioReady() { return readinessRef.current.ready; },
    criticalAudioReady,
    get audioLoadedCount() { return readinessRef.current.loaded; },
    get audioExpectedCount() { return ALL_SOURCES.length; },
    playMoveKind,
    playGameStart: gameStart.play,
    playMoveSelf: moveSelf.play,
    playMoveOpponent: moveOpponent.play,
    playCapture: capture.play,
    playCheck: check.play,
    playCastle: castle.play,
    playPromote: promote.play,
    playPremove: premove.play,
    playIllegal: illegal.play,
    playTenSeconds: tenSeconds.play,
    playGameEnd: gameEnd.play,
  }), [
    capture.play,
    criticalAudioReady,
    castle.play,
    check.play,
    gameEnd.play,
    gameStart.play,
    illegal.play,
    moveOpponent.play,
    moveSelf.play,
    playMoveKind,
    premove.play,
    promote.play,
    tenSeconds.play,
  ]);
}

function EnabledBoardGameAudioProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const value = useBoardGameAudioBank(enabled);
  return createElement(BoardGameAudioContext.Provider, { value }, children);
}

/**
 * Process-wide owner of the exact 11-file board-game sound bank.
 * It mounts once after either board game is prepared and remains mounted while
 * the persistent game plane exists, so switching Chess <-> Xiangqi cannot create
 * competing native players or cold-start the same cue again.
 */
export function BoardGameAudioProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  // Keep one provider/component identity across startup. Toggling warm readiness
  // must attach/detach audio players only; it must never remount RootNavigator or
  // a live board-game route.
  return createElement(EnabledBoardGameAudioProvider, { enabled }, children);
}

/** Shared physical-board vocabulary for Chess + Xiangqi. */
export function useBoardGameSoundscape(enabled = true): BoardGameSoundscape {
  const value = useContext(BoardGameAudioContext);
  return enabled ? value : NO_SOUND;
}
