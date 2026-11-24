/** Pure acceptance + source-integrity gate: no Firebase calls, no npm registry. */
const assert = require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const root=path.resolve(__dirname,'../../..');
const load=(r)=>fs.readFileSync(path.join(root,r),'utf8');
const ext=require.extensions['.ts'];
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const {concurrentMarriageConflict}=require(path.join(root,'src/services/familyGraph/familyGraphMarriageGuard.ts'));
const p=(id,a,b,status)=>({id,type:'partner',personAId:a,personBId:b,partnerStatus:status});
const rs=[p('marriedAB','A','B','married'),p('separatedCD','C','D','separated'),p('divorcedEF','E','F','divorced')];
assert.equal(concurrentMarriageConflict(rs,'A','G')?.id,'marriedAB');
assert.equal(concurrentMarriageConflict(rs,'G','B')?.id,'marriedAB');
assert.equal(concurrentMarriageConflict(rs,'C','X')?.id,'separatedCD');
assert.equal(concurrentMarriageConflict(rs,'E','G'),null);
assert.equal(concurrentMarriageConflict(rs,'A','B','marriedAB'),null);
assert.equal(concurrentMarriageConflict(rs,'Z','Y'),null);
const personSheet=load('src/components/familyGraph/FamilyGraphPersonSheet.tsx');
const graph=load('src/components/familyGraph/FamilyGraphPrototype.tsx');
const route=load('src/app/(family)/(graph)/family-graph.tsx');
const editor=load('src/app/(family)/(graph)/family-graph-relationship-detail.tsx');
const mutation=load('src/services/familyGraph/familyGraphMutationService.ts');
for(const code of [personSheet,graph,route]) assert.match(code,/onEditRelationship/);
assert.match(personSheet,/name="create-outline"/);
assert.match(personSheet,/name="trash-outline"/);
assert.match(editor,/con \$\{parentText\[subtype\]\}/);
assert.match(editor,/role = parentGender/);
assert.match(editor,/updateFamilyGraphParentChildSubtypeDirect/);
assert.match(editor,/updatePartnerRelationship/);
assert.match(editor,/Xác nhận cập nhật/);
assert.match(mutation,/concurrentMarriageConflict\(/);
assert.match(mutation,/tx\.update\(ref, \{ subtype: nextSubtype, updatedAt/);
assert.match(mutation,/if \(rel\.type !== "parent_child"\)/);
assert.match(load('src/components/familyGraph/familyGraphLiveAdapter.ts'),/partnerStatus/);
assert.match(load('src/components/familyGraph/FamilyGraphUnionLines.tsx'),/FamilyGraphUnionLines/);
assert.match(load('src/components/familyGraph/FamilyGraphFocusView.tsx'),/FamilyGraphUnionLines/);
const files=[
  'src/components/familyGraph/FamilyGraphUnionLines.tsx',
  'src/components/familyGraph/FamilyGraphPrototype.tsx',
  'src/components/familyGraph/FamilyGraphFocusView.tsx',
  'src/components/familyGraph/FamilyGraphPersonSheet.tsx',
  'src/components/familyGraph/familyGraphGeometry.ts',
  'src/components/familyGraph/familyGraphWebSubtreeLayout.ts',
    'src/components/familyGraph/familyGraphLiveAdapter.ts',
  'src/components/familyGraph/familyGraphLineCorridor.ts',
  'src/components/familyGraph/familyGraphSceneBuilder.ts',
  'src/services/familyGraph/familyGraphQueryEngine.ts',
  'src/services/familyGraph/familyGraphMutationService.ts',
  'src/services/familyGraph/familyGraphMarriageGuard.ts',
  'src/app/(family)/(graph)/family-graph.tsx',
  'src/app/(family)/(graph)/family-graph-relationship-detail.tsx',
];
for(const file of files){
 const result=ts.transpileModule(load(file),{fileName:file,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
 const errs=(result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
 assert.deepEqual(errs.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' ')),[],`TS transpile failure in ${file}`);
}
console.log('[ANDROID R11R4R2R3 UI+MARRIAGE PASS] detail edit wiring, role directions, client marriage guard, native scene/focus, 13 TS/TSX source syntax checks');
