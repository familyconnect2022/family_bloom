import { ChessDomainError } from "./chessTypes.js";

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const OPEN_HOUR = 6;
const CLOSE_HOUR = 22;

export function isFamilyGameCreationOpen(nowMs = Date.now()) {
  const shifted = new Date(nowMs + VN_OFFSET_MS);
  const hour = shifted.getUTCHours();
  return hour >= OPEN_HOUR && hour < CLOSE_HOUR;
}

export function assertFamilyGameCreationOpen(nowMs = Date.now()) {
  if (!isFamilyGameCreationOpen(nowMs)) {
    throw new ChessDomainError(
      "CHESS_QUIET_HOURS",
      "Nhà mình nghỉ ngơi nhé 🌙 Mình hẹn nhau chơi tiếp từ 6:00 sáng.",
    );
  }
}
