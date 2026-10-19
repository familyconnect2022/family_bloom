const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
let pass = 0; let fail = 0;
const check = (label, ok, detail = '') => {
  const index = String(pass + fail + 1).padStart(2, '0');
  if (ok) { pass++; console.log(`PASS ${index} - ${label}`); }
  else { fail++; console.error(`FAIL ${index} - ${label}${detail ? ` :: ${detail}` : ''}`); }
};

const tabs = read('src/app/(tabs)/_layout.tsx');
const eventDetail = read('src/app/(activity)/event/[eventId].tsx');
const moments = read('src/app/(tabs)/moments.tsx');
const publish = read('src/context/MomentPublishContext.tsx');
const pendingCard = read('src/components/moments/PendingMomentCard.tsx');
const pkg = JSON.parse(read('package.json'));
const cleanBat = read('scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat');
const debugBat = read('scripts/android/dev/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat');

check('Tab pill duration is distance-aware', tabs.includes('tabMotionDurationForDistance') && tabs.includes('Math.abs(toIndex - fromIndex)'));
check('Adjacent and far tab motion have bounded different durations', tabs.includes('TAB_MOTION_MIN_MS = 164') && tabs.includes('TAB_MOTION_MAX_MS = 278') && tabs.includes('TAB_MOTION_EXTRA_STEP_MS = 38'));
check('Tab pill remains UI-thread Reanimated timing', tabs.includes('indicatorIndex.value = withTiming(index'));
check('Tab scene swap remains motion-free', tabs.includes('animation: BLOOM_MOTION.tabs.animation'));

check('Event detail treats Person ids as the authoritative related-people section', eventDetail.includes('const hasRelatedPeople = !!event.personIds?.length'));
check('Related Person chip shows linked-account marker', eventDetail.includes('!!person.linkedUid') && eventDetail.includes('linkedAccountBadge') && eventDetail.includes('name="link"'));
check('Participant list is suppressed when related Persons are available', eventDetail.includes('{!hasRelatedPeople && (') && eventDetail.includes('Người tham gia'));
check('Event description is merged into the Information card', eventDetail.includes('descriptionInInfo') && eventDetail.indexOf('Một chút về ngày này') > eventDetail.indexOf('<Text style={styles.sectionTitle}>Thông tin</Text>'));
check('Standalone description card was removed', !eventDetail.includes('<BloomCard style={styles.sectionCard}>\n            <Text style={styles.sectionTitle}>Một chút về ngày này</Text>'));
check('Hide-event moderation action is after media section', eventDetail.lastIndexOf('<Text style={styles.moderationTitle}>Ẩn sự kiện</Text>') > eventDetail.lastIndexOf('<Text style={styles.sectionTitle}>Ảnh / video</Text>'));

check('Upload progress has an isolated external store', publish.includes('pendingMomentProgressValues') && publish.includes('usePendingMomentProgress'));
check('Continuous upload progress no longer patches provider React state', publish.includes('setPendingMomentProgress(task.localId, nextProgress)') && !publish.includes('patch(task.localId, { progress: nextProgress })'));
check('Progress notifications are deliberately bounded', publish.includes('nextProgress - previous.lastValue >= 6') && publish.includes('nowMs - previous.lastAt >= 220'));
check('Pending card alone subscribes to upload progress', pendingCard.includes('usePendingMomentProgress(item.localId, item.progress)') && pendingCard.includes('statusCopy(item, progress)'));
check('Moments list keeps visible content anchored across pending/post replacement', moments.includes('maintainVisibleContentPosition={{ minIndexForVisible: 0, autoscrollToTopThreshold: 72 }}') || (moments.includes('MOMENTS_MAINTAIN_VISIBLE') && moments.includes('maintainVisibleContentPosition={MOMENTS_MAINTAIN_VISIBLE}')));
check('Moments still avoids continuous JS onScroll', !moments.includes('scrollEventThrottle=') && !/\sonScroll=\{/.test(moments));

const changedTs = [
  'src/app/(tabs)/_layout.tsx',
  'src/app/(activity)/event/[eventId].tsx',
  'src/app/(tabs)/moments.tsx',
  'src/context/MomentPublishContext.tsx',
  'src/components/moments/PendingMomentCard.tsx',
];
let syntaxOk = true;
for (const file of changedTs) {
  const out = ts.transpileModule(read(file), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
    reportDiagnostics: true,
    fileName: file,
  });
  if ((out.diagnostics || []).some((d) => d.category === ts.DiagnosticCategory.Error)) syntaxOk = false;
}
check('Changed TypeScript/TSX transpiles cleanly', syntaxOk);

check('P2.6 gate is registered', pkg.scripts?.['phaseP2_6:check'] === 'node ./scripts/test-phase-p2_6-interaction-detail-scroll-polish.js');
check('Copy-over updater runs P2.6 gate', cleanBat.includes('test-phase-p2_6-interaction-detail-scroll-polish.js'));
check('Debug Android build runs P2.6 gate', debugBat.includes('phaseP2_6:check'));
check('Release Android build runs P2.6 gate', releaseBat.includes('phaseP2_6:check'));

console.log(`\nFamily Bloom P2.6 Interaction + Event Detail + Moments Scroll Polish: ${pass}/${pass + fail} PASS`);
process.exit(fail ? 1 : 0);
