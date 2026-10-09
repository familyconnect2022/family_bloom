export type ChessSoundUiEvent = "challenge_sent" | "challenge_accepted";

const listeners = new Set<(event: ChessSoundUiEvent) => void>();

export function publishChessSoundUiEvent(event: ChessSoundUiEvent) {
  listeners.forEach((listener) => listener(event));
}

export function subscribeChessSoundUiEvents(listener: (event: ChessSoundUiEvent) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
