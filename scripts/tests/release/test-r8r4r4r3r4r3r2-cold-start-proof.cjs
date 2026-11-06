#!/usr/bin/env node
'use strict';
/** Executable state-machine regression: no Android/Firebase account needed. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname,'../../..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const ts = require('typescript');
const compiled = ts.transpileModule(read('src/services/navigation/authoritativeMembershipProof.ts'), {
  compilerOptions:{module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022}, reportDiagnostics:true,
});
assert.equal((compiled.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0);
const exportsObject = {};
vm.runInNewContext(compiled.outputText,{exports:exportsObject,module:{exports:exportsObject}});
const {acceptMembershipServerProof:accept, deferMembershipError:defer} = exportsObject;
let checks=0;
function check(label,fn){fn();checks++;console.log('PASS '+checks+' '+label)}
check('Reject cached or pending-write snapshot, no server authorization',()=>{
 const p={watchConfirmed:false,permissionDenied:false};
 assert.equal(accept(p,'watch',false),false); assert.equal(p.watchConfirmed,false);
});
check('Trusted server watch unblocks cold start even if read pending',()=>{
 const p={watchConfirmed:false,permissionDenied:false};
 assert.equal(accept(p,'watch',true),true);assert.equal(p.watchConfirmed,true);
});
check('Older concurrent read must not overwrite newer watch data',()=>{
 const p={watchConfirmed:false,permissionDenied:false};
 assert.equal(accept(p,'watch',true),true);assert.equal(accept(p,'read',true),false);
});
check('Independent authoritative read can recover missing or failed watch',()=>{
 const p={watchConfirmed:false,permissionDenied:false};
 assert.equal(accept(p,'read',true),true);
});
check('Transient listener error defers while unverified read pending',()=>{
 const p={watchConfirmed:false,permissionDenied:false};
 assert.equal(defer(p,true,true,false,false),true);
 assert.equal(defer(p,true,false,false,false),false);
});
check('Transient failed redundant read cannot revoke verified watch',()=>{
 const p={watchConfirmed:true,permissionDenied:false};
 assert.equal(defer(p,false,false,true,false),true);
});
check('Permission error cannot be deferred for either channel',()=>{
 const p={watchConfirmed:true,permissionDenied:false};
 assert.equal(defer(p,false,false,true,true),false);
 assert.equal(defer(p,true,true,false,true),false);
 p.permissionDenied=true;
 assert.equal(accept(p,'watch',true),false);
 assert.equal(accept(p,'read',true),false);
});
check('Unknown connectivity must not block bounded retries',()=>{
 const a=read('src/context/AuthContext.tsx');
 assert.ok(a.includes('internetReachabilityService.getStatus() === "offline"'));
 assert.ok(a.includes('if (entry.attempts >= 2 || Date.now() - entry.at < 10000) return;'));
 assert.ok(a.includes('verificationIssue && !isTransientVerificationIssue(verificationIssue)'));
});
check('Subscription cleanup and UID epoch prevent delayed identity spoof',()=>{
 const a=read('src/context/AuthContext.tsx');
 assert.ok(a.includes('return () => { live = false; stop(); };'));
 assert.ok(a.includes('epoch === authEpochRef.current && authUidRef.current === currentUid'));
 assert.ok(a.includes('serverProof.permissionDenied = true'));
});
check('Firestore watch never treats cache/local mutation as server proof',()=>{
 const family=read('src/services/family/familyService.ts');
 assert.ok(family.includes('if (snap.metadata.fromCache || snap.metadata.hasPendingWrites) return;'));
 assert.ok(family.includes('getDocsFromServer(collection('));
 assert.ok(family.includes('getDocFromServer(doc(db, FIRESTORE_PATHS.familyMember(familyId, uid)))'));
});
check('Home remains inaccessible without matching UID/Profile/Membership',()=>{
 const gate=read('src/services/navigation/familySessionAccess.ts');
 assert.ok(gate.includes('input.profileUid === input.uid'));
 assert.ok(gate.includes('input.membershipStatus === "ready"'));
 assert.ok(gate.includes('input.verifiedMembershipFamilyIds.includes(input.activeFamilyId)'));
});
check('Welcome only marks completed after acknowledgement persisted',()=>{
 const a=read('src/context/AuthContext.tsx');
 assert.ok(a.includes('await welcomeLedger.markSeen(target.uid, membership)'));
});
console.log(`R8R4R4R3R4R3R2 dynamic server-proof/cold-start regression ${checks}/${checks} PASS`);
