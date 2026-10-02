const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
const check = (name, ok) => { checks.push([name, !!ok]); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); };

const list = read('src/app/home-time-capsules.tsx');
const detail = read('src/app/home-time-capsule/[capsuleId].tsx');
const compose = read('src/app/home-time-capsule-compose.tsx');
const service = read('src/services/home/homeTimeCapsuleService.ts');
const types = read('src/types/homeLiving.ts');
const rules = read('firestore.rules');
const cloudRules = read('firestore.cloud.rules');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');

check('two-section IA uses Hộp dành cho tôi', list.includes('title="Hộp dành cho tôi"'));
check('two-section IA uses Hộp tôi gửi', list.includes('title="Hộp tôi gửi"'));
check('old waiting/open vertical sections removed', !list.includes('title="Đang chờ ngày mở"') && !list.includes('title="Đã đến lúc mở"'));
check('both collections use horizontal virtualized rails', list.includes('<FlatList') && list.includes('horizontal') && list.includes('snapToInterval={BOX_WIDTH + BOX_GAP}'));
check('rail order prioritizes ready then upcoming then opened', list.includes('{ ready: 0, upcoming: 1, opened: 2 }'));
check('nearest future boxes sort forward', list.includes('return aState === "opened" ? bTime - aTime : aTime - bTime'));
check('all three themes own distinct physical box colors', ['warm:', 'formal:', 'festive:', 'body:', 'lid:', 'ribbon:'].every(v => list.includes(v)));
check('opened sender box uses recipient progress', list.includes('openedCountFor') && list.includes('${openedCount}/${recipientCount} người đã mở'));
check('partial sender open is visually distinct from fully opened', list.includes('fullyOpenedByRecipients ? 1 : 0.62'));
check('ajar/open transition animates instead of snapping', list.includes('Animated.timing(openProgress') && list.includes('duration: openTarget > 0 ? 560 : 260') && list.includes('Easing.out(Easing.cubic)') && list.includes('useNativeDriver: true'));
check('ajar animation lifts and rotates lid', list.includes('outputRange: [0, -13]') && list.includes('["0deg", "-9deg"]'));
check('opened animation reveals letter peek', list.includes('letterPeek') && list.includes('letterStyle'));
check('shake only applies to due unopened incoming boxes', list.includes('const shouldShake = !mine && state === "ready" && !attentionDismissed'));
check('opened recipient state comes from persisted openedByUids', list.includes('recipientOpened(capsule, uid)') && types.includes('openedByUids?: string[]'));
check('create remains compatible with pre-14R.4D deployed rules', !/batch\.set\(ref,[\s\S]{0,700}openedByUids/.test(service));
check('markOpened preserves per-user receipt and updates summary', service.includes('openPath(familyId, capsuleId, uid)') && service.includes('openedByUids: arrayUnion(uid)'));
check('replay preserves first openedAt timestamp', service.includes('const existingReceipt = await getDoc(receiptRef)') && service.includes('if (!existingReceipt?.exists())'));
check('legacy due boxes hydrate old open receipts without new listeners', service.includes('Compatibility bridge for boxes created before openedByUids existed') && service.includes('openedByUids !== undefined'));
check('recipient summary update is tightly scoped in Firestore rules', rules.includes("affectedKeys().hasOnly(['openedByUids'])") && rules.includes('validRecipientOpenSummary'));
check('cloud Time Capsule rules also include open summary guard', cloudRules.includes("affectedKeys().hasOnly(['openedByUids'])") && cloudRules.includes('validRecipientOpenSummary'));
check('recipient cannot claim another uid as opened', rules.includes('difference(existingOpenedByUids().toSet()).hasOnly([request.auth.uid])'));
check('date picker wrapper removes inherited bottom margin', compose.includes('datePickerContainer: { flex: 1, marginBottom: 0 }'));
check('date and time triggers use one fixed equal height', compose.includes('dateButton: { flex: 1, height: 64, minHeight: 64, maxHeight: 64'));
check('detail page exposes persisted Đã mở state', detail.includes('title={hiddenBeforeOpen ? "Chưa đến lúc" : (!mine && openedBefore) ? "Hộp đã mở"'));
check('release build runs Phase 14R.4D gate', releaseBat.includes('phase14r4d:check'));

const start = '      // Phase 14R — Hộp thời gian thật.';
const end = '\n      match /homePolls/{pollId} {';
const ruleBlock = (text) => text.slice(text.indexOf(start), text.indexOf(end, text.indexOf(start)));
check('direct and cloud Time Capsule rule blocks stay synchronized', ruleBlock(rules) === ruleBlock(cloudRules));

const failed = checks.filter(([, ok]) => !ok);
console.log(`Phase14R.4D horizontal box checks: ${checks.length - failed.length} PASS / ${failed.length} FAIL`);
if (failed.length) process.exit(1);
