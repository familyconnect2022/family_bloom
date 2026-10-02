const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
let pass = 0;
let fail = 0;
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const check = (name, ok) => {
  if (ok) { console.log(`PASS ${name}`); pass += 1; }
  else { console.error(`FAIL ${name}`); fail += 1; }
};

const service = read('src/services/home/homeWhisperService.ts');
const bridge = read('src/components/system/BloomPushBridge.tsx');
const local = read('src/services/push/localNotificationService.ts');
const preferences = read('src/app/notification-preferences.tsx');
const rules = read('firestore.rules');
const cloudRules = read('firestore.cloud.rules');
const fn = read('functions/pushNotifications.js');
const app = JSON.parse(read('app.json'));
const pkg = JSON.parse(read('package.json'));
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');

check('direct whisper still creates exactly recipient homeInbox event', /if \(isDirect && recipientUid\)[\s\S]*inboxCollection\(recipientUid\)/.test(service));
check('family whisper intentionally creates no inbox event', /Family whispers intentionally create no notification event/.test(service));
check('one bounded user-private inbox watcher exists', /watchInbox\([\s\S]*orderBy\("createdAt", "desc"\)[\s\S]*limit\(20\)/.test(service));
check('inbox listener is shared by user not multiplied per family', /key: `home\.whispers\.inbox:\$\{user\.uid\}`/.test(bridge) && /listenerName: "home\.whispers\.inbox"/.test(bridge));
check('client atomically claims whisper delivery', /claimInboxDelivery/.test(service) && /runTransaction/.test(service) && /deliveredAt: nowIso\(\)/.test(service));
check('multiple app sessions dedupe on shared deliveredAt claim', /claimInboxDelivery\(user\.uid, item\.id\)/.test(bridge) && /deliveredAt/.test(service));
check('foreground recipient gets Bloom toast', /Bạn có \$\{count\} lời thì thầm mới/.test(bridge) && /type: "notification"/.test(bridge));
check('background recipient gets local Android notification fallback', /scheduleWhisperInboxNotification/.test(bridge) && /SchedulableTriggerInputTypes\.TIME_INTERVAL/.test(local));
check('whisper local notification deep-links as home_whisper', /sourceType: "home_whisper"/.test(local) && /sourceId: input\.sourceId/.test(local));
check('whisper notification uses notable Android channel', /channelId: "bloom_notable"/.test(local));
check('old legacy inbox events are acknowledged without toast storm', /72 \* 60 \* 60 \* 1000/.test(bridge) && /(acknowledged silently|marked as seen silently)/.test(bridge));
check('multi-family whisper batches keep deep-link family unambiguous', /targetFamilyId/.test(bridge) && /(item\.familyId !== targetFamilyId|item\.familyId === targetFamilyId)/.test(bridge));
check('notification tap marks inbox read before opening whisper screen', /markInboxRead\(user\.uid, data\.sourceId\)/.test(bridge) && /router\.push\("\/home-whispers"/.test(bridge));
check('mark read also seals delivery acknowledgement', /readAt: now[\s\S]*deliveredAt:/.test(service));
check('rules let only recipient update delivery/read acknowledgements', /affectedKeys\(\)\.hasOnly\(\['readAt','deliveredAt','inAppSeenAt'\]\)/.test(rules) && /request\.auth\.uid == uid/.test(rules));
check('direct and cloud rules mirror whisper delivery acknowledgement', /affectedKeys\(\)\.hasOnly\(\['readAt','deliveredAt','inAppSeenAt'\]\)/.test(cloudRules));
check('Cloud Function now triggers from recipient inbox source of truth', /users\/\{uid\}\/homeInbox\/\{eventId\}/.test(fn));
check('Cloud Function atomically claims deliveredAt', /db\.runTransaction/.test(fn) && /tx\.update\(ref, \{ deliveredAt: new Date\(\)\.toISOString\(\) \}\)/.test(fn));
check('Cloud Function releases claim when no push token receives message', /result\.sent < 1/.test(fn) && /releaseClaim/.test(fn) && /tx\.update\(ref, \{ deliveredAt: null \}\)/.test(fn));
check('Cloud Function is direct-whisper only via homeInbox type', /inbox\.type !== "home_whisper"/.test(fn));
check('app version advanced for install-over update', Number(app.expo.android.versionCode) >= 140500);
check('iOS build number advanced consistently', Number(app.expo.ios.buildNumber) >= 5);
check('phase14r5 npm gate exists', pkg.scripts && pkg.scripts['phase14r5:check'] === 'node ./scripts/test-phase14r5-whisper-notification-stability.js');
check('DEBUG build runs phase14r5 gate', /npm run phase14r5:check/.test(debugBat));
check('RELEASE build runs phase14r5 gate', /npm run phase14r5:check/.test(releaseBat));
check('Time Capsule recipient and sender listeners remain intact', /home\.time_capsules\.recipient\.all/.test(bridge) && /home\.time_capsules\.created\.all/.test(bridge));
check('notification settings explain direct-only whisper policy', /Người thân/.test(preferences) && /Cả nhà/.test(preferences) && /không phát thông báo hàng loạt/.test(preferences));

console.log(`Phase14R.5 whisper notification/stability: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
