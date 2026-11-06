#!/usr/bin/env node
'use strict';
/** Cold-start native Firestore listener regression. No live account required. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const family=read('src/services/family/familyService.ts');
const auth=read('src/context/AuthContext.tsx');
let checks=0;
const check=(label,fn)=>{fn();console.log('PASS '+(++checks)+' '+label)};
let listener;
const exportsObject={};
const firestoreMock={
  getFirestore:()=>({db:true}),
  collection:(_db,p)=>({path:p}),
  onSnapshot:(q,options,next,error)=>{
    listener={q,options,next,error,stopped:false};
    return ()=>{listener.stopped=true;};
  },
};
const mockRequire=id=>{
  if(id==='@react-native-firebase/firestore')return firestoreMock;
  if(id==='../firebase/firestorePaths')return {FIRESTORE_PATHS:{userMemberships:uid=>`users/${uid}/memberships`}};
  if(id==='../../utils/dataBoundary')return {readMembership:(raw,id)=>raw && raw.familyId===id ? raw : null};
  return {};
};
const out=ts.transpileModule(family,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
check('Family service TS transpilation',()=>assert.equal(out.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0));
vm.runInNewContext(out.outputText,{exports:exportsObject,require:mockRequire,console});
const service=exportsObject.familyService;
let received=[],errors=[];
const unsubscribe=service.watchForUser('SAFE_TEST_UID',list=>received.push(list),error=>errors.push(error));
check('Listener targets only this UID membership index',()=>assert.equal(listener.q.path,'users/SAFE_TEST_UID/memberships'));
check('Metadata-only server transition is delivered',()=>assert.equal(listener.options.includeMetadataChanges,true));
const membership={familyId:'family-1',familyName:'demo',role:'admin',joinedAt:'2026-01-01T00:00:00Z'};
const make=(fromCache,hasPendingWrites,docs=[{id:'family-1',data:()=>membership}])=>({metadata:{fromCache,hasPendingWrites},docs});
listener.next(make(true,false));
check('Cached initial event does not authorize membership',()=>assert.equal(received.length,0));
listener.next(make(false,true));
check('Uncommitted write cannot authorize membership',()=>assert.equal(received.length,0));
listener.next(make(false,false));
check('Server-confirmed unchanged data reaches AuthContext',()=>{assert.equal(received.length,1);assert.equal(received[0][0].familyId,'family-1')});
listener.next(make(false,false,[]));
check('Server-confirmed empty membership is delivered (not a stale cache)',()=>assert.equal(received[1].length,0));
const failure={code:'firestore/permission-denied'};listener.error(failure);
check('Permission error propagates to fail-closed session gate',()=>assert.equal(errors[0],failure));
unsubscribe();
check('Unsubscribe detaches the native listener',()=>assert.equal(listener.stopped,true));
check('Independent membership verification watchdog exists',()=>{assert.ok(auth.includes('const membershipDeadline = setTimeout(() => {'));assert.ok(auth.includes('new SessionVerificationTimeoutError("membership")'));assert.ok(auth.includes('clearTimeout(membershipDeadline)'));});
check('Watchdog and server callback are UID + attempt guarded',()=>{assert.ok(auth.includes('const isCurrent = () => live && epoch === authEpochRef.current && authUidRef.current === currentUid'));assert.ok(auth.includes('if (!isCurrent() || serverProof.watchConfirmed || verifiedMembershipUidRef.current === currentUid) return;'));});
check('Server proof still cannot originate from cache',()=>assert.ok(family.includes('if (snap.metadata.fromCache || snap.metadata.hasPendingWrites) return;')));
check('Source timeout still guards parallel getDocsFromServer',()=>assert.ok(auth.includes('Promise.resolve().then(() => familyService.listForUserAuthoritative(currentUid))')));
check('No non-server fallback to unlock Home',()=>{const gate=read('src/services/navigation/familySessionAccess.ts');assert.ok(gate.includes('input.membershipStatus === "ready"'));assert.ok(gate.includes('input.profileUid === input.uid'));});
console.log(`R3R3 membership metadata/watchdog ${checks}/${checks} PASS; Android Release remains untested`);
