/* Android R11R4R2R4 — Web-layout parity source regression (no Expo modules needed).
 * Intentional static contract only; not a replacement for device UI or `tsc`.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const tab = rd('src/app/(tabs)/family.tsx');
const page = rd('src/app/(family)/(graph)/family-graph.tsx');
const canvas = rd('src/components/familyGraph/FamilyGraphPrototype.tsx');
const hero = rd('src/components/familyGraph/FamilyGraphWebHero.tsx');
const app = JSON.parse(rd('app.json')).expo;
assert.match(tab, /return <FamilyGraphScreen embeddedInTab onOpenOverview=/);
assert.match(tab, /return <FamilyOverview \/>/, 'keep family switcher and legacy members overview');
assert.match(page, /<FamilyGraphWebHero/);
assert.match(page, /Duyệt đề xuất/);
assert.match(page, /Quản lý gốc/);
assert.match(page, /Tìm trong phả hệ/);
assert.match(page, /initialViewMode="all"/);
assert.match(page, /headerMode="none"[\s\S]*?webParity/);
assert.match(page, /onProposePerson=/);
assert.match(canvas, /webParity && autoFitOnMount && visiblePeople\.length/);
assert.match(canvas, /\(!webParity \|\| showAdvancedControls\)/);
assert.match(canvas, /parityNodeMenu/);
assert.match(canvas, /onOpenFocus\(id\)/);
assert.match(canvas, /setSearchVisible\(true\)/);
assert.match(hero, /getBloomHeroArt\('family', palette\)/);
assert.match(hero, /getBloomFogArt\(/);
assert.equal(app.android.package, 'com.familybloom.android');
console.log('PASS R11R4R2R4 Web Graph UI Parity: tab route, hero, actions, search, full-tree camera, node menu, focus, legacy entry and Android identity');
