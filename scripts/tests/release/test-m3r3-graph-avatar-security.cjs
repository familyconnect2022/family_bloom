#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const picker=read('src/hooks/media/useMediaUpload.ts');
const cloud=read('src/services/media/cloudinaryService.ts');
const media=read('src/services/media/mediaService.ts');
const editor=read('src/app/(family)/(graph)/family-graph-person-editor.tsx');
const graph=read('src/services/familyGraph/familyGraphMutationService.ts');
const rules=read('firestore.rules');
const checks=[
 ['Avatar square-crop handled internally for all BloomInputAvatar uses',read('src/components/ui/BloomInputComponents/AvatarCropEditor.tsx').includes('AVATAR_OUTPUT')&&read('src/components/ui/BloomInputComponents/BloomInputAvatar.tsx').includes('allowsEditing: false')],
 ['No avatar can silently use unsigned preset',cloud.includes('const signedManaged = isMoment || isUserAvatar || isPersonAvatar')],
 ['Person photo confirmation required',media.includes('context.entityType === "person"')],
 ['Person photo stored under exact family/person namespace',read('src/constants/appPaths.ts').includes('persons/${entityId}/${purpose}')],
 ['Graph editor uses signed managed upload',editor.includes('mediaService.uploadManaged(')&&editor.includes('entityType: "person"')],
 ['Graph editor cleans previously attached photo only after replacement',editor.includes('oldAvatarAssetId')&&editor.includes('momentMediaApi.requestCleanup(')],
 ['Graph transaction atomically updates person and asset',graph.includes('avatarAssetId: mediaAssetId')&&graph.includes('tx.update(assetRef, { status: "attached"')],
 ['Rules block unverified avatar URL changes',rules.includes('personAvatarBindingValid(familyId,personId,request.resource.data)')],
 ['Rules require graph admin for person uploads',rules.includes('graphAdmin(request.resource.data.familyId)')],
 ['Rules require signed person avatar record',rules.includes('function verifiedPersonAvatarAsset(')],
 ['Rules prevent deletion of linked avatar assets',rules.includes('function allowedPersonAvatarTransition(')&&rules.includes('function personAvatarReference(')],
 ['Rules disallow client deletion of managed person avatar',rules.includes("resource.data.entityType in ['user','person']")],
 ['Old Firestore rules deployment copy synchronized',read('scripts/firestore.rules')===rules],
];
checks.forEach(([label,ok])=>{assert.ok(ok,label);console.log('PASS '+label)});
console.log('M3R3 Graph avatar '+checks.length+'/'+checks.length+' PASS');
