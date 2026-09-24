const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

const momentTypes = read('src/types/moments.ts');
const eventTypes = read('src/types/event.ts');
const directRules = read('firestore.rules');
const cloudRules = read('firestore.cloud.rules');
const functionsIndex = read('functions/index.js');
const personSheet = read('src/components/familyGraph/FamilyGraphPersonSheet.tsx');
const graphPrototype = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
const profile = read('src/app/profile.tsx');
const momentsScreen = read('src/app/(tabs)/moments.tsx');
const plannerScreen = read('src/app/(tabs)/planner.tsx');

expect(momentTypes.includes('personIds: string[]'), 'MomentPost.personIds missing');
expect(eventTypes.includes('personIds: string[]'), 'FamilyEvent.personIds missing');
expect(directRules.includes('allow create: if familyAccess(familyId)') && directRules.includes('Creator sở hữu nội dung của mình'), 'Direct Timeline member create/creator update rules missing');
expect(directRules.includes('resource.data.createdByUid == request.auth.uid || graphAdmin(familyId)'), 'Timeline creator/admin delete rule missing');
expect(cloudRules.includes('match /timeline/{entryId}') && cloudRules.includes('allow create, update, delete: if false;'), 'Cloud rules must keep timeline writes on trusted backend path');
expect(functionsIndex.includes('async updateTimelineEntry') && functionsIndex.includes('memberTimelineActions'), 'Cloud Function Timeline member actions missing');
expect(functionsIndex.includes('entry.data()?.createdByUid !== actorUid') && functionsIndex.includes('assertAdminInTransaction'), 'Timeline moderation delete contract missing in Functions');
expect(personSheet.includes('Kỷ niệm') && personSheet.includes('Được thêm bởi') && personSheet.includes('linkedEvents'), 'Person Detail integration missing');
expect(personSheet.includes('router.push({ pathname: "/(tabs)/moments"') && personSheet.includes('router.push({ pathname: "/(tabs)/planner"'), 'Person quick-create integrations missing');
expect(!graphPrototype.includes('accessibilityLabel="Phóng to cây"') && !graphPrototype.includes('accessibilityLabel="Thu nhỏ cây"'), 'Canvas +/- controls must be removed');
expect(graphPrototype.includes('locate-outline') || graphPrototype.includes('scan-outline') || graphPrototype.includes('locate'), 'Canvas recenter/focus control missing');
expect(profile.includes('expo-clipboard') && profile.includes('Family ID') && profile.includes('Sao chép'), 'Profile Family ID copy UI missing');
expect(momentsScreen.includes('FamilyPersonMultiPicker') && momentsScreen.includes('personIds'), 'Moment Person picker missing');
expect(plannerScreen.includes('FamilyPersonMultiPicker') && plannerScreen.includes('personIds'), 'Event Person picker missing');

console.log('Phase 6.5 Person Experience / Integration contract tests: PASS');
