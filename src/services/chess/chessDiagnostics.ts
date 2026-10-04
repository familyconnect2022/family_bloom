export type ChessDiagnosticStage =
  | "piece_hit"
  | "square_hit"
  | "drop_target"
  | "drop_target_adjusted"
  | "input_blocked"
  | "selection"
  | "attempt_start"
  | "attempt_blocked"
  | "local_validate_ok"
  | "local_validate_illegal"
  | "premove_queued"
  | "premove_set"
  | "premove_replace"
  | "premove_clear"
  | "premove_blocked"
  | "premove_invalid"
  | "premove_fire"
  | "premove_revalidate_ok"
  | "premove_revalidate_fail"
  | "optimistic_start"
  | "optimistic_settle"
  | "socket_emit"
  | "socket_ack_ok"
  | "socket_ack_fail"
  | "move_applied_received"
  | "delta_commit_applied"
  | "delta_commit_stale"
  | "delta_commit_gap"
  | "board_delta_start"
  | "authoritative_commit"
  | "visual_settle"
  | "resync_start"
  | "resync_ok"
  | "resync_fail"
  | "snapshot_commit";

export type ChessDiagnosticEvent = {
  seq: number;
  atMs: number;
  gameId: string;
  stage: ChessDiagnosticStage;
  clientMoveId?: string;
  from?: string;
  to?: string;
  version?: number;
  detail?: string;
};

type Listener = () => void;

const MAX_EVENTS = 240;
let seq = 0;
let events: ChessDiagnosticEvent[] = [];
const listeners = new Set<Listener>();

export const CHESS_DIAGNOSTICS_ENABLED = false;

export const chessDiagnostics = {
  mark(event: Omit<ChessDiagnosticEvent, "seq" | "atMs">) {
    if (!CHESS_DIAGNOSTICS_ENABLED) return;
    events.push({ ...event, seq: ++seq, atMs: Date.now() });
    if (events.length > MAX_EVENTS) events = events.slice(events.length - MAX_EVENTS);
    listeners.forEach((listener) => listener());
  },
  snapshot(gameId?: string) {
    const selected = gameId ? events.filter((event) => event.gameId === gameId) : events;
    return selected.slice();
  },
  clear(gameId?: string) {
    events = gameId ? events.filter((event) => event.gameId !== gameId) : [];
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
