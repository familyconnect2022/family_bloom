const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
let pass = 0;
let fail = 0;
function check(label, ok) {
  if (ok) { pass += 1; console.log(`PASS ${String(pass + fail).padStart(2, '0')} - ${label}`); }
  else { fail += 1; console.error(`FAIL -- ${label}`); }
}
function syntax(rel) {
  const out = ts.transpileModule(read(rel), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    reportDiagnostics: true,
    fileName: rel,
  });
  return !(out.diagnostics || []).some((d) => d.category === ts.DiagnosticCategory.Error);
}

console.log('\nP2.23 — canonical Chess FULL <-> MINI route ownership\n');

const lobby = read('src/app/(chess)/chess-lobby.tsx');
const globalHost = read('src/components/chess/ChessGlobalUiHost.tsx');
const miniHost = read('src/components/chess/ChessMiniHost.tsx');
const surfaceHost = read('src/components/chess/ChessSurfaceHost.tsx');
const gameRoute = read('src/app/(chess)/chess-game/[gameId].tsx');
const homeGames = read('src/app/(home)/(games)/home-games.tsx');
const coordinator = read('src/services/presentation/boardGamePresentationCoordinator.ts');
const rail = read('src/services/presentation/bloomSurfaceRailStore.ts');
const activeStore = read('src/services/games/activeBoardGameSessionStore.ts');
const pkg = JSON.parse(read('package.json'));
const cleanApply = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');

// A) One navigation owner. Lobby is UI only once an authoritative Chess game exists.
check('Lobby declares GlobalUiHost as single active-game navigation owner', lobby.includes('ChessGlobalUiHost is the single navigation owner'));
check('Lobby no longer imports claimAndPresentBoardGame', !lobby.includes('import { claimAndPresentBoardGame }'));
check('Lobby no longer pushes or replaces activeGameId into Chess game route', !/lobby\.activeGameId[\s\S]{0,500}router\.(push|replace|navigate)\(\{ pathname: "\/\(chess\)\/chess-game\/\[gameId\]"/.test(lobby));
check('Global host retains one routed game guard', globalHost.includes('routedGameRef.current === gameId'));
check('Global authoritative route uses navigate not push', globalHost.includes('router.navigate({ pathname: "/(chess)/chess-game/[gameId]"') && !globalHost.includes('router.push({ pathname: "/(chess)/chess-game/[gameId]"'));

// B) MINI -> FULL must reuse/unwind route identity, never push a duplicate command route.
check('Mini raises the same claimed game before route navigation', miniHost.includes('presentClaimedBoardGame("chess", gameId, "full", "route")'));
check('Mini reopen uses router.navigate', miniHost.includes('router.navigate({ pathname: "/(chess)/chess-game/[gameId]"'));
check('Mini reopen never pushes duplicate Chess route', !miniHost.includes('router.push({ pathname: "/(chess)/chess-game/[gameId]"'));
check('Home Games active Chess reopen also uses navigate', homeGames.includes('router.navigate({ pathname: "/(chess)/chess-game/[gameId]", params: { gameId } } as never)'));

// C) FULL -> MINI is presentation-only. Session identity/socket survives unchanged.
check('Full surface minimize calls presentation coordinator', surfaceHost.includes('minimizeClaimedBoardGame("chess", gameId)'));
check('Full surface minimize returns to underlying route only after mini request', /minimizeClaimedBoardGame\("chess", gameId\);\s*router\.back\(\)/.test(surfaceHost));
check('Route blur releases exact owner token to mini', gameRoute.includes('releaseRouteBoardGamePresentation("chess", ownedGameId, ownerToken, "mini")'));
check('Coordinator minimize does not clear active session', /export function minimizeClaimedBoardGame[\s\S]{0,500}minimizeBloomGameSurface/.test(coordinator) && !/export function minimizeClaimedBoardGame[\s\S]{0,500}clearActiveBoardGameSession/.test(coordinator));
check('Rail mini retains same game identity', /export function minimizeBloomGameSurface[\s\S]{0,260}gamePresentation: "mini"[\s\S]{0,120}visibleSurface: null/.test(rail));
check('Active session store has no presentation field', !/gamePresentation|presentation:/.test(activeStore.split('export type ActiveBoardGameSession =')[1].split('};')[0]));

// D) Full restore is the inverse presentation mutation on the same lease.
check('presentClaimedBoardGame requires matching active session', coordinator.includes('if (!current || current.kind !== kind || current.gameId !== gameId) return false;'));
check('full presentation reuses requestBloomGameSurface', coordinator.includes('return requestBloomGameSurface(kind, gameId, presentation)'));
check('requestBloomGameSurface full raises visibleSurface kind', /gamePresentation: presentation,[\s\S]{0,100}visibleSurface: presentation === "full" \? kind : null/.test(rail));

for (const rel of [
  'src/app/(chess)/chess-lobby.tsx',
  'src/components/chess/ChessGlobalUiHost.tsx',
  'src/components/chess/ChessMiniHost.tsx',
  'src/components/chess/ChessSurfaceHost.tsx',
  'src/app/(chess)/chess-game/[gameId].tsx',
  'src/app/(home)/(games)/home-games.tsx',
  'src/services/presentation/boardGamePresentationCoordinator.ts',
  'src/services/presentation/bloomSurfaceRailStore.ts',
]) check(`syntax ${rel}`, syntax(rel));

check('package registers P2.23 gate', pkg.scripts?.['phaseP2_23:check'] === 'node ./scripts/test-phase-p2_23-chess-full-mini-route-ownership.js');
check('CLEAN APPLY executes P2.23 gate', cleanApply.includes('test-phase-p2_23-chess-full-mini-route-ownership.js'));
check('Android Debug executes P2.23 gate', debugBat.includes('phaseP2_23:check'));
check('Android Release executes P2.23 gate', releaseBat.includes('phaseP2_23:check'));

console.log(`\nP2.23 result: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
