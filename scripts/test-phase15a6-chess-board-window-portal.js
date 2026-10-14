const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const game = read("src/app/(chess)/chess-game/[gameId].tsx");
const promotion = read("src/components/chess/ChessPromotionOverlay.tsx");
const debugBuild = read("scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat");
const releaseBuild = read("scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat");

let pass = 0; let fail = 0;
function check(name, ok) {
  if (ok) { console.log(`PASS ${name}`); pass++; }
  else { console.error(`FAIL ${name}`); fail++; }
}

const scrollClose = game.indexOf("</ScrollView>");
const modalPos = game.indexOf("<Modal", scrollClose);
const promotionPos = game.indexOf("<ChessPromotionOverlay", modalPos);
const rematchPos = game.indexOf("{rematchLoading ? (", modalPos);
const resultPos = game.indexOf("<ChessResultToast", modalPos);

check("board surface exposes a native ref that cannot collapse", game.includes("ref={boardSurfaceRef}") && game.includes("collapsable={false}"));
check("board position is measured in physical window coordinates", game.includes("measureInWindow((x, y, width, height)") && game.includes("setBoardWindowRect({ x, y, width, height })"));
check("promotion refreshes board measurement before opening", game.includes("await measureBoardWindow();") && game.includes("setPromotion({ from, to, resolve })"));
check("rematch refreshes board measurement before loading overlay", game.includes("The preparing overlay is anchored to the chessboard") && game.includes("setRematchLoading(true)"));
check("board-local UI renders in a transparent window-level modal after ScrollView", modalPos > scrollClose && game.includes('transparent') && game.includes('presentationStyle="overFullScreen"'));
check("Android modal is translucent across system bars", game.includes("statusBarTranslucent") && game.includes("navigationBarTranslucent"));
check("portal slot uses measured board x/y/width/height", game.includes("left: boardWindowRect.x") && game.includes("top: boardWindowRect.y") && game.includes("width: boardWindowRect.width") && game.includes("height: boardWindowRect.height"));
check("promotion and rematch share the same board-anchored portal slot", promotionPos > modalPos && rematchPos > modalPos && promotionPos < resultPos && rematchPos < resultPos);
check("legacy child stacking workaround is no longer used", !game.includes("boardStageOverlayActive") && !game.includes("styles.boardOverlayHost"));
check("promotion chooser still centers inside its supplied board slot", promotion.includes('...StyleSheet.absoluteFillObject') && promotion.includes('alignItems: "center"') && promotion.includes('justifyContent: "center"'));
check("promotion remains image-only using board sprites", promotion.includes("wq.webp") && promotion.includes("bq.webp") && promotion.includes("PROMOTION_IMAGES[key]"));
check("result toast remains separate from board portal", resultPos > modalPos && game.includes("visible={state.status === \"finished\" && resultReady"));
check("debug build runs Phase 15A.6 gate", debugBuild.includes("npm run phase15a6:check"));
check("release build runs Phase 15A.6 gate", releaseBuild.includes("npm run phase15a6:check"));

console.log(`Phase 15A.6 Chess board window portal: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
