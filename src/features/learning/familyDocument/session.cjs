/* Pure lease/publish transition rules. Apply inside a trusted server transaction, never trust client timestamps. */
'use strict';
const LEASE_MS=90000;
const fail=code=>{throw Object.assign(new Error(code),{code});};
const key=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(v);
function actor(d,uid){if(!d||!key(uid)||d.ownerUid!==uid||!Number.isSafeInteger(d.revision)||d.revision<0||!Number.isSafeInteger(d.fence)||d.fence<0)fail('DRAFT_FORBIDDEN');}
function clock(now){if(!Number.isSafeInteger(now)||now<0||now>Number.MAX_SAFE_INTEGER-LEASE_MS)fail('INVALID_CLOCK');}
function acquire(d,{uid,sessionId,now,takeover=false}){actor(d,uid);clock(now);if(!key(sessionId))fail('INVALID_SESSION');const l=d.lease;if(l&&l.expiresAt>now&&l.sessionId!==sessionId&&!takeover)fail('SESSION_BUSY');if(l&&l.expiresAt>now&&l.sessionId===sessionId)return {...d,lease:{...l,expiresAt:now+LEASE_MS}};if(d.fence===Number.MAX_SAFE_INTEGER)fail('FENCE_EXHAUSTED');return {...d,fence:d.fence+1,lease:{sessionId,fence:d.fence+1,expiresAt:now+LEASE_MS}};}
function assertLease(d,{uid,sessionId,fence,now,expectedRevision}){actor(d,uid);clock(now);if(!key(sessionId)||!d.lease||d.lease.expiresAt<=now||d.lease.sessionId!==sessionId||d.lease.fence!==fence||d.fence!==fence)fail('LEASE_LOST');if(d.revision!==expectedRevision)fail('REVISION_CONFLICT');}
function commitRevision(d,request,revisionPointer){assertLease(d,request);if(!key(revisionPointer)||d.revision===Number.MAX_SAFE_INTEGER)fail('INVALID_REVISION');return {...d,revision:d.revision+1,revisionPointer,lease:{...d.lease,expiresAt:request.now+LEASE_MS}};}
function release(d,request){assertLease(d,request);return {...d,lease:null};}
// An immutable operation ID must be reserved by the trusted repository; only legal forward transitions.
const next={RESERVED:'MEDIA_READY',MEDIA_READY:'CONTENT_COMMITTED',CONTENT_COMMITTED:'COMPLETE'};
function advancePublish(op,{uid,operationId,from,to,contentId}){if(!op||op.ownerUid!==uid||op.operationId!==operationId||!key(uid)||!key(operationId)||!key(contentId)||op.contentId!==contentId)fail('PUBLISH_FORBIDDEN');if(next[from]!==to)fail('INVALID_PUBLISH_TRANSITION');if(op.state===to)return op;if(op.state!==from)fail('PUBLISH_STATE_CONFLICT');return {...op,state:to};}
module.exports={LEASE_MS,acquire,assertLease,commitRevision,release,advancePublish};
