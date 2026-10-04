export type PieceKey = `${"w"|"b"}${"p"|"n"|"b"|"r"|"q"|"k"}`;
export type PieceDescriptor = { id: string; pieceKey: PieceKey; square: string };
export type PieceRuntime = { square: string; pieceKey: PieceKey; alive: boolean };

const FILES = "abcdefgh";

export function buildPieceDescriptors(fen: string): PieceDescriptor[] {
  const rows = fen.split(" ")[0].split("/");
  const counts = new Map<string, number>();
  const pieces: PieceDescriptor[] = [];
  rows.forEach((row, rowIndex) => {
    let file = 0;
    for (const token of row) {
      if (/\d/.test(token)) { file += Number(token); continue; }
      const color = token === token.toUpperCase() ? "w" : "b";
      const type = token.toLowerCase() as "p"|"n"|"b"|"r"|"q"|"k";
      const pieceKey = `${color}${type}` as PieceKey;
      const ordinal = (counts.get(pieceKey) ?? 0) + 1;
      counts.set(pieceKey, ordinal);
      pieces.push({ id: `${pieceKey}-${ordinal}`, pieceKey, square: `${FILES[file]}${8 - rowIndex}` });
      file += 1;
    }
  });
  return pieces;
}

export function runtimeFromDescriptors(pieces: PieceDescriptor[]) {
  return new Map(pieces.map((piece) => [piece.id, { square: piece.square, pieceKey: piece.pieceKey, alive: true } satisfies PieceRuntime]));
}
