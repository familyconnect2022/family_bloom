#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');const load=p=>fs.readFileSync(path.join(root,p),'utf8');
const rule=load('firestore.rules'),mirror=load('scripts/firestore.rules');
assert.equal(rule,mirror,'Both firestore rule copies must be identical');
for(const item of ['momentMediaUploads/$(assetId)','data.secureUrl','sameMediaIdentity()','request.resource.data.status == \'cleanup_pending\''])assert(rule.includes(item),item);
assert(!rule.includes("request.resource.data.status in ['cleanup_pending','deleted']"),'Device must not self-declare deleted');
const client=load('src/services/media/momentMediaApi.ts'),flow=load('src/context/MomentPublishContext.tsx');
assert(client.includes('/api/media/sign')&&client.includes('/api/media/confirm')&&client.includes('/api/media/cleanup'));
assert(client.includes('/^[a-f0-9]{40}$/i'),'Sign response must be validated');
assert(!flow.includes('mediaService.markDeleted('),'Android must not claim server deletion');
assert(flow.includes('mediaService.markCleanupPending('));
const packageName=JSON.parse(load('package.json')).name;
assert.equal(packageName,'family-bloom');
console.log('PASS A3R4M3R1 Android Media rules and API contract source checks');
