// No Firebase required: transpile the pure TS integrity engine with TypeScript
// and test with synthetic person/relationship fixtures in node VM.
const fs=require('fs'),path=require('path'),assert=require('assert'),vm=require('vm');
const ts=require('typescript');
const filename=path.join(__dirname,'../../../src/services/familyGraph/familyGraphIntegrity.ts');
const raw=fs.readFileSync(filename,'utf8');
const js=ts.transpileModule(raw,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},reportDiagnostics:true});
const out={};vm.runInNewContext(js.outputText,{exports:out,Set,Map,Date,Number,Math,Array,String});
const {auditFamilyGraph,checkGraphRelationshipCandidates}=out;
const person=(id,y)=>({id,familyId:'f',linkedUid:null,displayName:id,gender:'other',birthDate:null,birthYear:y,deathDate:null,deathYear:null,lifeStatus:'unknown'});
const pc=(a,b,id=`${a}-${b}`,subtype='biological')=>({id,familyId:'f',type:'parent_child',personAId:a,personBId:b,subtype,partnerStatus:null,startDate:null,endDate:null});
const partner=(a,b)=>({id:`pt-${a}-${b}`,familyId:'f',type:'partner',personAId:a,personBId:b,subtype:null,startDate:null,endDate:null});
let g={familyId:'f',persons:[person('a',1940),person('b',1965),person('c',1990)],relationships:[pc('a','b'),pc('b','c')]};
assert.equal(auditFamilyGraph(g).blocks,0);
assert(checkGraphRelationshipCandidates(g,[pc('c','a')]).some(i=>i.code==='G03'));
assert(checkGraphRelationshipCandidates(g,[pc('c','a')]).some(i=>i.code==='G05'));
assert(checkGraphRelationshipCandidates(g,[pc('a','c','extra','step')]).every(i=>i.code!=='G03'));
assert(auditFamilyGraph({...g,relationships:[...g.relationships,partner('a','c')]}).issues.some(i=>i.code==='W10'));
assert(auditFamilyGraph({...g,persons:[...g.persons,person('d',1958)],relationships:[...g.relationships,pc('d','b')]}).warnings>=1);
const wrong={...g,relationships:[pc('c','b')]};
assert(auditFamilyGraph(wrong).issues.some(i=>i.code==='G05'));
console.log('PASS FamilyGraph integrity: chronological, cycles, step exceptions, biological warning, candidate diffs');
