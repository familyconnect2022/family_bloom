import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { chessSocketService } from "../../services/chess/chessSocketService";
import { CHESS_EVENTS, type ChessAck, type ChessGameState } from "../../types/chess";

const requestId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

export function useChessGame(familyId: string | null, gameId: string | null) {
  const [state, setState] = useState<ChessGameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef<ChessGameState | null>(null);
  const joinedOnceRef = useRef(false);
  stateRef.current = state;

  const resync = useCallback(async () => {
    if (!gameId) return;
    const response = await chessSocketService.emitAck<ChessGameState>(CHESS_EVENTS.gameResync, { gameId });
    if (response.ok) {
      setState(response.data);
      setError(null);
    } else {
      setError(response.errorCode);
    }
  }, [gameId]);

  useEffect(() => {
    if (!familyId || !gameId) return;
    let live = true;

    const stopState = chessSocketService.on("state", (next) => {
      if (live && next.gameId === gameId) {
        setState(next);
        setLoading(false);
        setError(null);
      }
    });

    const rejoin = async () => {
      if (!joinedOnceRef.current || !live) return;
      const response = await chessSocketService.emitAck<ChessGameState>(CHESS_EVENTS.gameJoin, { familyId, gameId });
      if (live && response.ok) {
        setState(response.data);
        setError(null);
      }
    };

    const stopConnected = chessSocketService.on("connected", () => { void rejoin(); });

    void (async () => {
      try {
        await chessSocketService.connect();
        const response = await chessSocketService.emitAck<ChessGameState>(CHESS_EVENTS.gameJoin, { familyId, gameId });
        if (!live) return;
        if (response.ok) {
          joinedOnceRef.current = true;
          setState(response.data);
          setError(null);
        } else {
          setError(response.errorCode);
        }
      } catch {
        if (live) setError("CHESS_SERVER_RECOVERING");
      } finally {
        if (live) setLoading(false);
      }
    })();

    const appState = AppState.addEventListener("change", (next) => {
      if (next === "active") void resync();
    });

    return () => {
      live = false;
      joinedOnceRef.current = false;
      stopState();
      stopConnected();
      appState.remove();
      chessSocketService.disconnectIfIdle(
        stateRef.current?.status === "active" || stateRef.current?.status === "paused" ? gameId : null,
      );
    };
  }, [familyId, gameId, resync]);

  const applyStateMutation = useCallback(async (event: string, payload: Record<string, unknown>): Promise<ChessAck<ChessGameState>> => {
    const response = await chessSocketService.emitAck<ChessGameState>(event, payload);
    if (response.ok) {
      setState(response.data);
      setError(null);
    } else if (response.errorCode === "CHESS_STATE_CONFLICT") {
      void resync();
    }
    return response;
  }, [resync]);

  const move = useCallback((from: string, to: string, promotion?: "q" | "r" | "b" | "n") => {
    const current = stateRef.current;
    if (!current) return Promise.resolve({ ok: false, errorCode: "CHESS_GAME_NOT_FOUND" } as const);
    return applyStateMutation(CHESS_EVENTS.gameMove, {
      requestId: requestId(),
      gameId: current.gameId,
      expectedRevision: current.revision,
      from,
      to,
      promotion,
    });
  }, [applyStateMutation]);

  const resign = useCallback(() => gameId
    ? applyStateMutation(CHESS_EVENTS.gameResign, { requestId: requestId(), gameId })
    : Promise.resolve({ ok: false, errorCode: "CHESS_GAME_NOT_FOUND" } as const), [applyStateMutation, gameId]);

  const offerDraw = useCallback(() => gameId
    ? applyStateMutation(CHESS_EVENTS.drawOffer, { requestId: requestId(), gameId })
    : Promise.resolve({ ok: false, errorCode: "CHESS_GAME_NOT_FOUND" } as const), [applyStateMutation, gameId]);

  const acceptDraw = useCallback(() => gameId
    ? applyStateMutation(CHESS_EVENTS.drawAccept, { requestId: requestId(), gameId })
    : Promise.resolve({ ok: false, errorCode: "CHESS_GAME_NOT_FOUND" } as const), [applyStateMutation, gameId]);

  const rejectDraw = useCallback(() => gameId
    ? applyStateMutation(CHESS_EVENTS.drawReject, { requestId: requestId(), gameId })
    : Promise.resolve({ ok: false, errorCode: "CHESS_GAME_NOT_FOUND" } as const), [applyStateMutation, gameId]);

  const rematch = useCallback(() => gameId
    ? chessSocketService.emitAck<{ waiting: boolean; gameId?: string; state?: ChessGameState }>(CHESS_EVENTS.gameRematch, { requestId: requestId(), gameId })
    : Promise.resolve({ ok: false, errorCode: "CHESS_GAME_NOT_FOUND" } as const), [gameId]);

  return { state, loading, error, resync, move, resign, offerDraw, acceptDraw, rejectDraw, rematch };
}
