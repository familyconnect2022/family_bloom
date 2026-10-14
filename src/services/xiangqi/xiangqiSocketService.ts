import { chessSocketService } from "../chess/chessSocketService";
import {
  XIANGQI_EVENTS,
  type XiangqiAck,
  type XiangqiMoveDelta,
  type XiangqiRealtimeState,
} from "../../types/xiangqiRealtime";

/**
 * P2.17.1 — Xiangqi is a protocol adapter over the process-owned board-game
 * Socket.IO transport. Chess and Xiangqi already live on the same backend URL
 * and namespace, so opening a second socket only adds another handshake and can
 * leave the route waiting for the old 70s connect timeout.
 *
 * One authenticated foreground transport now carries both event families. The
 * server-side single-active-game lock still decides which game session exists;
 * sharing transport changes no game authority or persistence semantics.
 */
class XiangqiSocketService {
  async prewake() {
    return chessSocketService.prewake();
  }

  async connect() {
    return chessSocketService.connect();
  }

  onState(fn: (state: XiangqiRealtimeState) => void) {
    return chessSocketService.onProtocol<XiangqiRealtimeState>(XIANGQI_EVENTS.gameState, fn);
  }

  onMove(fn: (delta: XiangqiMoveDelta) => void) {
    return chessSocketService.onProtocol<XiangqiMoveDelta>(XIANGQI_EVENTS.gameMoveApplied, fn);
  }

  onConnected(fn: () => void) {
    return chessSocketService.on("connected", fn);
  }

  onDisconnected(fn: () => void) {
    return chessSocketService.on("disconnected", fn);
  }

  async emitAck<T = undefined>(
    event: string,
    payload: unknown,
    timeout = 12_000,
  ): Promise<XiangqiAck<T>> {
    return await chessSocketService.emitProtocolAck<T>(event, payload, timeout) as XiangqiAck<T>;
  }

  emitBestEffort(event: string, payload: unknown) {
    chessSocketService.emitBestEffort(event, payload);
  }

  isConnected() {
    return chessSocketService.isConnected();
  }
}

export const xiangqiSocketService = new XiangqiSocketService();
