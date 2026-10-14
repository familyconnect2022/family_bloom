const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const game = read("src/app/(chess)/chess-game/[gameId].tsx");
const promotion = read("src/components/chess/ChessPromotionOverlay.tsx");
const debugBuild = read("scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat");
const releaseBuild = read("scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat");

let pass = 0; let fail = 0;
function check(name, ok) { if (ok) { console.log(`PASS ${name}`); pass++; } else { console.error(`FAIL ${name}`); fail++; } }

check("board-local overlay active flag covers promotion and rematch", game.includes("const boardLocalOverlayActive = !!promotion || rematchLoading;"));
check("board stage is conditionally elevated above sibling rails", game.includes("styles.boardStageOverlayActive") && game.includes("zIndex: 4000") && game.includes("elevation: 24"));
check("overlay host uses exact chessboard dimensions", game.includes('style={[styles.boardOverlayHost, { width: boardSize, height: boardSize }]}'));
check("overlay host anchors to board origin, not root/scroll view", game.includes('position: "absolute"') && game.includes('top: 0') && game.includes('left: 0') && game.includes('zIndex: 10000'));
check("promotion chooser stays board-centered", promotion.includes('alignItems: "center"') && promotion.includes('justifyContent: "center"') && promotion.includes('...StyleSheet.absoluteFillObject'));
check("rematch overlay stays board-centered", game.includes('rematchOverlay: {') && game.includes('justifyContent: "center"') && game.includes('alignItems: "center"'));
check("promotion and rematch render in the same board overlay host", game.indexOf("<ChessPromotionOverlay") > game.indexOf("styles.boardOverlayHost") && game.indexOf("{rematchLoading ? (") > game.indexOf("styles.boardOverlayHost"));
check("result toast remains separate viewport overlay", game.indexOf("<ChessResultToast") > game.indexOf("</ScrollView>"));
check("debug build runs Phase 15A.5 gate", debugBuild.includes("npm run phase15a5:check"));
check("release build runs Phase 15A.5 gate", releaseBuild.includes("npm run phase15a5:check"));

console.log(`Phase 15A.5 Chess board overlay stacking: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
