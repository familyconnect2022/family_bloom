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

const screen = read('src/app/(home)/(fund)/home-fund.tsx');
const service = read('src/services/home/homeFundService.ts');
const bloomInput = read('src/components/ui/BloomInputComponents/BloomTextInput.tsx');
const pkg = JSON.parse(read('package.json'));
const app = JSON.parse(read('app.json'));
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const relBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');

check('fund date picker uses canonical selectedDate prop', /<BloomDatePicker selectedDate=\{occurredDate\}/.test(screen));
check('fund date picker uses canonical onDateChange callback', /onDateChange=\{\(date\) => \{ setOccurredDate\(date\); setDirty\(true\); \}\}/.test(screen));
check('legacy invalid date picker props removed', !/<BloomDatePicker[^>]*\bvalue=/.test(screen) && !/<BloomDatePicker[^>]*\bonChange=/.test(screen));
check('keyboard-aware fund input can own its ref', /inputRef: externalInputRef/.test(screen) && /const fallbackRef = useRef<TextInput>/.test(screen));
check('multiline fields use a larger reveal gap', /multiline \? 58 : 28/.test(bloomInput));
check('multiline fields remeasure after focus settles', /setTimeout\(\(\) => revealInput\(inputRef\.current, revealGap\), multiline \? 90 : 45\)/.test(bloomInput));
check('multiline fields remeasure while content grows', /onContentSizeChange/.test(bloomInput) && /requestAnimationFrame\(reveal\)/.test(bloomInput) && /setTimeout\(reveal, 90\)/.test(bloomInput));
check('handover multiline note uses keyboard-aware wrapper', /<FundKeyboardTextInput value=\{note\}[\s\S]{0,350}giao quỹ/.test(screen));
check('assistant task multiline uses keyboard-aware wrapper', /<FundKeyboardTextInput value=\{tasks\[selectedUid\]/.test(screen));
check('raw multiline fund team text inputs removed', !/<TextInput value=\{tasks\[selectedUid\]/.test(screen));
check('fund copy no longer exposes internal user wording', !/user thật/.test(screen));
check('fund screen calls the audit trail a journal', /Nhật ký quỹ/.test(screen) && /Có nhật ký/.test(screen));
check('full RAM test transactions exist', /makeMockFundTransactions/.test(screen) && /mock-fund-/.test(screen));
check('RAM test mode also drives summary', /displaySummary = simulateStats \? mockSummary : summary/.test(screen));
check('RAM test mode also drives month totals', /displayMonthTotals = simulateStats \? mockMonthTotals : monthTotals/.test(screen));
check('RAM test mode also drives history rows', /const source = simulateStats \? mockTransactions : allItems/.test(screen));
check('RAM test mode also drives audit rows', /displayAuditEvents = simulateStats \? mockAuditEvents : auditEvents/.test(screen));
check('RAM test copy clearly says it does not affect real fund', /không ảnh hưởng quỹ thật/.test(screen));
check('RAM test dataset contains no Firestore mutation', !/makeMockFundTransactions[\s\S]{0,5000}(runTransaction|setDoc|addDoc|tx\.set)/.test(screen));
check('locked-row service copy is human readable', /Nếu cần sửa sai, hãy ghi thêm một khoản điều chỉnh/.test(service));
check('app keeps 14S.1A version floor', app.expo.android.versionCode >= 142010 && Number(app.expo.ios.buildNumber) >= 9);
check('package remains semver after 14S.1A', /^\d+\.\d+\.\d+$/.test(pkg.version));
check('phase14s1a npm gate exists', pkg.scripts && pkg.scripts['phase14s1a:check'] === 'node ./scripts/test-phase14s1a-fund-form-ux.js');
check('DEBUG build runs phase14s1a gate', /phase14s1a:check/.test(debugBat));
check('RELEASE build runs phase14s1a gate', /phase14s1a:check/.test(relBat));

console.log(`Phase14S.1A Fund Form UX Hotfix: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
