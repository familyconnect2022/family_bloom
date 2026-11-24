#!/usr/bin/env node
'use strict';
// Native Web-parity dashboard: real TypeScript logic, no mocked Firebase writes.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const root=path.resolve(__dirname,'../../..');
const ts=require(path.join(root,'scripts/vendor/typescript/lib/typescript.js'));
const prior=Module._extensions['.ts'];
Module._extensions['.ts']=(mod,file)=>{
 const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
 mod._compile(compiled.outputText,file);
};
try{
 const model=require(path.join(root,'src/components/familyGraph/familyGraphWebDashboardModel.ts'));
 const f=id=>({id,displayName:id,birthYear:1922});
 const rel=(id,a,b,type='parent_child',subtype='biological')=>({id,personAId:a,personBId:b,type,subtype,partnerStatus:null});
 const snap={familyId:'demo',persons:['a','b','c','d','s','orphan'].map(f),relationships:[
  rel('ab','a','b'),rel('bc','b','c'),rel('cd','c','d'),rel('pair','c','s','partner',null),
  rel('unknown','orphan','s','parent_child','unknown')
 ]};
 const result=model.summarizeNativeFamilyGraph(snap,[]);
 assert.equal(result.people,6);assert.equal(result.relations,5);
 assert.equal(result.generations,4);assert.equal(result.provisional,true);
 assert.equal(result.unlinked,0,'A stored unverified relation counts as a recorded link in the member directory');
 assert.equal(model.summarizeNativeFamilyGraph({...snap,relationships:snap.relationships.slice(0,4)},[]).unlinked,1);
 assert.equal(model.summarizeNativeFamilyGraph(snap,['a']).generations,4);
 assert.equal(model.summarizeNativeFamilyGraph(snap,['a']).provisional,false);
 const distinct=model.summarizeNativeFamilyGraph({...snap,persons:[...snap.persons,f('a'),f('secondNamedSame')]},[]);
 assert.equal(distinct.people,7,'duplicate person ID collapses, distinct ID preserved');
 const unknown=model.summarizeNativeFamilyGraph({familyId:'x',persons:[f('x'),f('y')],relationships:[rel('unverified','x','y','parent_child','unknown')]},[]);
 assert.equal(unknown.generations,null,'unknown parentage must never create a generation');
 const circle=model.summarizeNativeFamilyGraph({familyId:'x',persons:[f('a'),f('b')],relationships:[rel('ab','a','b'),rel('ba','b','a')]},[]);
 assert.equal(circle.generations,null,'cycles are not assigned a fake generation count');
 const tab=fs.readFileSync(path.join(root,'src/app/(tabs)/family.tsx'),'utf8');
 const ui=fs.readFileSync(path.join(root,'src/components/familyGraph/FamilyGraphWebDashboard.tsx'),'utf8');
 assert(tab.includes('FamilyGraphWebDashboard onExplore=')&&tab.includes("view === 'tree'"));
 assert(ui.includes('Danh sách thành viên')&&ui.includes('Chưa nối')&&ui.includes('Khám phá cây gia đình'));
 assert(ui.includes('KeyboardAvoidingView')&&ui.includes('Modal transparent visible={directoryOpen}'));
 assert(ui.includes('Tiện ích Cây nhà · Kỷ yếu · Dòng thời gian'));
 const verifyNoWrite=fs.readFileSync(path.join(root,'src/components/familyGraph/familyGraphWebDashboardModel.ts'),'utf8');
 assert(!/(setDoc|updateDoc|deleteDoc|writeBatch|commit\(|transaction\()/i.test(verifyNoWrite));
 console.log('PASS R16R11R1 native Web dashboard: 4-gen model, real recorded links, unknown excluded, ID-dedupe, cycle, role UI, modal, legacy tools');
} finally{Module._extensions['.ts']=prior;}
