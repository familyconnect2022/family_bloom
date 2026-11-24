#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..'),source=p=>fs.readFileSync(path.join(root,p),'utf8');
const dir=source('src/components/familyGraph/FamilyGraphWebDashboard.tsx');
const route=source('src/app/(family)/(graph)/family-graph-person-detail.tsx');
assert(dir.includes('directory.map(p => <Pressable key={p.id}'));
assert(dir.includes("pathname: '/family-graph-person-detail'")&&dir.includes('personId: p.id'));
assert(dir.includes('setDirectoryOpen(false)'));
assert(dir.includes('Chưa nối'));
assert(route.includes('useFamilyGraph(familyId,user?.uid,!!personId)'));
assert(route.includes('FamilyGraphPersonSheet')&&route.includes('showPrototypeNote={false}'));
assert(route.includes('snapshot.persons.find(x=>x.id===personId)'));
assert(route.includes('relationSummary:directRelationships.map'));
assert(!route.includes('family-graph-proposals'));
const ts=require(path.join(root,'scripts/vendor/typescript/lib/typescript.js'));
for(const name of ['src/components/familyGraph/FamilyGraphWebDashboard.tsx','src/app/(family)/(graph)/family-graph-person-detail.tsx']){
 const out=ts.transpileModule(source(name),{fileName:name,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}});
 assert.equal(out.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,name);
}
console.log('PASS R16R11R12 Android person directory opens full sheet for linked and unlinked people');
