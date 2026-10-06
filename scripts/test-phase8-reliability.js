const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');
const assert = require('assert');

const root = path.resolve(__dirname, '..');

function loadTs(rel) {
  const file = path.join(root, rel);
  const source = fs.readFileSync(file, 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: file,
  }).outputText;
  const module = { exports: {} };
  const context = vm.createContext({ module, exports: module.exports, require, console, Set, Map });
  vm.runInContext(js, context, { filename: file });
  return module.exports;
}

const policy = loadTs('src/utils/momentPublishPolicy.ts');
assert.deepStrictEqual(
  Array.from(policy.normalizeMomentTargetFamilyIds('A', ['B', 'C', 'A', 'D', 'E'])),
  ['A', 'B', 'C', 'D'],
  'multi-family Moment fan-out must be explicit, deduped and bounded',
);
assert.deepStrictEqual(Array.from(policy.normalizeMomentTargetFamilyIds(' A ', [' B ', '', 'B'])), ['A', 'B']);
assert.strictEqual(policy.momentResumeProgress(10, 3), 30);
assert.strictEqual(policy.momentResumeProgress(0, 0), 100);

const bridge = loadTs('src/services/familyGraph/crossFamilyGraphBridge.ts');
const basePerson = {
  gender: 'other', nickname: null, birthDate: null, birthYear: null, birthPlace: null,
  deathDate: null, deathYear: null, lifeStatus: 'living', birthOrder: null, avatarUrl: null,
  description: null, createdByUid: 'owner', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};
const result = bridge.buildCrossFamilyIdentityBridge([
  { familyId: 'A', relationships: [], persons: [{ ...basePerson, id: 'a1', familyId: 'A', displayName: 'A', linkedUid: 'u1' }] },
  { familyId: 'B', relationships: [], persons: [{ ...basePerson, id: 'b1', familyId: 'B', displayName: 'B', linkedUid: 'u1' }] },
  { familyId: 'C', relationships: [], persons: [{ ...basePerson, id: 'c1', familyId: 'C', displayName: 'C', linkedUid: null }] },
]);
assert.strictEqual(result.identityLinks.length, 1, 'same linkedUid across houses should create one virtual identity bridge');
assert.strictEqual(result.identityLinks[0].familyAId, 'A');
assert.strictEqual(result.identityLinks[0].familyBId, 'B');

const flags = loadTs('src/constants/featureFlags.ts');
assert.strictEqual(flags.FEATURE_FLAGS.CROSS_FAMILY_GRAPH_BRIDGE_AVAILABLE, true);
assert.strictEqual(flags.FEATURE_FLAGS.CROSS_FAMILY_GRAPH_BRIDGE_DEFAULT_ENABLED, false, 'bridge must not be enabled by default');

const publishSource = fs.readFileSync(path.join(root, 'src/context/MomentPublishContext.tsx'), 'utf8');
assert(publishSource.includes('uploadedFiles'), 'pending Moment must checkpoint successful uploads');
assert(publishSource.includes('managedUploadCheckpoint'), 'provider-upload checkpoint must be recoverable');
assert(publishSource.includes('additionalFamilyIds'), 'multi-family Moment publishing contract missing');
assert(publishSource.includes('Promise.allSettled'), 'bounded upload workers must settle before the queue advances');
assert(publishSource.includes('metadataSynced'), 'Cloudinary-success metadata repair checkpoint missing');
assert(publishSource.includes('mediaService.setUploaded(uploadedFile.assetId'), 'retry must repair media_assets metadata without re-uploading binary');

const switchSource = fs.readFileSync(path.join(root, 'src/context/AuthContext.tsx'), 'utf8');
assert(switchSource.includes('transition_painted_before_network'), 'family switch must yield a painted transition before network work');
const switcherSource = fs.readFileSync(path.join(root, 'src/components/family/FamilySwitcherModal.tsx'), 'utf8');
assert(switcherSource.indexOf('onClose();') < switcherSource.indexOf('const ok = await switching'), 'native family modal must close before awaiting network switch');

const adapterSource = fs.readFileSync(path.join(root, 'src/components/familyGraph/familyGraphLiveAdapter.ts'), 'utf8');
assert(adapterSource.includes('buildLayoutRelationshipIndex'), 'Phase 8.2 indexed graph optimization must remain present');

const plannerSource = fs.readFileSync(path.join(root, 'src/app/(tabs)/planner.tsx'), 'utf8');
assert(plannerSource.includes('calendarEnabled: appActive && mode === "calendar"'), 'Planner month listener must stay stable for the active family');
assert(plannerSource.includes('listEnabled: appActive && mode === "list"'), 'Planner list listener must stay stable for the active family');
assert(!plannerSource.includes('initialWarmComplete'), 'superseded blur-time Planner listener churn must stay removed');
const reviewSource = fs.readFileSync(path.join(root, 'src/hooks/family/usePendingFamilyReviews.ts'), 'utf8');
assert(!reviewSource.includes('useFocusEffect'), 'pending-review listeners must remain stable across Family tab switches');
const perfLabSource = fs.readFileSync(path.join(root, 'src/app/(internal)/performance-test.tsx'), 'utf8');
assert(perfLabSource.includes('Phòng đo hiệu năng') || perfLabSource.includes('Performance'), 'persistent Performance Lab must remain in the project');

console.log('Phase 8.3–8.5 reliability contracts PASS');
