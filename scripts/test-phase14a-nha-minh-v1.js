const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
const expect = (name, ok) => checks.push({ name, ok: !!ok });

const play = read('src/app/(tabs)/play.tsx');
const tabs = read('src/app/(tabs)/_layout.tsx');
const service = read('src/services/homeHub/homeHubService.ts');
const rules = read('firestore.rules');
const hero = read('src/components/ui/BloomHeroHeader.tsx');
const whispers = read('src/app/(home)/(whispers)/home-whispers.tsx');
const polls = read('src/app/(home)/(polls)/home-polls.tsx');
const kitchen = read('src/app/(home)/(kitchen)/home-kitchen/index.tsx');

expect('Tab renamed to Nhà Mình', tabs.includes('title: "Nhà Mình"'));
expect('Nhà Mình hub has Bloom Supper hero', play.includes('variant="living"') && play.includes('title="Chỗ cả nhà cùng vui"'));
expect('Hub exposes Thì thầm', play.includes('/home-whispers') && play.includes('Thì thầm'));
expect('Hub exposes family polls', play.includes('/home-polls') && play.includes('Cùng quyết định'));
expect('Hub exposes kitchen', play.includes('/home-kitchen') && play.includes('Bếp Nhà Mình'));
expect('Whispers are family scoped', service.includes('familyHomeWhispers') && whispers.includes('activeFamilyId'));
expect('Polls are family scoped', service.includes('familyHomePolls') && polls.includes('activeFamilyId'));
expect('Poll vote is per UID', service.includes('[`votes.${uid}`]'));
expect('Kitchen recipes work without Firebase', kitchen.includes('HOME_KITCHEN_RECIPES'));
expect('Bloom Supper has living-purpose artwork', hero.includes('| "living"') && hero.includes('LivingIllustration'));
expect('Firestore allows home whispers only to family', rules.includes('match /homeWhispers/{whisperId}') && rules.includes('request.resource.data.authorUid == request.auth.uid'));
expect('Firestore protects poll vote ownership', rules.includes('request.resource.data.votes.diff(resource.data.votes).affectedKeys().hasOnly([request.auth.uid])'));
expect('Performance Lab remains internal gated', play.includes('PERFORMANCE_TEST_BUILD') && play.includes('isPerformanceTestAccount'));

let failed = 0;
for (const check of checks) {
  if (check.ok) console.log(`PASS | ${check.name}`);
  else { failed += 1; console.log(`FAIL | ${check.name}`); }
}
console.log(`\nPhase 14A Nhà Mình V1: ${checks.length - failed}/${checks.length} PASS`);
process.exit(failed ? 1 : 0);
