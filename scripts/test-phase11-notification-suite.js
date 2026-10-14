const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const must = (ok, message) => { if (!ok) { console.error(`FAIL: ${message}`); process.exit(1); } };

const service = read('src/services/push/localNotificationService.ts');
const notifications = read('src/app/(activity)/(notifications)/notifications.tsx');
const bridge = read('src/components/system/BloomPushBridge.tsx');

must(service.includes('scheduleFullTestSuite'), 'Full notification test suite service missing');
must(service.includes('NOTIFICATION_TEST_CASES') && service.includes('Kỷ niệm · Bình thường') && service.includes('Phả hệ · Quan trọng'), '9-case notification matrix missing');
must(service.includes('TEST_SUITE_STEP_SECONDS = 8'), 'Test suite cadence missing');
must(notifications.includes('Gửi 9 thông báo test'), 'Activity Center developer test button missing');
must(notifications.includes('isPerformanceTestAccount(user?.email)'), 'Notification test button is not developer-gated');
must(bridge.includes('data.sourceType === "moment"') && bridge.includes('router.push("/(tabs)/moments" as never)'), 'Generic Moment test deep-link fallback missing');

console.log('Phase 11.2A full notification test-suite contracts PASS');
