const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const pkg = JSON.parse(read('package.json'));
const app = JSON.parse(read('app.json'));
const layout = read('src/app/_layout.tsx');
const bridge = read('src/components/system/BloomPushBridge.tsx');
const local = read('src/services/push/localNotificationService.ts');
const prefs = read('src/app/(activity)/(notifications)/notification-preferences.tsx');
const planner = read('src/app/(tabs)/planner.tsx');
const rules = read('firestore.rules');

assert(pkg.dependencies['expo-notifications'], 'expo-notifications dependency missing');
assert(!pkg.dependencies['@react-native-firebase/messaging'], 'local-only build must not install RNFirebase Messaging');
assert(app.expo.ios.bundleIdentifier === 'com.family.ios', 'iOS bundleIdentifier regressed');
assert(JSON.stringify(app.expo.plugins).includes('expo-notifications'), 'expo-notifications config plugin missing');
assert(!app.expo.plugins.includes('@react-native-firebase/messaging'), 'local-only build must not register RNFirebase Messaging config plugin');
assert(!layout.includes('pushBackground'), 'remote background FCM bootstrap must be disabled in local-first build');
assert(!bridge.includes('@react-native-firebase/messaging'), 'Bloom bridge still depends on remote FCM at runtime');
assert(local.includes('scheduleNotificationAsync'), 'local notification scheduling missing');
assert(local.includes('listReminderWindow'), 'local reminder projection must use bounded event reads');
assert(local.includes('MAX_SCHEDULED = 48'), 'bounded local notification cap missing');
assert(local.includes('HORIZON_DAYS = 30'), 'bounded local reminder horizon missing');
assert(local.includes('bloom_normal') && local.includes('bloom_notable') && local.includes('bloom_important'), 'semantic Bloom channels missing');
assert(prefs.includes('Gửi lời nhắc thử sau 8 giây'), 'local notification smoke-test action missing');
assert(planner.includes('localNotificationService.syncSmartReminders'), 'new event must refresh local schedules');
assert(!rules.includes('match /pushTokens/{tokenId}'), 'local-first build should not require Phase 11.2 push-token Firestore rules');

console.log('Phase 11.2A local-first/no-functions contract: PASS');
