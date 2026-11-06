#!/usr/bin/env node
'use strict';
/** R8R3 Android live theme / surface / persistence regressions.
 * Pure tests run before npm install, network, Firebase, or Android build.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
// The updater executes this gate BEFORE npm install. Never require a project-local
// TypeScript package or an absolute CI/author-machine module path here.
// Node 22+ provides an offline type stripper. After dependencies are installed,
// an optional project-local compiler can still be used for regular source checks.
const {stripTypeScriptTypes} = require('node:module');
const transpileWithoutDependencies = (source, filename) => {
  assert.equal(typeof stripTypeScriptTypes, 'function',
    'Node.js 22+ is required for dependency-free Theme preflight. Update Node.js; do not bypass the gate.');
  // Both runtime inputs are .ts (never .tsx). Node parses and strips TS syntax.
  // Convert only the small, known ES module surface to CJS for isolated execution.
  let js = stripTypeScriptTypes(source, {mode:'transform', sourceUrl: filename});
  const exported = [...js.matchAll(/^\s*export\s+(?:async\s+)?(?:const|let|function|class)\s+([A-Za-z_$][\w$]*)/gm)]
    .map(match=>match[1]);
  assert(exported.length > 0, `No runtime exports found in ${filename}`);
  js = js.replace(/^\s*import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]\s*;?/gm,
    (_, names, sourceModule) => `const {${names}} = require(${JSON.stringify(sourceModule)});`);
  js = js.replace(/^\s*export\s+(?=(?:async\s+)?(?:const|let|function|class)\s+)/gm, '');
  assert(!/^\s*(?:import|export)\b/m.test(js),
    `Unexpected module syntax in ${filename}; refuse to execute unvalidated source`);
  return `${js}\nObject.assign(module.exports, {${exported.join(',')}});\n`;
};
const load = (filename, mockedRequire = () => { throw Error('Unexpected dependency'); }) => {
  const source = fs.readFileSync(path.join(root, filename), 'utf8');
  const compiled = transpileWithoutDependencies(source, filename);
  const m = {exports:{}};
  new Function('module','exports','require',compiled)(m,m.exports,mockedRequire);
  return m.exports;
};
const pal=load('src/theme/palette.ts');
const runtime=load('src/theme/runtime.ts',id=>{assert.equal(id,'./palette');return pal;});
const colors = (id, mode)=>pal.getBloomColors(id, mode);
const lum=s=>{
 const rgb = s.match(/^#([\da-f]{6})$/i);assert(rgb,`Color must be #RRGGBB: ${s}`);
 const ch=[0,2,4].map(i=>parseInt(rgb[1].slice(i,i+2),16)/255).map(x=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4);
 return ch[0]*0.2126+ch[1]*0.7152+ch[2]*0.0722;
};
const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};
let n=0; const pass=(label,fn)=>{fn();n++;console.log('PASS',label)};
pass('Rose Light is default for existing users; all cards pure white',()=>{
 assert.deepEqual(runtime.getBloomSelection(),pal.DEFAULT_BLOOM_SELECTION);
 assert.equal(colors('rose','light').card,'#FFFFFF');
 assert.equal(colors('rose','light').surface,'#FFFFFF');
});
pass('Four named palettes and three display modes',()=>{
 assert.deepEqual(pal.BLOOM_PALETTE_IDS,['rose','garden','heritage','midnight']);
 assert(pal.isBloomSelection({palette:'rose',mode:'system'}));
 assert(!pal.isBloomSelection({palette:'test',mode:'light'}));
 assert(!pal.isBloomSelection({palette:'rose',mode:'other'}));
});
for(const id of pal.BLOOM_PALETTE_IDS) for(const mode of ['light','dark']) {
 pass(`Palette ${id}/${mode}: unified surfaces and accessible text`,()=>{
  const c=colors(id,mode);
  assert.equal(c.surface,c.card);
  assert.equal(c.tabSurface,c.surface);
  assert.equal(c.inputSurface,c.surface);
  if(mode==='light') assert.equal(c.card,'#FFFFFF');
  else assert.notEqual(c.card,'#FFFFFF');
  assert(ratio(c.primaryText,c.surface)>=4.5,`text contrast ${id}/${mode}: ${ratio(c.primaryText,c.surface)}`);
  assert(ratio(c.secondaryText,c.surface)>=4.5,`secondary contrast ${id}/${mode}: ${ratio(c.secondaryText,c.surface)}`);
  assert(ratio(c.onPrimary,c.primary)>=4.5,`CTA contrast ${id}/${mode}: ${ratio(c.onPrimary,c.primary)}`);
  assert.notEqual(c.positive,c.destructive);
 });
}
pass('Theme change is synchronous and notifies subscribers exactly once',()=>{
 let called=0; const unsubscribe=runtime.subscribeBloomTheme(()=>called++);
 const rev=runtime.getBloomThemeRevision();
 assert(runtime.applyBloomSelection({palette:'garden',mode:'dark'}));
 assert.equal(runtime.getBloomThemeRevision(),rev+1);
 assert.equal(runtime.getBloomActiveColors().primary,colors('garden','dark').primary);
 assert.equal(called,1);
 runtime.applyBloomSelection({palette:'garden',mode:'dark'});
 assert.equal(called,1);
 unsubscribe();
});
pass('System mode follows appearance changes without losing selected palette',()=>{
 runtime.applyBloomSelection({palette:'heritage',mode:'system'});
 runtime.setBloomSystemMode('dark');
 assert.equal(runtime.getBloomResolvedMode(),'dark');
 runtime.setBloomSystemMode('light');
 assert.equal(runtime.getBloomResolvedMode(),'light');
 assert.equal(runtime.getBloomSelection().palette,'heritage');
});
pass('Bad persisted settings cannot mutate active palette',()=>{
 const saved=runtime.getBloomSelection();
 assert.equal(runtime.applyBloomSelection({palette:'unknown',mode:'dark'}),false);
 assert.deepEqual(runtime.getBloomSelection(),saved);
});
pass('Preference persistence is isolated from Firebase/Auth',()=>{
 const provider=fs.readFileSync(path.join(root,'src/theme/BloomThemeProvider.tsx'),'utf8');
 const cloud=fs.readFileSync(path.join(root,'src/theme/appearanceCloudSync.ts'),'utf8');
 assert(cloud.includes('@react-native-async-storage/async-storage'));
 assert(cloud.includes('APPEARANCE_USER_STORAGE')&&cloud.includes('if (usable(cached))'));
 assert(provider.includes('useSyncExternalStore')&&provider.includes('subscribeBloomTheme'));
 assert(!cloud.includes('onSnapshot('));
 assert(!/resetRoot|router\.|signOut|onAuthStateChanged|auth\(\)|navigation\.reset/.test(provider));
});
pass('Root wraps existing provider tree without key/reset or introducing new auth observer',()=>{
 const rootSource=fs.readFileSync(path.join(root,'src/app/_layout.tsx'),'utf8');
 assert(rootSource.includes('<BloomThemeProvider>')&&rootSource.includes('</BloomThemeProvider>'));
 assert(rootSource.includes('<AuthProvider>')&&!rootSource.includes('  useBloomThemeRevision();'));
 assert(rootSource.includes('welcomeBlocking = verifiedFamily && welcomeReady && showWelcome') && fs.readFileSync(path.join(root,'src/app/session-gate.tsx'),'utf8').includes('testID="verified-welcome-native-screen"') && !rootSource.includes('useWelcomeFrameReady()'));
 assert(!/<AuthProvider\s+key=/.test(rootSource));
});
pass('Settings exposes 4 palettes, Light/Dark/System, and accessibility states',()=>{
 const settings=fs.readFileSync(path.join(root,'src/app/(profile)/settings.tsx'),'utf8');
 const component=fs.readFileSync(path.join(root,'src/components/ui/BloomThemeSettingsPanel.tsx'),'utf8');
 assert(settings.includes('<BloomThemeSettingsPanel />'));
 assert(component.includes('BLOOM_PALETTE_IDS.map')&&component.includes('MODES.map'));
 for(const key of ["'light'","'dark'","'system'"]) assert(component.includes(key));
 assert(component.includes('accessibilityState={{ checked: active }}'));
});
pass('Central Bloom cards always use theme surface, including soft/accent tones',()=>{
 const source=fs.readFileSync(path.join(root,'src/constants/bloomSupper.ts'),'utf8');
 assert(source.includes('get card() { return COLORS.surface; }'));
 assert(source.includes('get soft() { return COLORS.surface; }'));
 assert(source.includes('get accent() { return COLORS.surface; }'));
});
pass('UI stylesheet generation is revision-aware and never touches navigation',()=>{
 const source=fs.readFileSync(path.join(root,'src/theme/createBloomStyles.ts'),'utf8');
 assert(source.includes('getBloomThemeRevision()'));
 assert(source.includes('new Proxy'));
 assert(!/import .*router|router\.(?:replace|push|reset)|navigation\.(?:reset|navigate)/.test(source));
});
pass('Toast type differences preserved after theme change',()=>{
 const source=fs.readFileSync(path.join(root,'src/components/ui/BloomToast.tsx'),'utf8');
 assert(source.includes('bar: COLORS.destructive')&&source.includes('bar: COLORS.primary'));
 assert(source.includes('bg: COLORS.surface'));
});
pass('All Android route status bars use live light/dark style',()=>{
 const base=path.join(root,'src/app');
 const files=(p)=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(p,e.name)):/\.tsx$/.test(e.name)&&!e.name.endsWith('.web.tsx')?[path.join(p,e.name)]:[]);
 for(const file of files(base)) {
   const code=fs.readFileSync(file,'utf8');
   assert(!/<StatusBar\b[^>]*style="dark"/s.test(code),file);
 }
});
pass('Math formula lines remain readable against white/dark cards',()=>{
 const formula=fs.readFileSync(path.join(root,'src/features/study/StudyFormula.tsx'),'utf8');
 const editor=fs.readFileSync(path.join(root,'src/features/study/StudyFormulaEditor.tsx'),'utf8');
 assert(formula.includes('fractionLine:{height:1.6,backgroundColor:COLORS.primaryText'));
 assert(formula.includes('rootBody:{borderColor:COLORS.primaryText'));
 assert(formula.includes('backgroundColor:COLORS.primaryText,transform:'));
 assert(editor.includes('fractionBar:{height:2.5,backgroundColor:COLORS.primaryText'));
});
pass('Animated tab colors are plain worklet captures, never dynamic Proxy access',()=>{
 const tab=fs.readFileSync(path.join(root,'src/app/(tabs)/_layout.tsx'),'utf8');
 assert(tab.includes('const activeColor = dockColors.activeIcon;'));
 assert(tab.includes('const inactiveColor = dockColors.inactiveIcon;'));
 assert(tab.includes('}), [activeColor, inactiveColor]);'));
 assert(!/useAnimatedStyle\(\(\) => \(\{[^}]*COLORS\./s.test(tab));
});
console.log(`Family Bloom R8R3 Theme Engine: ${n}/${n} PASS`);
