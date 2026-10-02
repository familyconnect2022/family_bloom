const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const graph = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
assert(graph.includes('BranchPreparingOverlay'), 'Graph branch transition overlay missing');
assert(graph.includes('await branchPreparingRef.current?.show(personName)'), 'Branch work must wait for overlay paint barrier');
assert(graph.indexOf('transition_painted') < graph.indexOf('graph_work_started'), 'Perf trace must record transition paint before graph work');
assert(graph.includes('graph_state_committed') && graph.includes('graph_first_frame'), 'Graph branch trace must measure committed/painted result');
assert(graph.includes('Bloom đang mở nhánh…'), 'Bloom branch preparation copy missing');

const page = read('src/components/ui/BloomPageComponents.tsx');
assert(page.includes('export function BloomStickyHeader'), 'Shared fixed header component missing');
assert(page.includes('<BloomBackButton onPress={onBack} />'), 'Sticky header must use canonical Bloom back button');

for (const file of [
  'src/app/profile.tsx',
  'src/app/member/[uid].tsx',
  'src/app/family-timeline.tsx',
  'src/app/memory-book.tsx',
  'src/app/notifications.tsx',
  'src/app/event/[eventId].tsx',
  'src/app/chat/index.tsx',
  'src/app/performance-test.tsx',
  'src/app/performance-data-test.tsx',
  'src/app/family-memberships.tsx',
]) {
  const source = read(file);
  assert(source.includes('BloomStickyHeader'), `${file} must keep Back/actions outside long scrolling content`);
}

for (const file of [
  'src/app/family-graph.tsx',
  'src/app/family-graph-admin.tsx',
  'src/app/family-graph-person-editor.tsx',
  'src/app/family-graph-relationship-editor.tsx',
  'src/app/family-join-requests.tsx',
]) {
  const source = read(file);
  assert(source.includes('BloomBackButton') || source.includes('BloomStickyHeader'), `${file} must use canonical Bloom page Back control`);
}

console.log('Phase 10 UX responsiveness/sticky-header contracts PASS');
