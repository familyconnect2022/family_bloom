export type BoardOrientation = "white" | "black";

export function squareToPosition(square: string, squareSize: number, orientation: BoardOrientation) {
  const fileIndex = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  let col = fileIndex;
  let row = 8 - rank;
  if (orientation === "black") {
    col = 7 - col;
    row = 7 - row;
  }
  return { x: col * squareSize, y: row * squareSize };
}

export function positionToSquare(x: number, y: number, squareSize: number, orientation: BoardOrientation): string | null {
  let col = Math.floor(x / squareSize);
  let row = Math.floor(y / squareSize);
  if (col < 0 || col > 7 || row < 0 || row > 7) return null;
  if (orientation === "black") {
    col = 7 - col;
    row = 7 - row;
  }
  return `${String.fromCharCode(97 + col)}${8 - row}`;
}
