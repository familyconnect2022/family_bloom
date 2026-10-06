const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
let pass = 0;
let fail = 0;
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const check = (name, ok) => {
  if (ok) { console.log(`PASS ${name}`); pass += 1; }
  else { console.error(`FAIL ${name}`); fail += 1; }
};

const service = read('src/services/home/homeWhisperService.ts');
const bridge = read('src/components/system/BloomPushBridge.tsx');
const rules = read('firestore.rules');
const cloudRules = read('firestore.cloud.rules');
const app = JSON.parse(read('app.json'));
const pkg = JSON.parse(read('package.json'));
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');

check('inbox event tracks independent in-app seen state', /inAppSeenAt: string \| null/.test(service));
check('normalizer accepts legacy inbox docs without inAppSeenAt', /inAppSeenAt: typeof raw\.inAppSeenAt === "string" \? raw\.inAppSeenAt : null/.test(service));
check('foreground claim is transactional and recipient-only', /claimInboxForeground[\s\S]*runTransaction[\s\S]*raw\.recipientUid !== uid/.test(service));
check('foreground claim dedupes across app sessions', /raw\.inAppSeenAt[\s\S]*return false[\s\S]*inAppSeenAt: now/.test(service));
check('foreground claim seals deliveredAt if no OS delivery exists', /patch: Record<string, unknown> = \{ inAppSeenAt: now \}[\s\S]*patch\.deliveredAt = now/.test(service));
check('read action seals in-app seen state too', /readAt: now[\s\S]*inAppSeenAt:/.test(service));
check('cold-start inactive state does not consume notification', /state !== "background" \|\| !hasBeenActive/.test(bridge) && /Do not claim during cold-start/.test(bridge));
check('latest bounded inbox snapshot is cached until app becomes active', /let latestEvents: HomeWhisperInboxEvent\[\] = \[\]/.test(bridge) && /latestEvents = events/.test(bridge));
check('AppState active transition retries whisper delivery', /AppState\.addEventListener\("change"[\s\S]*state === "active"[\s\S]*enqueueDelivery\(\)/.test(bridge));
check('foreground startup path claims inAppSeenAt before toast', /claimInboxForeground\(user\.uid, item\.id\)/.test(bridge) && /showToast\(\{/.test(bridge));
check('recent unread whispers surface on app entry', /Recent unread whispers are surfaced once on app entry/.test(bridge) && /72 \* 60 \* 60 \* 1000/.test(bridge));
check('old unread whispers are silently marked seen', /Old unread events are marked as seen silently/.test(bridge));
check('background delivery only runs after app was active once', /let hasBeenActive = AppState\.currentState === "active"/.test(bridge) && /state !== "background" \|\| !hasBeenActive/.test(bridge));
check('failed Android scheduling releases deliveredAt claim', /if \(!result\.scheduled\)[\s\S]*releaseInboxDelivery/.test(bridge));
check('notification permission failure cannot swallow future in-app catch-up', /catch\(\(\) => \(\{ permissionGranted: false, scheduled: false \}\)\)/.test(bridge));
check('listener failures are no longer swallowed silently', /\[Bloom whispers\] inbox listener failed/.test(bridge));
check('mixed-version repair exists for old sender builds without homeInbox', /repairRecentDirectWhisperInbox/.test(service) && /Older senders wrote the direct whisper/.test(bridge));
check('legacy repair is bounded across families and rows', /maxFamilies/.test(service) && /maxPerFamily/.test(service));
check('legacy repair uses recipient direct feed only', /this\.fetchPage\(familyId, uid, "toMe"/.test(service) && /whisper\.recipientUid !== uid/.test(service));
check('legacy repair transaction never overwrites an existing inbox row', /existing = await tx\.get\(inboxRef\)[\s\S]*existing\.exists\(\)/.test(service));
check('recipient repair creates generic non-message notification copy', /Một lời thì thầm đang chờ bạn trong Nhà Mình/.test(service));
check('rules allow recipient repair only when source direct whisper proves recipient', /request\.auth\.uid == uid[\s\S]*exists\(\/databases\/\$\(database\)\/documents\/families/.test(rules) && /data\.recipientUid == uid/.test(rules));
check('rules allow recipient to write inAppSeenAt only with ack fields', /affectedKeys\(\)\.hasOnly\(\['readAt','deliveredAt','inAppSeenAt'\]\)/.test(rules));
check('rules validate inAppSeenAt as audit ISO', /auditIso\(request\.resource\.data\.inAppSeenAt\)/.test(rules));
check('cloud rules mirror inAppSeenAt validation', /affectedKeys\(\)\.hasOnly\(\['readAt','deliveredAt','inAppSeenAt'\]\)/.test(cloudRules) && /auditIso\(request\.resource\.data\.inAppSeenAt\)/.test(cloudRules));
check('Android update version remains at or above 14R.5A floor', Number(app.expo.android.versionCode) >= 140510);
check('iOS build number remains at or above 14R.5A floor', Number(app.expo.ios.buildNumber) >= 6);
check('phase14r5a npm gate exists', pkg.scripts && pkg.scripts['phase14r5a:check'] === 'node ./scripts/test-phase14r5a-whisper-app-entry-catchup.js');
check('DEBUG build runs phase14r5a gate', /npm run phase14r5a:check/.test(debugBat));
check('RELEASE build runs phase14r5a gate', /npm run phase14r5a:check/.test(releaseBat));

console.log(`Phase14R.5A whisper app-entry catch-up: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
