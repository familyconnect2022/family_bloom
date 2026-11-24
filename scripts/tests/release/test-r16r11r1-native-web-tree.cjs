#!/usr/bin/env node
'use strict';
/** R16R11R1: real port acceptance of approved Web subtree and native camera. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const root=path.resolve(__dirname,'../../..');
const ts=require(path.join(root,'scripts/vendor/typescript/lib/typescript.js'));
const old=Module._extensions['.ts'];
Module._extensions['.ts']=(mod,file)=>{
 const code=fs.readFileSync(file,'utf8');const parsed=ts.transpileModule(code,{fileName:file,reportDiagnostics:true,
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}});
 const errors=(parsed.diagnostics??[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
 assert.equal(errors.length,0,'syntax '+file);
 mod._compile(parsed.outputText,file);
};
try{
 const base=path.join(root,'src/components/familyGraph');
 const {adaptFamilyGraphSnapshot}=require(path.join(base,'familyGraphLiveAdapter.ts'));
 const {reserveFamilyGraphWebSubtrees,WEB_PARITY_NATIVE_METRICS}=require(path.join(base,'familyGraphWebSubtreeLayout.ts'));
 const {clampNativeFamilyGraphPan}=require(path.join(base,'familyGraphWebCameraBounds.ts'));
 const {FAMILY_GRAPH_CANVAS}=require(path.join(base,'familyGraphPrototypeData.ts'));
 const stamp='2026-11-22T12:00:00.000Z',familyId='web-to-android-fixture';
 const p=(id,year=1900,gender='other')=>({id,familyId,displayName:id,gender,linkedUid:null,nickname:null,
  birthDate:null,birthYear:year,birthPlace:null,deathDate:null,deathYear:null,lifeStatus:'living',birthOrder:null,avatarUrl:null,
  description:null,createdByUid:'admin',createdAt:stamp,updatedAt:stamp});
 const parent=(a,b,subtype='biological')=>({id:`pc:${a}:${b}`,familyId,type:'parent_child',personAId:a,personBId:b,subtype,
  partnerStatus:null,startDate:null,endDate:null,createdByUid:'admin',createdAt:stamp,updatedAt:stamp});
 const couple=(a,b,partnerStatus='married')=>({id:`p:${a}:${b}`,familyId,type:'partner',personAId:a,personBId:b,subtype:null,
  partnerStatus,startDate:null,endDate:null,createdByUid:'admin',createdAt:stamp,updatedAt:stamp});
 const members=[p('a',1900,'male'),p('b',1901,'female'),p('c1',1929),p('c2',1931),p('c3',1934),
  p('s1',1930),p('s2',1933),p('s3',1935),p('g11',1950),p('g12',1952),p('g21',1957),
  p('h11',1981),p('h12',1982),p('h21',1984),p('standalone',1931)];
 const edges=[couple('a','b'),couple('c1','s1'),couple('c2','s2'),couple('c3','s3'),
  ...['c1','c2','c3'].flatMap(c=>[parent('a',c),parent('b',c)]),parent('c1','g11'),parent('s1','g11'),
  parent('c1','g12'),parent('s1','g12'),parent('c2','g21'),parent('s2','g21'),
  parent('g11','h11'),parent('g12','h12'),parent('g21','h21')];
 const scene=adaptFamilyGraphSnapshot({familyId,persons:members,relationships:edges});
 const xy=new Map(scene.people.map(x=>[x.id,x]));const box=ids=>({left:Math.min(...ids.map(id=>xy.get(id).x)),right:Math.max(...ids.map(id=>xy.get(id).x+144))});
 assert.equal(scene.people.length,members.length-1,'orphan record must not float on canvas');
 assert.equal(new Set(scene.people.map(x=>x.id)).size,scene.people.length,'no duplicate person ID');
 assert.equal(scene.connections.length,edges.length,'no lost documented relations');
 for(const [a,b] of [['a','b'],['c1','s1'],['c2','s2'],['c3','s3']]){
  assert.equal(Math.abs(xy.get(a).x-xy.get(b).x)-144,72,`fixed Web partner gap ${a}/${b}`);
 }
 const a=box(['c1','s1','g11','g12','h11','h12']);const b=box(['c2','s2','g21','h21']);const c=box(['c3','s3']);
 assert(a.right+52<=b.left||b.right+52<=a.left,'descendants must not invade next sibling subtree');
 assert(b.right+52<=c.left||c.right+52<=b.left,'sibling subtree gap remains even for childless sibling');
 assert.equal(xy.get('h11').generation,4,'4 generations survive as Web graph');
 const rev=adaptFamilyGraphSnapshot({familyId,persons:[...members].reverse(),relationships:[...edges].reverse()});
 const coords=new Map(rev.people.map(x=>[x.id,x]));
 for(const [id,n] of xy)assert.deepEqual([n.x,n.y,n.generation],
   [coords.get(id).x,coords.get(id).y,coords.get(id).generation],`deterministic ${id}`);
 const other=[p('x1',1905),p('x2',1930)];const joined=adaptFamilyGraphSnapshot({familyId,
  persons:[...members,...other],relationships:[...edges,parent('x1','x2')]});
 assert.equal(joined.people.length,scene.people.length+2);
 const sep=joined.people.filter(n=>['x1','x2'].includes(n.id));const first=joined.people.filter(n=>xy.has(n.id));
 const across={left:Math.min(...first.map(n=>n.x)),right:Math.max(...first.map(n=>n.x+144))};
 const side={left:Math.min(...sep.map(n=>n.x)),right:Math.max(...sep.map(n=>n.x+144))};
 assert(across.right+112<=side.left||side.right+112<=across.left,'independent families stay independent');
 // A documented but unverified parentage is not an invented member of the tree.
 const notConfirmed=adaptFamilyGraphSnapshot({familyId,persons:[p('k'),p('l')],relationships:[parent('k','l','unknown')]});
 assert.equal(notConfirmed.people.length,0,'unknown edge cannot create genealogy by itself');
 // Geometry-only ownership never mutates the input data.
 const given=members.map(m=>m.id).join('|'),before=JSON.stringify(edges);
 const positions=new Map(scene.people.map(x=>[x.id,{x:x.x,y:x.y,generation:x.generation}]));
 const run=reserveFamilyGraphWebSubtrees(members,edges,positions);
 assert.equal(run.positionedIds,scene.people.length);assert.equal(JSON.stringify(edges),before);assert.equal(members.map(m=>m.id).join('|'),given);
 assert.equal(WEB_PARITY_NATIVE_METRICS.coupleGap,72);
 // Real gesture coordinate convention includes native centered scale.
 const nativeBounds={left:0,top:0,right:1800,bottom:1010};
 const offRight=clampNativeFamilyGraphPan(9000,9000,1,390,700,2000,1200,nativeBounds);
 assert.equal(offRight.x,36-1000-1*(0-1000)); // when canvas center=1000, left screen=1000+pan-1000
 assert.equal(offRight.y,36-600-1*(0-600));
 const offLeft=clampNativeFamilyGraphPan(-9000,-9000,1,390,700,2000,1200,nativeBounds);
 assert.equal(offLeft.x,390-36-1000-(1800-1000));
 assert.equal(offLeft.y,700-36-600-(1010-600));
 const tiny=clampNativeFamilyGraphPan(9000,-9000,.08,390,700,2000,1200,nativeBounds);
 assert(Number.isFinite(tiny.x)&&Number.isFinite(tiny.y));
 const text=rel=>fs.readFileSync(path.join(root,rel),'utf8');
 const prototype=text('src/components/familyGraph/FamilyGraphPrototype.tsx');
 const hero=text('src/components/familyGraph/FamilyGraphWebHero.tsx');
 const route=text('src/app/(family)/(graph)/family-graph.tsx');
 assert(prototype.includes('reserve')||text('src/components/familyGraph/familyGraphLiveAdapter.ts').includes('reserveFamilyGraphWebSubtrees'));
 assert(prototype.includes('clampNativeFamilyGraphPan'),'camera worklet actually uses native bounds');
 assert(prototype.includes('fitWebParityTree')&&prototype.includes('zoomWebParity'),'Web toolbar connected');
 assert(hero.includes('if (compact) return')&&route.includes('          compact'),'native compact Web header mounted');
 const mutate=[text('src/components/familyGraph/familyGraphWebSubtreeLayout.ts'),text('src/components/familyGraph/familyGraphWebCameraBounds.ts')].join('\n');
 assert(!/\b(setDoc|updateDoc|deleteDoc|writeBatch|setItem|firebase\.firestore)\s*\(/.test(mutate));
 console.log('PASS R16R11R1 WEB->ANDROID: 4 generations, native spouse gap, descendant reservations, orphan exclusion, deterministic reversed input, separate families, camera edges, compact UI & non-mutating layout');
}finally{Module._extensions['.ts']=old;}
