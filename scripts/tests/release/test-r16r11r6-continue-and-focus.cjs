'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'../../..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const graph='src/app/(family)/(graph)/';
const p=read(graph+'family-graph-person-editor.tsx'),admin=read(graph+'family-graph-admin.tsx'),rel=read(graph+'family-graph-relationship-editor.tsx'),tree=read(graph+'family-graph.tsx'),camera=read('src/components/familyGraph/FamilyGraphPrototype.tsx'),members=read('src/app/(tabs)/family.tsx');
test('Create person clears complete draft; edit existing navigates back',()=>{
 a.match(p,/if \(editing\) \{\s*router\.back\(\);\s*\} else \{\s*setDraft\(\{ \.\.\.EMPTY_PERSON \}\)/);
 a.match(p,/setAvatarUpload\(\{ phase: "idle", progress: null \}\)/);
 a.match(admin,/setPersonDraft\(\{ \.\.\.EMPTY_PERSON \}\)/);
 a.match(p,/savingRef\.current=true/);
});
test('Successful link returns to full tree with new person camera target and +20% zoom',()=>{
 a.match(rel,/focusPersonId: b, focusZoom: "1\.2"/);
 a.match(rel,/const connectedPersonId = targetIds\[0\]/);
 a.match(rel,/if \(created > 0\)/);
 a.match(tree,/entryFocusPersonId=\{requestedFocusId \|\| null\}/);
 a.match(camera,/Math\.min\(1\.35, INITIAL_SCALE \* 1\.2\)/);
});
test('Members list filter and member detail are safe',()=>{
 a.match(members,/memberSearch/);a.match(members,/shownMembers\.slice\(0, memberPageSize\)/);
 a.match(members,/router\.push\(`\/member\/\$\{member\.uid\}`/);
});
test('Release is unique, scripts format and TSX syntax parse',()=>{
 const config=JSON.parse(read('app.json'));a.ok(Number(config.expo.version.split('.').at(-1)) >= 48);a.ok(config.expo.android.versionCode >= 143058);
 for(const f of [graph+'family-graph-person-editor.tsx',graph+'family-graph-admin.tsx',graph+'family-graph-relationship-editor.tsx',graph+'family-graph.tsx','src/components/familyGraph/FamilyGraphPrototype.tsx','src/app/(tabs)/family.tsx']){
 const out=ts.transpileModule(read(f),{fileName:f,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}});
 a.equal(out.diagnostics.filter(e=>e.category===ts.DiagnosticCategory.Error).length,0,f);
 }
});
