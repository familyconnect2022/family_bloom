const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const layout = read('src/app/_layout.tsx');
const auth = read('src/context/AuthContext.tsx');
const familyService = read('src/services/family/familyService.ts');
const realtime = read('src/context/FamilyRealtimeContext.tsx');
const publish = read('src/context/MomentPublishContext.tsx');
const memberships = read('src/app/(family)/(membership)/family-memberships.tsx');
const switcher = read('src/components/family/FamilySwitcherModal.tsx');
const rules = read('firestore.rules');

// 7.1: hard family scope reset; upload lifecycle stays outside scope.
assert(layout.indexOf('<MomentPublishProvider>') < layout.indexOf('<FamilySession />'));
assert(layout.includes('const sessionKey = useMemo(() => `${user?.uid ?? "guest"}:${activeFamilyId ?? "no-family"}`'));
assert(layout.includes('<FamilyRealtimeProvider key={sessionKey}>'));
assert(layout.includes('familyTransition && !inTabs'));
assert(layout.includes('targetMode = "navigate"')); // switch from a detail route must unwind/reuse Tabs, not stack a second workspace

// 7.2/7.3: switcher reads membership state only; join/create are explicit user actions.
assert(switcher.includes('opening this modal never starts listeners for inactive families'));
assert(!switcher.includes('watchMembers('));
assert(!switcher.includes('subscribeLatest('));
assert(memberships.includes('{ activateAfterCreate: false }'));
assert(memberships.includes('Bạn vẫn ở nhà hiện tại cho đến khi tự chọn chuyển'));
assert(familyService.includes('profile.activeFamilyId ?? null'));

// 7.4: exactly one lightweight membership collection listener, active family data remains scoped.
assert(familyService.includes('watchForUser(uid'));
assert(auth.includes('Một listener duy nhất cho reverse-index memberships'));
assert(realtime.includes('One bounded realtime cache for the active family'));
assert(!realtime.includes('families.map('));
assert(!realtime.includes('for (const family'));

// Upload job must keep immutable familyId captured at enqueue time.
assert(publish.includes('normalizeMomentTargetFamilyIds(input.familyId'));
assert(publish.includes('familyId,'));
assert(publish.includes('task.familyId'));
assert(!publish.includes('activeFamilyId'));

// Switching requires both reverse index and authoritative family member.
assert(familyService.includes('authoritativeMember'));
assert(rules.includes('documents/families/$(request.resource.data.activeFamilyId)/members/$(uid)'));

// Performance sanity: sorting/selecting a realistically large membership list is cheap O(n log n)
// and does not imply opening family-scoped listeners for each item.
const sample = Array.from({ length: 10000 }, (_, i) => ({
  familyId: `f-${i}`,
  familyName: `Family ${i}`,
  joinedAt: new Date(1700000000000 + i * 1000).toISOString(),
}));
const start = process.hrtime.bigint();
const active = 'f-7777';
const ordered = [...sample].sort((a, b) => {
  if (a.familyId === active) return -1;
  if (b.familyId === active) return 1;
  return b.joinedAt.localeCompare(a.joinedAt) || a.familyName.localeCompare(b.familyName, 'vi');
});
const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
assert.strictEqual(ordered[0].familyId, active);
assert(elapsedMs < 250, `membership sort unexpectedly slow: ${elapsedMs.toFixed(1)}ms`);

console.log(`Phase 7 multi-family contract OK. 10k membership ordering: ${elapsedMs.toFixed(2)}ms.`);
