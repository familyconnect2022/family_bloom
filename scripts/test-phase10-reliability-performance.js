const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const perfFlag = read('src/constants/performanceTest.ts');
assert(perfFlag.includes('PERFORMANCE_TEST_ACCOUNT_TOKEN = "huynh235"'), 'Developer token must be huynh235 without accents');
assert(perfFlag.includes('isPerformanceTestAccount'), 'Developer test UI must have one shared gate');

const play = read('src/app/(tabs)/play.tsx');
assert(play.includes('isPerformanceTestAccount(user?.email)'), 'Performance Lab entry must be hidden for non-developer accounts');

const lab = read('src/app/performance-test.tsx');
assert(lab.includes('startInteractionProbe(60_000)'), 'Real-use probe must run 60 seconds');
assert(lab.includes('APP_STRESS_SIZES = [100, 200]'), 'Whole-app stress tiers must include 100 and 200');
for (const kind of ['moments', 'timeline', 'events', 'memorybook']) assert(lab.includes(`key: "${kind}"`), `Missing ${kind} stress entry`);
assert(lab.includes('isPerformanceTestAccount(user?.email)'), 'Performance Lab direct route must be developer-gated');

const graphLab = read('src/app/performance-graph-test.tsx');
assert(graphLab.includes('isPerformanceTestAccount(user?.email)'), 'Graph stress route must be developer-gated');
assert(graphLab.includes('new Set([50, 100, 200, 300, 500])'), 'Graph stress baseline 50–500 must remain');

const dataLab = read('src/app/performance-data-test.tsx');
assert(dataLab.includes('isPerformanceTestAccount(user?.email)'), 'App stress direct route must be developer-gated');
assert(dataLab.includes('buildMomentTimelineSections'), 'Timeline stress must reuse the production grouping projection');
assert(!dataLab.includes('setDoc(') && !dataLab.includes('addDoc(') && !dataLab.includes('uploadManaged('), 'RAM stress route must not write/upload production data');

const synthetic = read('src/services/performance/syntheticAppData.ts');
assert(synthetic.includes('generateSyntheticMoments') && synthetic.includes('generateSyntheticEvents') && synthetic.includes('generateSyntheticTimeline') && synthetic.includes('generateSyntheticMemoryBook'), 'All Phase 10 synthetic domains must exist');

const publish = read('src/context/MomentPublishContext.tsx');
assert(publish.includes('momentResumeProgress(task.files.length, task.uploadedFiles.length)'), 'Retry must resume from completed media checkpoints');
assert(publish.includes('AppState.addEventListener("change"'), 'Failed in-session publishes must retry on foreground');
assert(publish.includes('status: "queued" as const'), 'Retry must requeue failed jobs before execution');
assert(publish.includes('title: "Đang đăng kỷ niệm…"'), 'Publishing must use neutral progress copy');

const moments = read('src/app/(tabs)/moments.tsx');
assert(moments.includes('editTimelineAudience') && moments.includes('editPersonIds'), 'Moment editor must support Timeline target and related people');
assert(moments.includes('pickEditMedia') && moments.includes('editExistingMedia') && moments.includes('editNewFiles'), 'Moment editor must support add/remove media');
assert(moments.includes('momentsService.updateOwnPost'), 'Full edit must use the full owner update service');
assert(moments.includes('gap: 12'), 'Moment action/target controls should keep separated touch areas');

const momentService = read('src/services/moments/momentsService.ts');
assert(momentService.includes('async updateOwnPost('), 'Moment service must support full owner edit');
assert(momentService.includes('timelineAudience: input.timelineAudience'), 'Full edit must persist Timeline routing');
assert(momentService.includes('markCleanupPendingMany(removedAssetIds)'), 'Removed managed media must enter cleanup lifecycle');

const toast = read('src/hooks/useBloomTaskToast.ts');
assert(toast.includes('type: "notification"'), 'Long-running normal task feedback must not be an error toast');

const appJson = read('app.json');
assert(appJson.includes('"bundleIdentifier": "com.family.ios"'), 'iOS bundleIdentifier regression');

console.log('Phase 10 reliability/offline/whole-app performance contracts PASS');
