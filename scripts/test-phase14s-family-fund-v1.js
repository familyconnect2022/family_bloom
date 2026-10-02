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

const screen = read('src/app/home-fund.tsx');
const service = read('src/services/home/homeFundService.ts');
const types = read('src/types/homeLiving.ts');
const paths = read('src/services/firebase/firestorePaths.ts');
const rules = read('firestore.rules');
const cloudRules = read('firestore.cloud.rules');
const app = JSON.parse(read('app.json'));
const pkg = JSON.parse(read('package.json'));

check('fund is a functional ledger screen', /SỐ DƯ QUỸ HIỆN TẠI/.test(screen) && /Lịch sử quỹ/.test(screen));
check('fund keeps Bloom full-bleed header and back', /BloomHeroHeader/.test(screen) && /variant="fund"/.test(screen) && /onBack=/.test(screen));
check('fund remains internal non-payment ledger', /không lưu tài khoản(?:\/| hay )thẻ/.test(screen) && /không chuyển tiền thật/.test(screen));
check('create/edit is full-screen flow', /BloomFullScreenFlow/.test(screen) && /Ghi một khoản mới/.test(screen) && /Sửa khoản thu · chi/.test(screen));
check('create/edit uses keyboard-safe surface', /BloomKeyboardScreen/.test(screen));
check('date entry uses Bloom custom date picker', /BloomDatePicker/.test(screen) && !/DateTimePicker/.test(screen));
check('amount input is numeric VND', /keyboardType="number-pad"/.test(screen) && /₫/.test(screen));
check('income and expense UI states remain', /Khoản thu/.test(screen) && /Khoản chi/.test(screen));
check('bounded practical categories remain', /contribution/.test(screen) && /groceries/.test(screen) && /household/.test(screen) && /gift/.test(screen));
check('destructive delete uses Bloom confirmation', /BloomConfirmModal/.test(screen) && !/Alert\.alert/.test(screen));
check('history keeps all-income-expense filters', /FilterMode/.test(screen) && /Tất cả/.test(screen));
check('history pages remain bounded to 30', /Xem thêm 30 khoản/.test(screen) && /const PAGE_SIZE = 30/.test(service));
check('month scan remains bounded', /MONTH_SCAN_LIMIT = 501/.test(service) && /500 giao dịch/.test(screen));
check('summary remains realtime while mounted', /subscribeSummary/.test(service) && /onSnapshot/.test(service));
check('recent ledger remains realtime while mounted', /subscribeRecent/.test(service) && /orderBy\("occurredOn", "desc"\)/.test(service));
check('older history stays one-shot paginated', /fetchPage/.test(service) && /startAfter/.test(service));
check('month totals use bounded monthKey query', /where\("monthKey", "==", monthKey\)/.test(service));
check('ledger writes use Firestore transactions', /runTransaction/.test(service) && /tx\.set\(transactionRef/.test(service) && /tx\.set\(summaryRef/.test(service));
check('summary create update delete deltas explicit', /summaryAfterCreate/.test(service) && /summaryAfterUpdate/.test(service) && /summaryAfterDelete/.test(service));
check('money bounded to one billion VND', /MAX_AMOUNT_VND = 1_000_000_000/.test(service) && /Math\.trunc/.test(service));
check('future ledger dates rejected', /input\.occurredOn > todayKey\(\)/.test(service));
check('fund domain types exist', /HomeFundTransactionType/.test(types) && /HomeFundSummary/.test(types) && /HomeFundMonthTotals/.test(types));
check('fund canonical firestore paths exist', /familyHomeFundTransactions/.test(paths) && /familyHomeFundSummary/.test(paths));
check('direct rules protect fund transactions', /match \/homeFundTransactions\/\{transactionId\}/.test(rules));
check('direct rules require team authority', /allow create: if fundTeam\(\)/.test(rules));
check('direct rules validate exact arithmetic', /validFundCreateDelta/.test(rules) && /validFundUpdateDelta/.test(rules) && /validFundDeleteDelta/.test(rules));
check('cloud rules mirror fund transaction protection', /match \/homeFundTransactions\/\{transactionId\}/.test(cloudRules) && /validFundDeleteDelta/.test(cloudRules));
check('fund summary links immutable audit', /fundSummaryAuditLinked/.test(rules) && /homeFundAudit/.test(rules));
check('fund keeps update-capable version floor', app.expo.android.versionCode >= 142000 && Number(app.expo.ios.buildNumber) >= 8);
check('package version remains semver', /^\d+\.\d+\.\d+$/.test(pkg.version));
check('phase14s npm gate exists', pkg.scripts && pkg.scripts['phase14s:check'] === 'node ./scripts/test-phase14s-family-fund-v1.js');
check('no bank credential fields introduced', !/accountNumber|cardNumber|cvv|bankPassword|pinCode/.test(service + types));
check('stats scan is bounded', /STATS_SCAN_LIMIT = 1001/.test(service));
check('audit scan is bounded', /AUDIT_PAGE_SIZE = 30/.test(service));
check('mock statistics are RAM-only', /RAM-only/.test(service) && /makeMockStats/.test(service));

console.log(`Phase14S Family Fund foundation: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
