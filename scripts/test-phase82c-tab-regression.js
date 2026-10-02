const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const graph = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
assert(!graph.includes('schedulePaintYieldTask'), '8.2B per-batch paint-yield scheduler must be removed');
assert(!graph.includes('firstViewportPaintReady'), 'Full Tree expansion must not be held behind 8.2B first-paint state');
assert(!graph.includes('connectorRenderReady'), 'connector rendering must use the proven 8.2 path again');
assert(graph.includes('scheduleIdleTask(loadNextFullTreeBatch)'), '8.2 idle progressive scheduling must be restored');
assert(graph.includes('partnerIdsByPerson'), 'safe partner adjacency indexing should remain');

const routing = read('src/components/familyGraph/familyGraphConnectorRouting.ts');
assert(routing.includes('requestedRouteConnections'), 'viewport route lookup optimization should remain');
assert(routing.includes('requestedRouteParentIds'), 'viewport parent scoring optimization should remain');

const moments = read('src/app/(tabs)/moments.tsx');
assert(moments.includes('appActive'), 'Moments stable moderation listener must release on app background');
assert(moments.includes('!activeFamilyId || !canModerate || !appActive'), 'Moments moderation listener must not depend on tab focus');
assert(!moments.includes('!activeFamilyId || !canModerate || !screenFocused'), 'Moments moderation listener must not churn per tab');
assert(moments.includes('realtimeEnabled={screenFocused && visiblePostIds.has(post.id)}'), 'per-card realtime should remain focus + visibility bounded');

const planner = read('src/app/(tabs)/planner.tsx');
assert(planner.includes('calendarEnabled: appActive && mode === "calendar"'), 'Planner month listener must stay stable for active family');
assert(planner.includes('listEnabled: appActive && mode === "list"'), 'Planner list listener must stay stable for active family');
assert(!planner.includes('initialWarmComplete'), '8.5 blur-time listener churn state must be removed');
assert(!planner.includes('screenFocused'), 'Planner Firestore listener enablement must not depend on tab focus');

const reviews = read('src/hooks/usePendingFamilyReviews.ts');
assert(!reviews.includes('useFocusEffect'), 'pending review listeners must not reopen on every Family tab visit');
assert(!reviews.includes('focused'), 'pending review subscription must be scoped by active family/app state, not tab focus');
assert(reviews.includes('!familyId || !uid || !isAdmin || !active'), 'pending review listeners must still stop in background/non-admin state');

const perf = read('src/services/performance/performanceTestService.ts');
assert(perf.includes('markTabPhase'), '8.2B tab-phase instrumentation must remain');
assert(perf.includes('listener_open:'), 'listener-open timing instrumentation must remain');
const lab = read('src/app/performance-test.tsx');
assert(lab.includes('Phòng đo hiệu năng'), 'Performance Lab must remain available');

console.log('Phase 8.2C tab-regression correction contracts PASS');
