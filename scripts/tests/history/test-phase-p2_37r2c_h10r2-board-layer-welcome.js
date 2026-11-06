#!/usr/bin/env node
'use strict';
const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
// H10R2 native contract + current R3R14 Thư Ngỏ UI contract. Do NOT lock to retired button text.
// This is a source-level guard; R3R14R1 runtime tests independently simulate touch/continue. On-device rendering still requires a native APK.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__legacyScriptsDir, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const board = read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt');
const welcome = read('src/components/onboarding/WelcomeModal.tsx');
const auth = read('src/context/AuthContext.tsx');
const layout = read('src/app/_layout.tsx');
const gateScreen = read('src/app/session-gate.tsx');
let passed = 0, failed = 0;
function check(ok, label) {
  if (ok) { passed++; console.log('PASS '+label); }
  else { failed++; console.error('FAIL '+label); }
}
console.log('Family Bloom H10R2 | Native board Z-order + post-auth welcome guards');
check(board.includes('boardMat.elevation = 0f') && !/boardMat\.elevation\s*=\s*dp\(/.test(board), 'background mat does not cover 64 cells via positive native Z');
check(board.indexOf('addView(boardMat)') < board.indexOf('addView(board)') && board.indexOf('addView(boardMat)') >= 0, 'board draws after background mat');
check(board.includes('board.addView(cell)') && board.includes('pieces[square] = piece') && board.includes('image?.setImageResource(pieceDrawable(piece))'), 'all 64 cells retain native PNG drawable mapping');
check(board.includes('paintedCells[square] != paintKey') && board.includes('paintedCells.clear()'), 'dirty-square cache is invalidated on layout/orientation');
check(board.includes('promotionBackdrop.bringToFront()') && board.includes('buildPromotionPicker()'), 'promotion controls retain the front drawing plane');
for (const piece of ['wk','wq','wr','wb','wn','wp','bk','bq','br','bb','bn','bp']) {
  const file = path.join(root, 'modules/family-bloom-overlay/android/src/main/res/drawable-nodpi', piece+'.png');
  check(fs.existsSync(file) && fs.readFileSync(file).subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])), 'native piece drawable '+piece+' is valid PNG');
}
check(welcome.includes('useWindowDimensions()') && welcome.includes('style={styles.stage}') && welcome.includes('computeWelcomePaperGeometry(viewport.width, viewport.height)') && welcome.includes('resizeMode="cover"') && layout.includes('<Stack.Screen name="welcome"'), 'protected Welcome route fills the screen; artwork remains bounded across insets');
check(!welcome.includes('<Modal') && welcome.includes('accessibilityViewIsModal') && layout.includes('welcomeBlocking = verifiedFamily && welcomeReady && showWelcome') && gateScreen.includes('testID="verified-welcome-native-screen"'), 'welcome owns a protected in-Stack touch surface instead of a blank Android Modal window');
check(welcome.includes('Image source={WELCOME_PAGE}') && welcome.includes('onPress={continueIntoFamily}') && welcome.includes('testID="welcome-paper-safe-text-region"') && welcome.includes('testID="welcome-letter-scroll"'), 'Thư Ngỏ opens on tap and retains a working, explicitly dismissible reading state');
// R8R2: opening Welcome is now verified per UID + active membership + joinedAt.
// Saving a profile must not replay the letter, and a newly approved member
// must not reach Home until the async ledger lookup has completed.
const ledger = read('src/services/onboarding/welcomeLedger.ts');
const authoritativeWelcome =
  auth.includes('welcomeLedger.fingerprint(user.uid, activeMembership)') &&
  auth.includes('const welcomeReady = !activeWelcomeKey || welcomeCheckedKey === activeWelcomeKey;') &&
  auth.includes('welcomeLedger.needsWelcome(uid, activeMembership)') &&
  auth.includes('if (needed) setWelcomeTarget({ uid, familyId });') &&
  auth.includes('authUidRef.current !== uid') &&
  auth.includes('await welcomeLedger.markSeen(target.uid, membership);') &&
  auth.includes('setWelcomeTarget(current => current?.uid === target.uid && current?.familyId === target.familyId ? null : current)') &&
  auth.includes('isWelcomeForActiveFamily(welcomeTarget, user?.uid, activeMembership?.familyId)') &&
  ledger.includes('membership.joinedAt') &&
  ledger.includes('AsyncStorage.getItem(seenKey(uid, membership))') &&
  ledger.includes('AsyncStorage.setItem(seenKey(uid, membership), "seen")');
check(authoritativeWelcome,
  'Welcome is decided by verified UID, family, membership and joinedAt; acknowledgement is persisted');
// Retired gate expected Home to unlock without welcomeReady. That creates a
// race while async storage is still being read. Verify CURRENT, stronger gate.
const welcomeGate = read('src/services/onboarding/welcomeGate.ts');
const verifiedWelcomeBarrier = source =>
  source.includes('const welcomeBlocking = verifiedFamily && welcomeReady && showWelcome;') &&
  /const\s+allowFamilyRoutes\s*=\s*verifiedFamily\s*&&\s*welcomeReady\s*&&\s*!welcomeBlocking\s*;/.test(source) &&
  source.includes('<Stack.Protected guard={allowFamilyRoutes}>') &&
  source.includes('welcomeBlocking = verifiedFamily && welcomeReady && showWelcome') &&
  source.includes('router.replace("/session-gate" as never)') && gateScreen.includes('<WelcomeModal visible') &&
  source.includes('router.replace("/session-gate" as never)') &&
  gateScreen.includes('testID="verified-welcome-native-screen"');
check(verifiedWelcomeBarrier(layout) &&
  !verifiedWelcomeBarrier(layout.replace('verifiedFamily && welcomeReady && !welcomeBlocking',
                                 'verifiedFamily && !welcomeBlocking')) &&
  !verifiedWelcomeBarrier(layout.replace('verifiedFamily && welcomeReady && !welcomeBlocking',
                                 'verifiedFamily && welcomeReady')) &&
  welcomeGate.includes('return input.requested && input.visualReady && !input.transitionActive && input.authenticated;'),
  'greeting waits for verified membership and completed Welcome check BEFORE tabs mount');
console.log(`H10R2 guard: ${failed ? 'FAIL' : 'PASS'} (${passed}/${passed+failed})`);
process.exit(failed ? 1 : 0);
