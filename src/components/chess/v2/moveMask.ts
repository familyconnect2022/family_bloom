export type BitMask64 = { low: number; high: number };

export type VerboseMoveLike = {
  to: string;
  flags?: string;
  captured?: string;
};

export function createEmptyMask(): BitMask64 {
  return { low: 0, high: 0 };
}

export function squareToIndex(square: string): number {
  if (!/^[a-h][1-8]$/.test(square)) return -1;
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  return (8 - rank) * 8 + file;
}

export function indexToSquare(index: number): string | null {
  if (!Number.isInteger(index) || index < 0 || index > 63) return null;
  const row = Math.floor(index / 8);
  const col = index % 8;
  return `${String.fromCharCode(97 + col)}${8 - row}`;
}

export function setBit(mask: BitMask64, index: number): void {
  if (index < 0 || index > 63) return;
  if (index < 32) mask.low |= (1 << index);
  else mask.high |= (1 << (index - 32));
}

export function hasBit(low: number, high: number, index: number): boolean {
  "worklet";
  if (index < 0 || index > 63) return false;
  if (index < 32) return (low & (1 << index)) !== 0;
  return (high & (1 << (index - 32))) !== 0;
}

export function buildMoveMasks(moves: readonly VerboseMoveLike[]) {
  const legal = createEmptyMask();
  const capture = createEmptyMask();

  for (const move of moves) {
    const index = squareToIndex(move.to);
    if (index < 0) continue;
    const flags = move.flags ?? "";
    // chess.js 1.x uses c for capture and e for en-passant. captured is an
    // additional defensive signal for future compatible move objects.
    const isCapture = flags.includes("c") || flags.includes("e") || !!move.captured;
    setBit(isCapture ? capture : legal, index);
  }

  return { legal, capture };
}

export function isMaskTarget(legal: BitMask64, capture: BitMask64, index: number): boolean {
  return hasBit(legal.low, legal.high, index) || hasBit(capture.low, capture.high, index);
}
