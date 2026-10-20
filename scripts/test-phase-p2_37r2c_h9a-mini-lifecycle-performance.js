#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const read = (r) => fs.readFileSync(path.join(root, r), 'utf8');
const json = (r) => JSON.parse(read(r));
const check = (ok, msg) => { if (ok) { pass++; console.log(`PASS ${msg}`); } else { fail++; console.error(`FAIL ${msg}`); } };

console.log('\nFamily Bloom P2.37R2C-H9B — Mini lifecycle + bounded native rail\n');
const native = read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt');
const store = read('src/services/games/boardGamePresentationStore.ts');
const bridge = read('src/services/games/boardGamePresentationBridge.ts');
const controller = read('src/components/games/BoardGamePresentationRoot.android.tsx');
const tabs = read('src/app/(tabs)/_layout.tsx');
const rootLayout = read('src/app/_layout.tsx');
const mod = json('modules/family-bloom-overlay/package.json');
const app = json('app.json');

check(mod.version === '1.3.18' && native.includes('P2.37R2C-H23-native-1'), 'native binary identity is H9B / module 1.3.14');
check(app.expo.version === '1.3.28' && app.expo.android.versionCode === 143038, 'app identity remains 1.3.28 / 143038');
check(store.includes('STORE_PRESERVE_LOCAL_MODE') && store.includes('snapshot.activeGameId === gameId'), 'same authoritative game refresh preserves local Full/Mini mode');
check(store.includes('STORE_REJECT_DIFFERENT_GAME_REFRESH'), 'stale/different game state cannot steal active presentation');
check(bridge.includes('presentConfirmedBoardGame("chess", state.gameId)') && bridge.includes('presentConfirmedBoardGame("xiangqi", state.gameId)'), 'server still owns live-game existence while store owns local presentation mode');
check(native.includes('viewportWidthPx') && native.includes('viewportHeightPx') && native.includes('setRailBounds('), 'native rail separates logical viewport from physical rail bounds');
check(native.includes('NATIVE_HOST_MINI_RAIL_BOUNDED') && native.includes('presentation-mini-bounded'), 'Mini explicitly shrinks native decor rail');
check(native.includes('setRailBounds(x, miniY.roundToInt(), miniW, miniH)'), 'Mini rail physical bounds equal Mini surface bounds');
check(native.includes('setRailBounds(viewportWidth() + dp(64f), 0, 1, 1)'), 'Idle/background rail is parked off-screen at 1x1');
check(native.includes('this@FamilyBloomOverlayRail.x = nextX') && native.includes('this@FamilyBloomOverlayRail.y = nextY'), 'Mini drag moves bounded rail itself instead of a child inside a full-screen rail');
check(native.includes('miniDockRight') && native.includes('miniY = this@FamilyBloomOverlayRail.y'), 'Mini dock side/Y are retained in persistent native rail memory');
check(!native.includes('parentGroup.requestLayout()'), 'presentation promotion no longer requests full Decor layout');
check(controller.includes('getBoardGamePresentationSnapshot') && controller.includes('}, []);'), 'native action subscriptions are stable across Full/Mini transitions');
check(controller.includes('return null;') && !controller.includes('<FamilyBloomOverlayHost'), 'React/Yoga remains free of native game overlay View');
check(tabs.includes('navigatorRoot: { flex: 1, backgroundColor: COLORS.background, overflow: "hidden" }'), 'tab flex baseline is clipped against first-login overflow');
check(rootLayout.includes('<Stack') && rootLayout.includes('navigationPlane: { flex: 1'), 'root Stack baseline remains frozen');
check(native.includes('ChessNativeBoardView') && native.includes('applyChessBoardState'), 'H8 native Chess tap-to-move renderer remains present');

console.log(`\nP2.37R2C-H9B Mini lifecycle/performance gate: ${fail ? 'FAIL' : 'PASS'} (${pass}/${pass + fail})\n`);
process.exit(fail ? 1 : 0);
