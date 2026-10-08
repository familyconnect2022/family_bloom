export type ChessUiEvent = {
  type: "notification" | "warning" | "info" | "success";
  title?: string;
  message: string;
  duration?: number;
  gameId?: string;
  suppressWhenGameVisible?: boolean;
};

type Listener = (event: ChessUiEvent) => void;
const listeners = new Set<Listener>();

/** One-way engine -> UI event bridge. No React state is stored here. */
export function publishChessUiEvent(event: ChessUiEvent) {
  for (const listener of Array.from(listeners)) listener(event);
}

export function subscribeChessUiEvents(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
