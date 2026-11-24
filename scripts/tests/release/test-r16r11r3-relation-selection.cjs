'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require('typescript');
const root=path.resolve(__dirname,'../../..');
const policy=fs.readFileSync(path.join(root,'src/utils/relationshipSelectionPolicy.ts'),'utf8');
const tr=ts.transpileModule(policy,{fileName:'relationshipSelectionPolicy.ts',reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
assert.equal((tr.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
const m={exports:{}};vm.runInNewContext(tr.outputText,{module:m,exports:m.exports});
const {limitForRelationshipSide:limit,toggleRelationshipPerson:toggle,validateRelationshipPeople:validate}=m.exports;
const select=(ids,id,mode,side)=>toggle(ids,id,mode,side);
const content=p=>fs.readFileSync(path.join(root,p),'utf8');
test('No implicit relationship mode; reject accidental selections and writes',()=>{
 assert.equal(limit(null,'base'),0);
 assert.equal(select([],'p',null,'base').blocked,true);
 assert.match(validate(null,['p'],['c']),/Hãy chọn loại/);
});
test('Partner/spouse allows exactly one person at each end',()=>{
 assert.equal(limit('partner','base'),1);assert.equal(limit('partner','target'),1);
 assert.deepEqual(Array.from(select(['a'],'b','partner','base').ids),['b']);
 assert.equal(validate('partner',['a'],['b']),null);
 assert.notEqual(validate('partner',['a','b'],['c']),null);
});
test('Parent-child directions consistently cap parents at two and keep children unbounded',()=>{
 for(const mode of ['parent_of','child_of']){
  const parentSide=mode==='parent_of'?'base':'target',childSide=mode==='parent_of'?'target':'base';
  assert.equal(limit(mode,parentSide),2);assert.equal(limit(mode,childSide),Infinity);
  let parents=[];for(const id of ['p1','p2'])parents=select(parents,id,mode,parentSide).ids;
  assert.equal(select(parents,'p3',mode,parentSide).blocked,true);
  let kids=[];for(let i=0;i<150;i++)kids=select(kids,`child-${i}`,mode,childSide).ids;
  assert.equal(kids.length,150,'no arbitrary checkbox cap for children');
  assert.equal(validate(mode,mode==='parent_of'?parents:kids,mode==='parent_of'?kids:parents),null);
 }
});
test('Prevent self links, permit unchecking and honor selection changes',()=>{
 const x=select(['a','b'],'a','parent_of','base');assert.deepEqual(Array.from(x.ids),['b']);
 assert.notEqual(validate('parent_of',['a'],['a']),null);
});
test('Both Android editors force explicit direction and validate again before save',()=>{
 const full=content('src/app/(family)/(graph)/family-graph-relationship-editor.tsx');
 const admin=content('src/app/(family)/(graph)/family-graph-admin.tsx');
 assert.match(full,/const initialMode: RelationshipMode \| null/);
 assert.match(full,/\!\!validateRelationshipPeople\(mode,baseIds,targetIds\)/);
 assert.match(full,/const selectionError=validateRelationshipPeople/);
 assert.match(full,/limitForRelationshipSide\(mode,pickerSide\)/);
 assert.match(admin,/mode: RelationshipMode \| null = null/);
 assert.match(admin,/const invalid=validateRelationshipPeople/);
 assert.match(admin,/toggleRelationshipPerson/);
});
test('UI labels reflect independent create-person and connection workflows',()=>{
 const dashboard=content('src/components/familyGraph/FamilyGraphWebDashboard.tsx');
 const tree=content('src/app/(family)/(graph)/family-graph.tsx');
 assert.match(dashboard,/Thêm người mới/);
 assert.match(dashboard,/onPress: \(\) => go\('\/family-graph-relationship-editor'\)/);
 assert.doesNotMatch(dashboard,/Nối người mới/);
 assert.doesNotMatch(tree,/Nhánh đã nối/);
});
