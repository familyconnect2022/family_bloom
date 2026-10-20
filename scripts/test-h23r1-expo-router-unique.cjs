#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {duplicatesInLayout,checkAppRoutes,assertUniqueRoutes}=require('./setup/check-expo-route-uniqueness.cjs');
const root=path.resolve(__dirname,'..');
let n=0;
function ok(msg,condition){assert(condition,msg);n++;console.log(`PASS H23R1 ${String(n).padStart(2,'0')}: ${msg}`);}
const layout=fs.readFileSync(path.join(root,'src/app/_layout.tsx'),'utf8');
ok('real root Stack has no duplicate routes',duplicatesInLayout(layout).length===0);
ok('Chess screen is declared exactly once',(layout.match(/<Stack\.Screen name="\(home\)\/\(games\)\/home-chess"/g)||[]).length===1);
ok('Xiangqi screen is declared exactly once',(layout.match(/<Stack\.Screen name="\(home\)\/\(games\)\/home-xiangqi"/g)||[]).length===1);
ok('source layout contains both family arenas',layout.includes('home-chess')&&layout.includes('home-xiangqi'));
ok('scanner detects exact H23 bug',duplicatesInLayout(layout.replace('      <Stack.Screen name="(home)/(games)/home-xiangqi"', '      <Stack.Screen name="(home)/(games)/home-chess"')).some(s=>s.includes('home-chess')));
ok('scanner supports same name in different navigator files',duplicatesInLayout('<Tabs.Screen name="index" />').length===0);
ok('scanner rejects duplicate Stack entries',duplicatesInLayout('<Stack.Screen name="a" />\n<Stack.Screen name="a" />').length===1);
ok('scanner rejects duplicate Tabs entries',duplicatesInLayout('<Tabs.Screen name="a" />\n<Tabs.Screen name="a" />').length===1);
ok('scanner tolerates unique siblings',duplicatesInLayout('<Stack.Screen name="a" />\n<Stack.Screen name="b" />').length===0);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'family-bloom-router-gate-'));
try{
 const app=path.join(temp,'src/app');fs.mkdirSync(app,{recursive:true});
 fs.writeFileSync(path.join(app,'_layout.tsx'),'<Stack.Screen name="home-chess" />\n<Stack.Screen name="home-chess" />');
 ok('full scanner fails a duplicated temp project',checkAppRoutes(temp).problems.length===1);
 fs.writeFileSync(path.join(app,'_layout.tsx'),'<Stack.Screen name="home-chess" />');
 ok('full scanner passes after correcting temp project',checkAppRoutes(temp).problems.length===0);
}finally{fs.rmSync(temp,{recursive:true,force:true});}
ok('entire real Expo Router tree passes',assertUniqueRoutes(root).problems.length===0);
const packageJson=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
ok('route:check is registered',packageJson.scripts['route:check']==='node scripts/setup/check-expo-route-uniqueness.cjs');
for(const file of ['scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat','scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat','scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat','scripts/android/dev/Family_Bloom_Android_Debug_Build_And_Run.bat']){
 ok(`route gate invoked by ${path.basename(file)}`,fs.readFileSync(path.join(root,file),'utf8').includes(String.raw`node scripts\setup\check-expo-route-uniqueness.cjs`));
}
ok('Metro BAT rejects duplicates before expo start',fs.readFileSync(path.join(root,'scripts/android/dev/Family_Bloom_Android_Metro_Only.bat'),'utf8').indexOf(String.raw`node scripts\setup\check-expo-route-uniqueness.cjs`) < fs.readFileSync(path.join(root,'scripts/android/dev/Family_Bloom_Android_Metro_Only.bat'),'utf8').indexOf('call npx expo start --dev-client'));
ok('EAS post-install enforces route check before bundling',packageJson.scripts['eas-build-post-install'].startsWith('node scripts/setup/check-expo-route-uniqueness.cjs &&'));
console.log(`H23R1 Expo Router regression: ${n}/${n} PASS`);
