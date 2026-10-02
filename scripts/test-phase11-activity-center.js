const fs = require('fs');
const vm = require('vm');
const ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript');

const read = (p) => fs.readFileSync(p, 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const activity = read('src/services/activity/activityService.ts');
const graphSession = read('src/services/activity/graphActivitySessionService.ts');
const notifications = read('src/app/notifications.tsx');
const planner = read('src/app/(tabs)/planner.tsx');
const moments = read('src/app/(tabs)/moments.tsx');
const home = read('src/app/(tabs)/index.tsx');
const eventTypes = read('src/types/event.ts');
const rules = read('firestore.rules');
const appJson = JSON.parse(read('app.json'));

assert(!activity.includes('onSnapshot('), 'Activity service must stay one-shot; no new realtime listener');
assert(!notifications.includes('onSnapshot('), 'Activity Center must stay one-shot; no screen listener');
assert(activity.includes('if (post.timelineAudience === "self") return;'), 'Self Moment should not create activity');
assert(activity.includes('badgeEligible: post.notifyFamily'), 'Family Moment badge must be opt-in');
assert(activity.includes('uid !== post.authorUid'), 'Moment author must not target-notify themselves');
assert(activity.includes('item.actorUid !== uid'), 'Activity badge must exclude actor self-notification');
assert(moments.includes('Thông báo cho cả nhà'), 'Moment family notify toggle missing');
assert(moments.includes('notifyFamily: timelineAudience === "family" && notifyFamily'), 'Moment publish gate missing');
assert(eventTypes.includes('"birthday"') && eventTypes.includes('"memorial"'), 'Birthday/memorial event types missing');
assert(eventTypes.includes('"normal" | "notable" | "important"'), 'Event notification levels missing');
assert(planner.includes('Mức thông báo') && planner.includes('Bình thường'), 'Event notification UI missing');
assert(notifications.includes('Chuyện trong nhà'), 'Activity Center copy missing');
assert(notifications.includes('switchFamily(activity.familyId)'), 'Cross-family activity must switch family before deep link');
assert(home.includes('families.map(async (membership)') && home.includes('activityService.unreadBadgeCount') && home.includes('smartReminderService.unreadBadgeCount'), 'Home badge must aggregate Activity + smart reminders across accessible families');
assert(activity.includes('activitySelfAuthoredBadgeCount') && activity.includes('activitySelfAuthoredSeenCount'), 'Family summary must exclude self-authored badge activity');
assert(activity.includes('BADGE_CACHE_TTL_MS'), 'Badge in-memory cache missing');
assert(rules.includes('match /activities/{activityId}'), 'Family activity Rules missing');
assert(rules.includes('match /activities/{activityId}') && rules.includes("request.resource.data.audience == 'target'"), 'Target inbox Rules missing');
assert(appJson?.expo?.ios?.bundleIdentifier === 'com.family.ios', 'iOS bundleIdentifier regressed');
assert(graphSession.includes('SESSION_WINDOW_MS = 10 * 60 * 1000'), 'Graph change-session window missing');

// Execute the pure graph-session service to verify the specific-vs-grouped wording contract.
const js = ts.transpileModule(graphSession, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const moduleObj = { exports: {} };
vm.runInNewContext(`(function(module,exports){${js}\n})(module,module.exports);`, { module: moduleObj });
const svc = moduleObj.exports.graphActivitySessionService;
let session = svc.record('family-a', { kind: 'person_added', personName: 'Nguyễn Văn An' });
let copy = svc.copyFor(session);
assert(copy.body === 'Admin đã thêm Nguyễn Văn An vào phả hệ.', 'Single add must use specific copy');
svc.clear('family-a');
session = svc.record('family-a', { kind: 'person_deleted', personName: 'Nguyễn Văn An' });
copy = svc.copyFor(session);
assert(copy.body === 'Admin đã xóa Nguyễn Văn An khỏi phả hệ.', 'Single delete must use specific copy');
svc.record('family-a', { kind: 'relationship_added' });
session = svc.get('family-a');
copy = svc.copyFor(session);
assert(copy.body.includes('2 thay đổi'), 'Two graph changes must collapse into generic grouped copy');

console.log('Phase 11.0 Activity Center contracts PASS');
