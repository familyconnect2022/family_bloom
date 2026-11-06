# Family Bloom P2.32 — Client Game Reset + Foundation

Date: 2026-10-16  
Base: P2.31 Route-Owned Game + Active Mini

## Goal

Stop patching the accumulated Chess/Xiangqi client lifecycle and establish a clean foundation for a future rebuild. The authoritative server is preserved byte-for-byte. Piece art and the complete board-game sound pack are preserved byte-for-byte.

## Preserved foundation

### Server — unchanged

The entire `server/` tree is unchanged from P2.31, including:

- Chess and Xiangqi Socket.IO protocol handlers;
- authoritative game managers/rules;
- Firestore persistence/recovery;
- 2-minute invitations and pending cross-game reservation;
- Bloom Bot and bot timing;
- time controls, ready/away/timeout/result protocol.

### Client foundation kept

Only low-level client protocol/transport shapes remain:

- `src/types/chess.ts`
- `src/types/xiangqiBoardProtocol.ts`
- `src/types/xiangqiRealtime.ts`
- `src/services/chess/chessSocketService.ts`
- `src/services/xiangqi/xiangqiSocketService.ts`
- existing Firestore path helpers / game policy constants.

These files do not own a production board, route lifecycle, mini-player, renderer, or presentation state.

## Deleted production client implementation

Removed the current Chess/Xiangqi production implementation so the next client can start from zero:

- all `(chess)` and `(xiangqi)` routes;
- Chess/Xiangqi board renderers and pieces-as-components;
- Surface / SurfaceHost / presentation ownership;
- old realtime React providers/contexts;
- old client game stores, caches, hydration/prewarm/ready plumbing;
- mini-game hosts and challenge mini hosts;
- challenge/result overlays tied to the old lifecycle;
- legacy board-game audio runtime/soundscape code;
- old Web realtime Chess/Xiangqi UI/socket/audio implementation.

Production Home Games now shows only a rebuild placeholder for Chess/Xiangqi. The six existing family mini-games remain unaffected.

## Bloom Bot moved into existing Developer Tools

A new internal route was added:

`src/app/(internal)/board-game-bot-test.tsx`

It is reachable only through the existing **Settings → Kiểm thử & chẩn đoán → Game foundation** area and is protected by the same internal-build + developer-account gate.

The page intentionally renders no board. It exercises the real server foundation directly for both Chess and Xiangqi:

- app/lobby join;
- user → Bloom Bot challenge;
- Bloom Bot → user invitation + accept;
- session recovery + game join;
- resign/terminal cleanup;
- realtime state/invite/reject/expiry event logging.

This keeps invitation/Bloom Bot/recovery testable while preventing any deleted production UI lifecycle from leaking back into the app.

## Assets retained exactly

Preserved byte-for-byte versus P2.31:

- 12 Chess PNG piece assets under `assets/images/chess/pieces-png-default/`;
- 14 Xiangqi WEBP piece assets under `assets/xiangqi/`;
- Xiangqi general icon;
- all 11 canonical MP3 files under `assets/audio/board-game/`.

The retained sound pack totals **60,419 bytes** and passes payload validation.

## Retired stale regression code

117 executable regression scripts that targeted the deleted Surface/route/renderer architecture were removed, together with 114 stale `package.json` script entries. Historical release documentation remains under `document/` for reference.

Current build gates were updated to understand that production Chess/Xiangqi client UI is intentionally absent.

## Copy-over safety

Both pre-copy and post-overlay cleanup now remove obsolete Chess/Xiangqi client directories/files. The post-overlay cleaner specially prunes `src/services/chess` and `src/services/xiangqi` while preserving only:

- `chessSocketService.ts`
- `xiangqiSocketService.ts`

The cleaner was executed against a cloned P2.32 tree and the P2.32 foundation gate still passed afterwards.

## Verification

- P2.32 client reset foundation: **77/77 PASS**
- Board audio asset integrity: **PASS**
- P2.12.4 preserved board assets/build: **27/27 PASS**
- P2.12.5 standalone APK/share contract: **26/26 PASS**
- P2.12.6 dependency contract: **20/20 PASS**
- P2.12.7 Expo Asset peer contract: **14/14 PASS**
- P2.12.8 Windows Expo Doctor launcher: **18/18 PASS**
- Project structure: **18/18 PASS**
- Effective Expo config: **PASS**
- Build entrypoint audit: **PASS (22 BAT files)**
- Web W1 reset-aware: **41/41 PASS**
- Web W2 reset-aware: **71/71 PASS**
- Web W3: **34/34 PASS**
- Release readiness: **11/11 PASS**
- TypeScript/TSX syntax transpile: **284 files PASS**
- Relative import audit: **284 source files PASS**
- `server/` comparison against P2.31: **byte-identical**
- preserved Chess/Xiangqi piece + sound assets comparison: **38/38 byte-identical**

## Build limitation

The source baseline intentionally has no root `node_modules/` or `package-lock.json`, so a full `tsc` dependency-aware check / Android Gradle APK compile was not run inside this packaging environment. `scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat` retains the dependency bootstrap and all current build gates before normal Android build.

## New baseline rule

Future Chess/Xiangqi client work must start from this foundation. Do not restore deleted Surface/Host/mini/board lifecycle code from P2.31 or older phases. Server/protocol contracts may be consumed by new client code, but presentation ownership must be designed anew.
