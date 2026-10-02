const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const lab = read('src/app/performance-test.tsx');
assert(lab.includes('router.dismissAll()'), '30-second probe must unwind to the existing Tabs navigator');
assert(!lab.includes('router.replace("/(tabs)"'), 'Performance Lab must never replace itself with a second Tabs navigator');
assert(lab.includes('useFocusEffect') && lab.includes('performanceTestService.subscribe'), 'Performance report subscription must be focus-scoped');

const graphLab = read('src/app/performance-graph-test.tsx');
assert(graphLab.includes('onPress={() => router.back()}'), 'Graph benchmark must return to the existing Performance Lab route');
assert(graphLab.includes('Graph data-ready → first paint'), 'Graph benchmark must separate adapter and React/render time');
assert(graphLab.includes('pendingProgressRef') && graphLab.includes('250'), 'Graph progress counter must be throttled so the benchmark UI does not distort the result');

const pool = read('src/services/realtime/sharedRealtimeRegistry.ts');
assert(pool.includes('subscribers.size > 0') && pool.includes('current.stop?.()'), 'Shared realtime pool must ref-count and close the underlying listener');
assert(pool.includes('lastValue') && pool.includes('onData(entry.lastValue as T)'), 'Late duplicate consumers must receive the latest bounded snapshot without opening Firestore again');

const reviews = read('src/hooks/usePendingFamilyReviews.ts');
const moments = read('src/app/(tabs)/moments.tsx');
const planner = read('src/app/(tabs)/planner.tsx');
const events = read('src/hooks/useFamilyEvents.ts');
assert(reviews.includes('subscribeSharedRealtime<boolean>'), 'Join/proposal pending listeners must use the singleton pool');
assert(moments.includes('key: `moments.moderation_hidden:${activeFamilyId}`'), 'Moment moderation listener must be family-keyed singleton');
assert(planner.includes('key: `planner.moderation_hidden:${activeFamilyId}`'), 'Planner moderation listener must be family-keyed singleton');
assert(events.includes('key: `planner.events.month:${familyId}:${year}:${month}'), 'Planner month listener must be query-keyed singleton');

const rootLayout = read('src/app/_layout.tsx');
assert(rootLayout.includes('targetMode: "replace" | "navigate"'), 'Root gate must distinguish destructive redirects from workspace unwind');
assert(rootLayout.includes('familyTransition && !inTabs') && rootLayout.includes('targetMode = "navigate"'), 'Family transition above Tabs must navigate/unwind instead of replacing with a second Tabs tree');

const tabsLayout = read('src/app/(tabs)/_layout.tsx');
const perfService = read('src/services/performance/performanceTestService.ts');
assert(tabsLayout.includes('trackMount("tabs.navigator")'), 'Performance build must detect duplicate Tabs navigator mounts');
assert(perfService.includes('Tracked runtime mounts active'), 'Performance report must export navigator mount diagnostics');

const personSheet = read('src/components/familyGraph/FamilyGraphPersonSheet.tsx');
const chat = read('src/app/chat/index.tsx');
const switcher = read('src/components/family/FamilySwitcherModal.tsx');
const memberships = read('src/app/family-memberships.tsx');
assert(!personSheet.includes('router.push({ pathname: "/(tabs)/'), 'Person Detail must not push a second Tabs navigator');
assert(!chat.includes('router.push("/(tabs)/'), 'Chat must not push a second Tabs navigator');
assert(switcher.includes('router.navigate("/(tabs)"'), 'Family switch must reuse/unwind to existing Tabs navigator');
assert(memberships.includes('router.navigate("/(tabs)"'), 'Membership switch must reuse/unwind to existing Tabs navigator');

const graph = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
assert(graph.includes('scheduleIdleTask(loadNextFullTreeBatch)'), 'Proven Phase 8.2 graph progressive scheduler must remain');
assert(graph.includes('partnerIdsByPerson'), 'Phase 8.2 partner adjacency optimization must remain');

console.log('Phase 8.5B runtime singleton/navigation/perf-harness contracts PASS');
