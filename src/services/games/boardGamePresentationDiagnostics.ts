export type BoardGamePresentationDiagnostic = {
  id: number;
  at: number;
  stage: string;
  detail: string;
  source: "store" | "bridge" | "root" | "native";
  mode?: string | null;
  kind?: string | null;
  gameId?: string | null;
  data?: Record<string, unknown>;
};

let sequence = 0;
let recent: BoardGamePresentationDiagnostic[] = [];
const listeners = new Set<(event: BoardGamePresentationDiagnostic) => void>();

export function emitBoardGamePresentationDiagnostic(
  source: BoardGamePresentationDiagnostic["source"],
  stage: string,
  detail: string,
  data?: Record<string, unknown>,
) {
  const event: BoardGamePresentationDiagnostic = {
    id: ++sequence,
    at: Date.now(),
    source,
    stage,
    detail,
    mode: typeof data?.mode === "string" ? data.mode : null,
    kind: typeof data?.kind === "string" ? data.kind : null,
    gameId: typeof data?.gameId === "string" ? data.gameId : null,
    data,
  };
  recent = [event, ...recent].slice(0, 80);
  for (const listener of listeners) listener(event);
  return event;
}

export function subscribeBoardGamePresentationDiagnostics(listener: (event: BoardGamePresentationDiagnostic) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getRecentBoardGamePresentationDiagnostics() {
  return recent;
}
