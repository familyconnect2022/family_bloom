const fs = require('fs');
const ts = require('typescript');

const read = (p) => fs.readFileSync(p, 'utf8');
const manager = read('server/src/chess/chessGameManager.ts');
const serverTypes = read('server/src/chess/chessTypes.ts');
const board = read('src/components/chess/ChessBoard.tsx');
const clientTypes = read('src/types/chess.ts');

let pass = 0, fail = 0;
function check(name, ok) {
  if (ok) { pass++; console.log('PASS', name); }
  else { fail++; console.error('FAIL', name); }
}

check('server wire type never allows captured king', /type CapturedPiece = "p"\|"n"\|"b"\|"r"\|"q"/.test(serverTypes) && /captured\?: CapturedPiece/.test(serverTypes) && !/type CapturedPiece =[^;]*"k"/.test(serverTypes));
check('client wire type never allows captured king', /type ChessCapturedPiece = "p" \| "n" \| "b" \| "r" \| "q"/.test(clientTypes) && /captured\?: ChessCapturedPiece/.test(clientTypes) && !/type ChessCapturedPiece =[^;]*"k"/.test(clientTypes));
check('server narrows chess.js PieceSymbol before AppliedMove', manager.includes('asCapturablePiece(moved.captured)') && manager.includes('if (piece === "k") throw new Error("CHESS_INVARIANT_CAPTURED_KING")'));
check('server no longer assigns broad moved.captured directly', !manager.includes('{ captured: moved.captured }'));
check('client narrows chess.js PieceSymbol before optimistic move', board.includes('asCapturablePiece(candidate.captured)') && board.includes('CHESS_INVARIANT_CAPTURED_KING'));
check('client no longer assigns broad candidate.captured directly', !board.includes('{ captured: candidate.captured }'));

for (const [name, source, fileName] of [
  ['server manager syntax transpiles', manager, 'chessGameManager.ts'],
  ['client board syntax transpiles', board, 'ChessBoard.tsx'],
]) {
  const result = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
    fileName,
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  check(name, errors.length === 0);
}

// Reproduce the exact chess.js type shape from Render: PieceSymbol includes king,
// while the protocol intentionally excludes king from captured pieces.
const strictSnippet = `
type PieceSymbol = "p"|"n"|"b"|"r"|"q"|"k";
type AppliedMove = { captured?: "p"|"n"|"b"|"r"|"q" };
type CapturablePiece = NonNullable<AppliedMove["captured"]>;
const asCapturablePiece = (piece: PieceSymbol | undefined): CapturablePiece | undefined => {
  if (!piece) return undefined;
  if (piece === "k") throw new Error("CHESS_INVARIANT_CAPTURED_KING");
  return piece;
};
declare const moved: { captured?: PieceSymbol };
const captured = asCapturablePiece(moved.captured);
const applied: AppliedMove = { ...(captured ? { captured } : {}) };
void applied;
`;
const strict = ts.createProgram({
  rootNames: [],
  options: { strict: true, noEmit: true, target: ts.ScriptTarget.ES2022 },
});
// transpileModule is syntax-only, so use an in-memory compiler host for semantic diagnostics.
const fileName = '/phase14v4a-capture-type.ts';
const options = { strict: true, noEmit: true, target: ts.ScriptTarget.ES2022, skipLibCheck: true };
const host = ts.createCompilerHost(options);
const originalGetSourceFile = host.getSourceFile.bind(host);
host.getSourceFile = (name, languageVersion, onError, shouldCreateNewSourceFile) => {
  if (name === fileName) return ts.createSourceFile(name, strictSnippet, languageVersion, true, ts.ScriptKind.TS);
  return originalGetSourceFile(name, languageVersion, onError, shouldCreateNewSourceFile);
};
host.fileExists = (name) => name === fileName || ts.sys.fileExists(name);
host.readFile = (name) => name === fileName ? strictSnippet : ts.sys.readFile(name);
const program = ts.createProgram([fileName], options, host);
const diagnostics = ts.getPreEmitDiagnostics(program).filter((d) => d.file?.fileName === fileName);
check('exact Render captured PieceSymbol mismatch is type-safe after narrowing', diagnostics.length === 0);

console.log(`Phase 14V.4A server capture type hotfix: ${pass} PASS / ${fail} FAIL`);
process.exitCode = fail ? 1 : 0;
