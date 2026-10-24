#!/usr/bin/env node
'use strict';
const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
// Pure-source contract: MUST run without node_modules; safe before any Auto Update backup.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__legacyScriptsDir,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const flag=read('src/constants/featureFlags.ts');
const android=read('src/app/(tabs)/play.tsx');
const web=read('src/web/pages/PlayWebPage.tsx');
const board=read('src/app/(home)/(board)/home-board.tsx');
const routes=read('src/app/_layout.tsx');
const action=read('src/components/ui/BloomActionCard.tsx');
const moments=read('src/app/(tabs)/moments.tsx');
const calendar=read('src/app/(tabs)/planner.tsx');
let passed=0;
const test=(title,fn)=>{fn();console.log(`PASS ${++passed} ${title}`);};
test('feature disabled by default',()=>assert.match(flag,/ENABLE_FAMILY_BULLETIN:\s*boolean\s*=\s*false/));
test('existing Family Graph deployment flags are not deleted',()=>{
  assert.match(flag,/export\s+const\s+FEATURE_FLAGS\s*=\s*\{/);
  assert.match(flag,/get USE_CLOUD_FUNCTIONS\(\)/);
  assert.match(read('src/constants/cloudRuntimeState.ts'),/cloudFunctionsActive = false/);
  assert.match(flag,/CROSS_FAMILY_GRAPH_BRIDGE_AVAILABLE:\s*true/);
  assert.match(flag,/CROSS_FAMILY_GRAPH_BRIDGE_DEFAULT_ENABLED:\s*false/);
});
test('Android Bảng tin card is behind feature flag',()=>assert.match(android,/\{ENABLE_FAMILY_BULLETIN && \(\s*<HubCard[^>]*title="Bảng tin Nhà Mình"/));
test('Android retains Fund and Poll cards',()=>['title="Quỹ gia đình"','title="Cùng quyết định"'].forEach(x=>assert(android.includes(x))));
test('learning remains discoverable and navigable',()=>{assert(android.includes('title="Góc học tập Super Bloom"'));assert(android.includes('router.push("/learning-library"'));});
test('old board route preserved for future reactivation',()=>{assert(routes.includes('name="(home)/(board)/home-board"'));assert(board.includes('function ActiveHomeBoardScreen()'));});
test('direct link redirects before deferred board mounts any listener/fetch',()=>{const wrap=board.indexOf('export default function HomeBoardScreen()');const active=board.indexOf('function ActiveHomeBoardScreen()');assert(wrap>=0&&active>wrap);assert(board.slice(wrap,active).includes('if (!ENABLE_FAMILY_BULLETIN) return <Redirect href="/(tabs)/play" />;'));assert(board.indexOf('useFocusEffect',active)>active);});
test('no deletion of historic board data sources',()=>{assert(board.includes('eventService.listReminderWindow'));assert(board.includes('momentsService.listFamilyTimelineOnce'));});
test('Web bulletin menu gated and initial page defaults to Games',()=>{assert(web.includes('...(ENABLE_FAMILY_BULLETIN ? ['));assert(web.includes('useState<Section>(ENABLE_FAMILY_BULLETIN ? "feed" : "games")'));assert(web.includes('ENABLE_FAMILY_BULLETIN && section==="feed"'));});
test('Web other functions still reachable',()=>['"games"','"fund"','"whisper"','"poll"','"kitchen"','"capsule"'].forEach(x=>assert(web.includes(x))));
test('both create CTA cards remain accessible',()=>{assert(moments.includes('testID="moment-create-action"'));assert(calendar.includes('testID="planner-create-event"'));});
test('CTA smaller and separated from the next card',()=>{assert(action.includes('minHeight: 86'));assert(action.includes('marginBottom: 14'));assert(action.includes('height: 48, width: 48'));assert(!action.includes('minHeight: 100'));});
test('no new Firebase setup or backend deployment required',()=>{assert(!flag.includes('firestore'));assert(!android.includes('homeBoardService'));});
console.log(`H25R2R7R1 BULLETIN DEFERRED: ${passed}/${passed} PASS`);
