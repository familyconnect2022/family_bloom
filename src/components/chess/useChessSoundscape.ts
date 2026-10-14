import { useCallback } from "react";
import { useBoardGameSoundscape, type BoardMoveSoundKind } from "../games/useBoardGameSoundscape";

const noopChessSound = () => undefined;

/**
 * Chess uses the exact 11-file physical-board sound set supplied by the user.
 *
 * P2.14 intentionally removes the parallel assets/audio/chess WAV bank that
 * P2.13 had started using. Keeping one preloaded native player per supplied cue
 * avoids two competing sound banks, reduces player count, and guarantees that
 * every audible Chess event comes from the user's original recordings.
 */
export function useChessSoundscape(enabled = true) {
  const board = useBoardGameSoundscape(enabled);

  const playMoveKind = useCallback((kind: BoardMoveSoundKind) => {
    board.playMoveKind(kind);
  }, [board]);

  return {
    ...board,
    playMoveKind,
    playMove: board.playMoveSelf,
    playMoveSelf: board.playMoveSelf,
    playMoveOpponent: board.playMoveOpponent,
    playCapture: board.playCapture,
    playCheck: board.playCheck,
    playPromotion: board.playPromote,
    playPromote: board.playPromote,
    playPremove: board.playPremove,
    // The supplied set has one start/ready cue and one terminal cue. Do not
    // substitute generated WAVs for win/loss/timeout/reconnect/challenge.
    playReady: board.playGameStart,
    playGameStart: board.playGameStart,
    playWin: board.playGameEnd,
    playLoss: board.playGameEnd,
    playTimeout: board.playGameEnd,
    playReconnect: board.playPremove,
    playChallengeSent: board.playPremove,
    // The active-state transition owns the single game-start cue. Playing it
    // again on challenge acceptance produced two audible start cues on Android.
    playChallengeAccepted: noopChessSound,
  };
}
