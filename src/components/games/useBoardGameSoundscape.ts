import { useAudioPlayer } from "expo-audio";
import { useCallback, useEffect } from "react";

export type BoardMoveSoundKind = "self" | "opponent" | "capture" | "check" | "castle" | "promote";

type ReplayablePlayer = {
  seekTo: (seconds: number) => Promise<void> | void;
  play: () => void;
  volume: number;
};

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
} as const;

function replay(player: ReplayablePlayer) {
  const seek = player.seekTo(0);
  if (seek && typeof (seek as Promise<void>).then === "function") {
    void (seek as Promise<void>).then(() => player.play()).catch(() => undefined);
    return;
  }
  player.play();
}

/**
 * Shared physical-board sound vocabulary for Chess + Xiangqi.
 * Move sounds are intentionally fired by each renderer at the LANDING boundary,
 * not when a network packet or React state update first arrives.
 */
export function useBoardGameSoundscape() {
  const gameStart = useAudioPlayer(SOURCES.gameStart);
  const moveSelf = useAudioPlayer(SOURCES.moveSelf);
  const moveOpponent = useAudioPlayer(SOURCES.moveOpponent);
  const capture = useAudioPlayer(SOURCES.capture);
  const check = useAudioPlayer(SOURCES.check);
  const castle = useAudioPlayer(SOURCES.castle);
  const promote = useAudioPlayer(SOURCES.promote);
  const premove = useAudioPlayer(SOURCES.premove);
  const illegal = useAudioPlayer(SOURCES.illegal);
  const tenSeconds = useAudioPlayer(SOURCES.tenSeconds);
  const gameEnd = useAudioPlayer(SOURCES.gameEnd);

  useEffect(() => {
    gameStart.volume = 0.56;
    moveSelf.volume = 0.66;
    moveOpponent.volume = 0.62;
    capture.volume = 0.70;
    check.volume = 0.68;
    castle.volume = 0.68;
    promote.volume = 0.70;
    premove.volume = 0.44;
    illegal.volume = 0.46;
    tenSeconds.volume = 0.52;
    gameEnd.volume = 0.60;
  }, [capture, castle, check, gameEnd, gameStart, illegal, moveOpponent, moveSelf, premove, promote, tenSeconds]);

  const playMoveKind = useCallback((kind: BoardMoveSoundKind) => {
    if (kind === "promote") replay(promote);
    else if (kind === "castle") replay(castle);
    else if (kind === "check") replay(check);
    else if (kind === "capture") replay(capture);
    else if (kind === "opponent") replay(moveOpponent);
    else replay(moveSelf);
  }, [capture, castle, check, moveOpponent, moveSelf, promote]);

  return {
    playMoveKind,
    playGameStart: useCallback(() => replay(gameStart), [gameStart]),
    playMoveSelf: useCallback(() => replay(moveSelf), [moveSelf]),
    playMoveOpponent: useCallback(() => replay(moveOpponent), [moveOpponent]),
    playCapture: useCallback(() => replay(capture), [capture]),
    playCheck: useCallback(() => replay(check), [check]),
    playCastle: useCallback(() => replay(castle), [castle]),
    playPromote: useCallback(() => replay(promote), [promote]),
    playPremove: useCallback(() => replay(premove), [premove]),
    playIllegal: useCallback(() => replay(illegal), [illegal]),
    playTenSeconds: useCallback(() => replay(tenSeconds), [tenSeconds]),
    playGameEnd: useCallback(() => replay(gameEnd), [gameEnd]),
  };
}
