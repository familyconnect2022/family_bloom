#!/usr/bin/env node
'use strict';
// R10: UI contract for compact Home event list & semantic card title typography.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const home=read('src/app/(tabs)/index.tsx');
const tokens=read('src/components/ui/BloomCardTypography.ts');
const marker=JSON.parse(read('scripts/setup/family-bloom-source-release.json'));
assert(['R10','R11'].includes(marker.sourceReleaseId),'R10 typography contract must survive R11');
assert.equal(marker.baselineSourceReleaseId, marker.sourceReleaseId==='R11' ? 'R10' : 'R9');
assert(tokens.includes('BLOOM_CARD_TITLE_SIZE = 15'));
assert(tokens.includes('BLOOM_CARD_TITLE_LINE_HEIGHT = 21'));
const upcoming=home.slice(home.indexOf('const HomeUpcomingIsland'),home.indexOf('const HomeMomentsIsland'));
assert(upcoming.includes('events.slice(0, 3)'),'3-event cap must remain');
assert(upcoming.includes('eventTicketList'),'keep independent event tickets');
assert(!upcoming.includes('<BloomCard'),'No nested event card');
assert(!/artwork\s*=/.test(upcoming),'Home upcoming data card must NOT render full-bleed background');
assert(home.includes('numberOfLines={2}>{event.title}'),'long event titles must be readable');
assert(home.includes('onThisDayTitle: { marginTop: 3, color: COLORS.primaryText, fontSize: BLOOM_CARD_TITLE_SIZE'),'OnThisDay card titles must use common scale');
assert(home.includes('eventTicket: { borderRadius: 18'),'independent event ticket geometry');
const files=[
'src/app/(tabs)/index.tsx',
'src/app/(tabs)/moments.tsx',
'src/app/(tabs)/planner.tsx',
'src/components/ui/BloomActionCard.tsx',
'src/components/ui/BloomPageComponents.tsx',
'src/components/events/EventCard.tsx',
'src/components/moments/MomentCard.tsx',
];
for (const f of files) {
 const source=read(f);
 assert(source.includes('BLOOM_CARD_TITLE_SIZE'),f+' must use shared card typography');
 assert(source.includes('BLOOM_CARD_TITLE_LINE_HEIGHT'),f+' must use shared line height');
}
assert(read('src/components/ui/BloomText.tsx').includes('useA3Typography'), 'theme font scaling must remain active');
console.log('R10 HOME UPCOMING & CARD TYPOGRAPHY: PASS');
