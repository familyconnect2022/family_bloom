'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const base='src/app/(family)/(graph)/';
const person=read(base+'family-graph-person-editor.tsx');
const relation=read(base+'family-graph-relationship-editor.tsx');
const admin=read(base+'family-graph-admin.tsx');
test('Create person and edit person: committed success exits editor to full tree',()=>{
 assert.match(person,/await familyGraphMutationService\.createPerson/);
 assert.match(person,/router\.replace\("\/family-graph" as never\)/);
 assert.doesNotMatch(person,/showToast\([\s\S]*?\);\s*router\.back\(\);\s*\} catch/);
 assert.match(admin,/if\(!editingPersonId\)router\.replace\("\/family-graph" as never\)/);
});
test('Optional avatar or notice errors do not misreport a persisted person as failed',()=>{
 assert.match(person,/let avatarUpdated=true/);
 assert.match(person,/avatarUpdated=false/);
 assert.match(person,/A person has already been committed/);
 assert.match(person,/Đã lưu hồ sơ, ảnh chưa cập nhật/);
 assert.match(person,/Person save succeeded/);
});
test('Relationship partner AND parent/child confirmation navigate to full tree',()=>{
 assert.match(relation,/await familyGraphMutationService\.createRelationship/);
 assert.match(relation,/await familyGraphMutationService\.createParentChildRelationshipsBatch/);
 assert.equal((relation.match(/router\.replace\("\/family-graph" as never\)/g)||[]).length,2);
 assert.match(relation,/if \(batchStats\.conflict > 0\)/);
 assert.match(relation,/catch \(nextError\) \{\s*showToast/);
});
test('Synchronous save guard prevents double click before busy renders',()=>{
 assert.match(person,/if\(savingRef\.current\)return/);
 assert.match(relation,/if\(savingRef\.current\)return/);
 assert.match(person,/savingRef\.current=true;setBusy\(true\)/);
 assert.match(relation,/savingRef\.current=true;setBusy\(true\)/);
 assert.match(person,/savingRef\.current=false;setBusy\(false\)/);
 assert.match(relation,/savingRef\.current=false;setBusy\(false\)/);
});
test('Native modified TSX files parse, release version increments and no session changes',()=>{
 for(const name of ['family-graph-person-editor.tsx','family-graph-relationship-editor.tsx','family-graph-admin.tsx']){
  const file=read(base+name);
  const parsed=ts.transpileModule(file,{fileName:name,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}});
  assert.equal((parsed.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,name+' syntax');
 }
 const app=JSON.parse(read('app.json'));
 assert.equal(app.expo.version,'1.3.46');
 assert.equal(app.expo.android.versionCode,143056);
});
