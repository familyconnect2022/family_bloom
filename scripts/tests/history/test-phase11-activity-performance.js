const fs = require('fs');
const read = (p) => fs.readFileSync(p, 'utf8');
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };

const activity = read('src/services/activity/activityService.ts');
const home = read('src/app/(tabs)/index.tsx');
const notifications = read('src/app/(activity)/(notifications)/notifications.tsx');
const moments = read('src/app/(tabs)/moments.tsx');
const cache = read('src/services/moments/momentDeepLinkCache.ts');
const paths = read('src/services/firebase/firestorePaths.ts');
const rules = read('firestore.rules');
const cloudRules = read('firestore.cloud.rules');

assert(paths.includes('familyActivityBadgeSummary') && paths.includes('memberActivityBadgeSummary'), 'Badge summary paths missing');
assert(activity.includes('writeActivityWithBadgeSummary'), 'Idempotent activity+summary writer missing');
assert(activity.includes('runTransaction'), 'Badge summary writes must be transactional');
assert(activity.includes('if (existingActivity.exists()) return;'), 'Activity retries must not double-increment badge summary');
assert(activity.includes('BADGE_CACHE_TTL_MS = 12_000'), 'Badge cache TTL missing');
assert(!activity.includes('const page = await this.listForUser(familyId, uid, 40)'), 'Badge must not load Activity pages');
assert(home.includes('badgeRefreshTimerRef') && home.includes('1200'), 'Single debounced Home badge refresh missing');
assert(!home.includes('const timers = [850, 2800]'), 'Old double badge refresh still present');
assert(cache.includes('prefetch(') && cache.includes('getPending('), 'In-flight Moment deep-link cache missing');
assert(notifications.includes('momentDeepLinkCache.prefetch') && notifications.includes('void momentPrefetch'), 'Activity deep link should prefetch without blocking navigation');
assert(moments.includes('momentDeepLinkCache.getPending'), 'Moments must reuse the in-flight deep-link request');
assert(rules.includes('match /activityMeta/{summaryId}') && cloudRules.includes('match /activityMeta/{summaryId}'), 'Badge summary Rules missing');
assert(activity.includes('activitySelfAuthoredBadgeCount') && activity.includes('selfAuthoredUnread'), 'Self-authored family notifications must not badge the actor');
console.log('Phase 11.0 Activity performance optimization contracts PASS');
