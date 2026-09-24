/** Backward-compatible export. All error normalization/mapping lives in errorService. */
export { errorService, parseAppError, toAppError } from "../services/error/errorService";
export type { FriendlyError } from "../services/error/errorService";
