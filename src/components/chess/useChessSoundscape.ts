import { useAudioPlayer } from "expo-audio";
import { useCallback, useEffect } from "react";
import { useBoardGameSoundscape } from "../games/useBoardGameSoundscape";

type ReplayablePlayer = {
  seekTo: (seconds: number) => Promise<void> | void;
  play: () => void;
  volume: number;
};

const AUX_SOURCES = {
  reconnect: require("../../../assets/audio/chess/reconnect.wav"),
  challengeSent: require("../../../assets/audio/chess/challenge_sent.wav"),
  challengeAccepted: require("../../../assets/audio/chess/challenge_accepted.wav"),
} as const;

function replay(player: ReplayablePlayer) {
  const seek = player.seekTo(0);
  if (seek && typeof (seek as Promise<void>).then === "function") {
    void (seek as Promise<void>).then(() => player.play()).catch(() => undefined);
    return;
  }
  player.play();
}

/** Chess keeps its connection/challenge UI sounds, while gameplay uses the
 * shared 11-file physical-board vocabulary selected by the user. */
export function useChessSoundscape() {
  const board = useBoardGameSoundscape();
  const reconnect = useAudioPlayer(AUX_SOURCES.reconnect);
  const challengeSent = useAudioPlayer(AUX_SOURCES.challengeSent);
  const challengeAccepted = useAudioPlayer(AUX_SOURCES.challengeAccepted);

  useEffect(() => {
    reconnect.volume = 0.30;
    challengeSent.volume = 0.34;
    challengeAccepted.volume = 0.42;
  }, [challengeAccepted, challengeSent, reconnect]);

  return {
    ...board,
    // Compatibility aliases for non-move call sites while A15 migrates them to
    // semantic gameStart/gameEnd names.
    playMove: board.playMoveSelf,
    playPromotion: board.playPromote,
    playReady: board.playGameStart,
    playWin: board.playGameEnd,
    playLoss: board.playGameEnd,
    playTimeout: board.playGameEnd,
    playReconnect: useCallback(() => replay(reconnect), [reconnect]),
    playChallengeSent: useCallback(() => replay(challengeSent), [challengeSent]),
    playChallengeAccepted: useCallback(() => replay(challengeAccepted), [challengeAccepted]),
  };
}
