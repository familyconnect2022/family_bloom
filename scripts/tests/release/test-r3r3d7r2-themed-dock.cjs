// Source-only regression gate for the floating tabbar and all eight palette/mode combinations.
const fs=require('fs'),path=require('path'),assert=require('assert'),vm=require('vm');
const ts=require('typescript');
const base=path.join(__dirname,'../../../');
const palette=fs.readFileSync(path.join(base,'src/theme/palette.ts'),'utf8');
const dock=fs.readFileSync(path.join(base,'src/app/(tabs)/_layout.tsx'),'utf8');
const js=ts.transpileModule(palette,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const output={};vm.runInNewContext(js,{exports:output,Set,Object});
const modes=['light','dark'],names=['rose','garden','heritage','midnight'];
const seen=new Set();
for(const name of names)for(const mode of modes){
  const p=output.getBloomDockColors(name,mode);
  assert(/^#[A-Fa-f0-9]{6}$/.test(p.surface),`${name}/${mode}: missing surface`);
  assert(/^#[A-Fa-f0-9]{6}$/.test(p.border),`${name}/${mode}: missing border`);
  assert(/^#[A-Fa-f0-9]{6}$/.test(p.selected),`${name}/${mode}: missing selection`);
  assert(!seen.has(p.surface),`${name}/${mode}: background must be theme-sensitive`);
  seen.add(p.surface);
  if(mode==='dark')assert.strictEqual(p.inactiveIcon,'#211B20','Dark Mode icon must remain dark on light themed tabbar');
}
assert.strictEqual(output.getBloomDockColors('rose','dark').surface,'#FFF1F5');
assert(dock.includes('backgroundColor: "transparent"'),'Outer dock must remain transparent');
assert(dock.includes('backgroundColor: dockColors.surface'),'Inner pill must use dynamically selected theme surface');
assert(dock.includes('borderColor: dockColors.surface'),'Bubble border must visually match inner pill');
assert(dock.includes('getBloomSelection().palette'),'Dock must track selected palette');
assert(dock.includes('useBloomThemeRevision()'),'Dock must re-render when settings change');
console.log('PASS R3R3D7R2 theme dock: 8 distinct surfaces, dark ink, transparent outer frame, reactive colors');
