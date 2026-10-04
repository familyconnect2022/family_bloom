export type ChessDiagnosticStage =
  | "PIECE_HIT"
  | "SQUARE_HIT"
  | "DRAG_START"
  | "DROP"
  | "SELECT"
  | "ATTEMPT"
  | "LOCAL_VALIDATE_OK"
  | "LOCAL_VALIDATE_FAIL"
  | "PREMOVE_QUEUED"
  | "OPTIMISTIC_START"
  | "OPTIMISTIC_SETTLE"
  | "MOVE_HOOK"
  | "SOCKET_EMIT"
  | "SOCKET_ACK_OK"
  | "SOCKET_ACK_REJECT"
  | "MOVE_APPLIED_RX"
  | "DELTA_COMMIT_APPLIED"
  | "DELTA_COMMIT_STALE"
  | "DELTA_COMMIT_GAP"
  | "BOARD_DELTA_DEQUEUE"
  | "AUTHORITATIVE_CONFIRM"
  | "OPPONENT_ANIM_START"
  | "OPPONENT_ANIM_SETTLE"
  | "RESYNC_START"
  | "RESYNC_OK"
  | "RESYNC_FAIL"
  | "SNAPSHOT_COMMIT"
  | "SNAPSHOT_REBUILD_START"
  | "SNAPSHOT_REBUILD_SETTLE"
  | "SOCKET_CONNECTED"
  | "SOCKET_DISCONNECTED";

export type ChessDiagnosticEntry = {
  seq: number;
  atMs: number;
  stage: ChessDiagnosticStage;
  gameId?: string;
  clientMoveId?: string;
  from?: string;
  to?: string;
  source?: "tap" | "drag" | "premove";
  version?: number;
  expectedVersion?: number;
  errorCode?: string;
  detail?: string;
};

type Input = Omit<ChessDiagnosticEntry, "seq" | "atMs" | "stage">;
type Listener = () => void;

const MAX_ENTRIES = 160;

class ChessDiagnosticsService {
  private enabled = true; // Dedicated diagnostic build: on by default.
  private seq = 0;
  private entries: ChessDiagnosticEntry[] = [];
  private listeners = new Set<Listener>();

  isEnabled() { return this.enabled; }

  setEnabled(value: boolean) {
    this.enabled = value;
    this.emit();
  }

  record(stage: ChessDiagnosticStage, input: Input = {}) {
    if (!this.enabled) return;
    this.entries.push({ seq: ++this.seq, atMs: Date.now(), stage, ...input });
    if (this.entries.length > MAX_ENTRIES) this.entries.splice(0, this.entries.length - MAX_ENTRIES);
    this.emit();
  }

  clear() {
    this.entries = [];
    this.seq = 0;
    this.emit();
  }

  snapshot() { return this.entries.slice(); }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }
}

export const chessDiagnostics = new ChessDiagnosticsService();
