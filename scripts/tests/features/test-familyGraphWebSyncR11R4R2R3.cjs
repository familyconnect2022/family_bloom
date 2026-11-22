/** R11R4R2R3: real algorithm regression against the Web GRAPH-LINE-01 contract. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ts=require('typescript');
const root=path.resolve(__dirname,'../../..');
const extensionsBefore=require.extensions['.ts'];
require.extensions['.ts']=function(module,filename){
  const source=fs.readFileSync(filename,'utf8');
  const out=ts.transpileModule(source,{fileName:filename,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,strict:true,esModuleInterop:true}});
  const errors=(out.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
  assert.equal(errors.length,0,errors.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join('; '));
  module._compile(out.outputText,filename);
};
const {createFamilyGraphQueryEngine}=require(path.join(root,'src/services/familyGraph/familyGraphQueryEngine.ts'));
const {adaptFamilyGraphSnapshot,getFamilyGraphGenerationY}=require(path.join(root,'src/components/familyGraph/familyGraphLiveAdapter.ts'));
const {buildFamilyGraphGeometry}=require(path.join(root,'src/components/familyGraph/familyGraphGeometry.ts'));
const {androidSiblingCorridor,androidMinimumGenerationStep,androidUnionLineStyle,androidSiblingGlyphVisible}=require(path.join(root,'src/components/familyGraph/familyGraphLineCorridor.ts'));
const {FAMILY_GRAPH_CANVAS}=require(path.join(root,'src/components/familyGraph/familyGraphPrototypeData.ts'));
const familyId='web-sync-family';
const person=(id,gender,birthYear)=>({id,familyId,gender,displayName:id,nickname:null,linkedUid:null,birthDate:null,birthYear,birthPlace:null,deathDate:null,deathYear:null,lifeStatus:'living',birthOrder:null,avatarUrl:null,description:null,createdByUid:'owner',createdAt:'2026-01-01',updatedAt:'2026-01-01'});
const edge=(a,b,subtype='biological')=>({id:`pc_${a}_${b}`,familyId,type:'parent_child',personAId:a,personBId:b,subtype,partnerStatus:null,startDate:null,endDate:null,createdByUid:'owner',createdAt:'2026-01-01',updatedAt:'2026-01-01'});
const union=(a,b,partnerStatus)=>({id:`pt_${a}_${b}`,familyId,type:'partner',personAId:a,personBId:b,subtype:null,partnerStatus,startDate:null,endDate:null,createdByUid:'owner',createdAt:'2026-01-01',updatedAt:'2026-01-01'});
const snapshot={familyId,
  persons:[person('Long','male',1950),person('Bich','female',1952),person('Nhan','male',1988),person('Hong','female',1991),person('B','female',1990),person('Minh','male',2026),person('GiaA','other',2020),person('GiaB','other',2021),person('Linh','female',2025),person('Khoi','male',2024)],
  relationships:[union('Long','Bich','married'),edge('Long','Nhan'),edge('Bich','Nhan'),union('Nhan','Hong','married'),union('Nhan','B','partner'),edge('Nhan','Minh'),edge('Hong','Minh'),edge('Nhan','GiaA','adoptive'),edge('Hong','GiaA','adoptive'),edge('Nhan','GiaB','adoptive'),edge('B','GiaB','adoptive'),edge('B','Linh'),edge('Hong','Khoi')],
};
const query=createFamilyGraphQueryEngine(snapshot);
const ids=result=>new Set(result.personIds);
const focusMinh=query.getFocusBranchSubgraph('Minh',{descendantDepth:50,maxPeople:50,includeDescendantPartners:true});
assert.ok(focusMinh);for(const id of ['Long','Bich','Nhan','Hong','Minh']) assert.ok(ids(focusMinh).has(id),'Focus Minh missing '+id);
for(const id of ['Linh','GiaA','GiaB','Khoi']) assert.ok(!ids(focusMinh).has(id),'Focus Minh sideways '+id);
const focusNhan=query.getFocusBranchSubgraph('Nhan',{descendantDepth:50,maxPeople:50,includeDescendantPartners:true});
for(const id of ['Long','Bich','Hong','B','Minh','GiaA','GiaB']) assert.ok(ids(focusNhan).has(id),'Focus Nhan missing '+id);
for(const id of ['Linh','Khoi']) assert.ok(!ids(focusNhan).has(id),'Focus Nhan sideways '+id);
(async()=>{
 const interruptible=await query.getFocusBranchSubgraphInterruptible('Minh',{descendantDepth:50,maxPeople:50,includeDescendantPartners:true});
 assert.deepEqual(new Set(interruptible.personIds),new Set(focusMinh.personIds),'Focus sync / async mismatch');
 const layout=adaptFamilyGraphSnapshot(snapshot);
 assert.equal(layout.connections.find(x=>x.id==='pt_Nhan_B').partnerStatus,'partner');
 assert.equal(layout.connections.find(x=>x.id==='pt_Nhan_Hong').partnerStatus,'married');
 assert.equal(getFamilyGraphGenerationY(2)-getFamilyGraphGenerationY(1),344);
 const geometry=buildFamilyGraphGeometry({...layout,layoutKey:'r11r4r2r3:test'});
 const nB=geometry.partnerUnits.find(x=>x.id==='pt_Nhan_B');
 assert.deepEqual(nB.sharedChildIds,['GiaB']);
 assert.deepEqual(nB.privateChildren,[{childId:'Linh',parentId:'B'}]);
 assert.equal(geometry.singleParentLinks.some(x=>x.parentId==='B'&&x.childId==='Linh'),false,'visually grouped edge must not be double drawn');
 const nHong=geometry.partnerUnits.find(x=>x.id==='pt_Nhan_Hong');
 assert.equal(nHong.privateChildren.length,0,'must not adopt solo Hong Khoi into Nhan/Hong marriage');
 assert.equal(geometry.singleParentLinks.some(x=>x.parentId==='Hong'&&x.childId==='Khoi'),true);
 assert.equal(androidUnionLineStyle('married'),'solid');assert.equal(androidUnionLineStyle('partner'),'dashed');
 assert.equal(androidSiblingGlyphVisible(1),false);assert.equal(androidSiblingGlyphVisible(2),true);
 assert.ok(androidMinimumGenerationStep(176)>=344);
 const corridor=androidSiblingCorridor(200,368);assert.equal(corridor.requiredExtra,0);assert.ok(corridor.y>233 && corridor.y<299);
 // The exact visual group is NOT a second parent edge in Firebase.
 assert.equal(snapshot.relationships.some(x=>x.type==='parent_child'&&x.personAId==='Nhan'&&x.personBId==='Linh'),false);
 const edgesBefore=snapshot.relationships.length;buildFamilyGraphGeometry({...layout,layoutKey:'r11r4r2r3:test2'});assert.equal(snapshot.relationships.length,edgesBefore);
 // Ambiguity with two active partners sharing a child: no guessing.
 const ambiguous={...snapshot,relationships:[...snapshot.relationships,union('B','Extra','partner'),edge('Extra','GiaB','adoptive')],persons:[...snapshot.persons,person('Extra','male',1980)]};
 const alt=buildFamilyGraphGeometry({...adaptFamilyGraphSnapshot(ambiguous),layoutKey:'r11r4r2r3:ambiguous'});
 assert.equal(alt.partnerUnits.filter(x=>x.privateChildren.some(y=>y.childId==='Linh')).length,0);
 console.log('[ANDROID R11R4R2R3 WEB PARITY PASS] Focus full ancestry (sync/async), no sideways children, native 344 corridor, husband/partner, private sibling, ambiguous safety, no Firestore mutation');
})().catch(e=>{console.error(e);process.exitCode=1;});
