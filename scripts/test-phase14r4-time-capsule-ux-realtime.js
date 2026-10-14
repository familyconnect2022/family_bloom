const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
const check = (name, ok) => { checks.push([name, !!ok]); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); };

const list = read('src/app/(home)/(time-capsule)/home-time-capsules.tsx');
const detail = read('src/app/(home)/(time-capsule)/home-time-capsule/[capsuleId].tsx');
const compose = read('src/app/(home)/(time-capsule)/home-time-capsule-compose.tsx');
const datePicker = read('src/components/ui/BloomInputComponents/BloomDatePicker.tsx');
const service = read('src/services/home/homeTimeCapsuleService.ts');
const bridge = read('src/components/system/BloomPushBridge.tsx');
const notifications = read('src/services/push/localNotificationService.ts');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');

check('list hero has Back button', list.includes('onBack={() => router.back()}'));
check('composer uses stable Bloom date picker path', compose.includes('components/ui/BloomInputComponents') && !compose.includes('components/ui/BloomDatePicker'));
check('composer no longer uses native Android date picker', compose.includes('BloomDatePicker') && !compose.includes('@react-native-community/datetimepicker'));
check('Bloom date picker owns custom Vietnamese calendar UI', datePicker.includes('DAYS_OF_WEEK') && datePicker.includes('Tháng') && datePicker.includes('Modal'));
check('ready recipient box has explicit open CTA', list.includes('Mở ngay') && list.includes('state === "ready"'));
check('ready recipient box uses bounded shake animation', list.includes('Animated.sequence') && list.includes('setInterval(runShake, 5800)'));
check('shake respects Reduce Motion', list.includes('AccessibilityInfo.isReduceMotionEnabled'));
check('visible card crosses reveal time without one-second polling', list.includes('nextOpenAt') && list.includes('setTimeVersion'));
check('detail automatically reloads when seal expires', detail.includes('transition into') && detail.includes('openAt - Date.now() + 180') && detail.includes('void load()'));
check('recipient metadata has realtime watcher', (service.includes('watchRecipientCapsules') || service.includes('watchUpcomingForRecipient')) && service.includes('onSnapshot'));
check('global bridge wires realtime capsule watcher', (bridge.includes('watchRecipientCapsules') || bridge.includes('watchUpcomingForRecipient')) && bridge.includes('syncTimeCapsuleReminders'));
check('realtime listener is pooled and shared', bridge.includes('subscribeSharedRealtime<HomeTimeCapsule[]>') && list.includes('subscribeSharedRealtime<HomeTimeCapsule[]>') && bridge.includes('home.time_capsules.recipient'));
check('hidden due capsule can silently refresh list', list.includes('recipientUpcoming') && list.includes('homeTimeCapsuleService.listVisible(activeFamilyId, uid)'));
check('realtime sync replaces only Time Capsule alarms', notifications.includes('syncTimeCapsuleReminders') && notifications.includes('time-capsule:') && notifications.includes("Event and other Bloom reminders stay intact"));
check('short-future capsule notifications can still schedule', notifications.includes('TIME_CAPSULE_MIN_FUTURE_MS = 5 * 1000'));
check('release build runs Phase 14R.4 gate', releaseBat.includes('phase14r4:check'));

const failed = checks.filter(([, ok]) => !ok);
console.log(`Phase14R.4 UX/realtime checks: ${checks.length - failed.length} PASS / ${failed.length} FAIL`);
if (failed.length) process.exit(1);
