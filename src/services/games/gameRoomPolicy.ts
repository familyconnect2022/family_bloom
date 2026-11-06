import type { HomeGameSession } from "../../types/homeLiving";

export const HOME_GAME_TIMEZONE = "Asia/Ho_Chi_Minh";
export const HOME_GAME_OPEN_HOUR = 6;
export const HOME_GAME_CLOSE_HOUR = 22;
export const HOME_GAME_MAX_ACTIVE_PER_TYPE = 4;
export const HOME_GAME_ROUND_DURATION_MS = 4 * 60 * 60 * 1000;

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

export type HomeGamePlayWindow = {
  canCreate: boolean;
  localHour: number;
  localMinute: number;
  playDateKey: string;
  startsAtMs: number;
  endsAtMs: number;
  message: string | null;
};

const pad2 = (value: number) => String(value).padStart(2, "0");

/**
 * Family Bloom V1 uses Asia/Ho_Chi_Minh as the authoritative family timezone.
 * Viet Nam is UTC+7 year-round, so this deliberately avoids device timezone.
 * The absolute clock still comes from Date.now(); Firestore Rules re-check the
 * create/response window using request.time on the server.
 */
export function getHomeGamePlayWindow(nowMs = Date.now()): HomeGamePlayWindow {
  const shifted = new Date(nowMs + VN_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth();
  const day = shifted.getUTCDate();
  const localHour = shifted.getUTCHours();
  const localMinute = shifted.getUTCMinutes();
  const startsAtMs = Date.UTC(year, month, day, HOME_GAME_OPEN_HOUR - 7, 0, 0, 0);
  const roomClosesAtMs = Date.UTC(year, month, day, HOME_GAME_CLOSE_HOUR - 7, 0, 0, 0);
  const endsAtMs = Math.min(roomClosesAtMs, nowMs + HOME_GAME_ROUND_DURATION_MS);
  const canCreate = localHour >= HOME_GAME_OPEN_HOUR && localHour < HOME_GAME_CLOSE_HOUR;
  const playDateKey = `${year}-${pad2(month + 1)}-${pad2(day)}`;
  const message = canCreate
    ? null
    : localHour < HOME_GAME_OPEN_HOUR
      ? "Nhà mình nghỉ ngơi thêm một chút nhé 🌙 Trò chơi mới sẽ mở từ 6:00 sáng."
      : "Nhà mình nghỉ ngơi nhé 🌙 Trò chơi mới sẽ mở lại từ 6:00 sáng mai.";
  return { canCreate, localHour, localMinute, playDateKey, startsAtMs, endsAtMs, message };
}

export function isHomeGameExpired(session: Pick<HomeGameSession, "endsAtMs" | "status">, nowMs = Date.now()) {
  return session.status === "completed" || (!!session.endsAtMs && nowMs >= session.endsAtMs);
}

export function homeGameStatusLabel(session: Pick<HomeGameSession, "endsAtMs" | "status">, nowMs = Date.now()) {
  if (isHomeGameExpired(session, nowMs)) return "Đã khép lại";
  if (session.status === "revealed") return "Đã mở kết quả";
  return "Đang chơi";
}

export function formatHomeGameDeadline(endsAtMs: number | null) {
  if (!endsAtMs) return "";
  const shifted = new Date(endsAtMs + VN_OFFSET_MS);
  return `${pad2(shifted.getUTCHours())}:${pad2(shifted.getUTCMinutes())}`;
}
