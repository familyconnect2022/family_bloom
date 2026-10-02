const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const must = (value, message) => { if (!value) throw new Error(message); };

const activity = read('src/services/activity/activityService.ts');
const paths = read('src/services/firebase/firestorePaths.ts');
const publish = read('src/context/MomentPublishContext.tsx');
const home = read('src/app/(tabs)/index.tsx');
const notifications = read('src/app/notifications.tsx');
const moments = read('src/app/(tabs)/moments.tsx');
const graph = read('src/app/family-graph.tsx');
const prototype = read('src/components/familyGraph/FamilyGraphPrototype.tsx');

must(paths.includes('familyPersonLinks:'), 'Missing familyPersonLinks collection path');
must(activity.includes('resolveLinkedUidForPerson'), 'Tagged Person fallback resolver missing');
must(activity.includes('where("personId", "==", personId)'), 'personLinks fallback query missing');
must(publish.includes('const retryDelays = [900, 2400]'), 'Moment activity retry checkpoints missing');
must(home.includes('badgeRefreshTimerRef') && home.includes('1200'), 'Home badge debounce missing');
must(activity.includes('familyActivityBadgeSummary') && activity.includes('memberActivityBadgeSummary'), 'Lightweight badge summary missing');
must(!home.includes('subscribe') || !home.includes('activityService.subscribe'), 'Hotfix must not add activity realtime listener');
must(notifications.includes('highlightFamilyId: activity.familyId'), 'Cross-family Moment deep-link family id missing');
must(moments.includes('momentDeepLinkCache.getPending') && moments.includes('momentsService.getById(activeFamilyId, highlightMomentId)'), 'Shared in-flight Moment deep-link fetch missing');
must(moments.includes('Đang mở kỷ niệm…'), 'Moment deep-link feedback missing');
must(moments.includes('personPickerSection'), 'Composer picker/media spacing fix missing');
must(graph.includes('onAddPerson='), 'Graph add-person action wiring missing');
must(prototype.includes('Thêm người vào phả hệ'), 'Graph add-person accessible action missing');

console.log('Phase 11.0 Activity badge/deeplink/Graph UX hotfix contracts PASS');
