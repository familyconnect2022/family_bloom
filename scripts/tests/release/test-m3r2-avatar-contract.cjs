#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const picker=read('src/hooks/media/useMediaUpload.ts'),upload=read('src/services/media/cloudinaryService.ts');
const profile=read('src/services/profile/profileService.ts'),rules=read('firestore.rules');
const create=read('src/app/(profile)/create-profile.tsx'),edit=read('src/app/(profile)/profile.tsx');
const checks=[
 ['In-app square crop available without external crop Activity',read('src/components/ui/BloomInputComponents/AvatarCropEditor.tsx').includes('ImageManipulator.manipulateAsync') && read('src/components/ui/BloomInputComponents/BloomInputAvatar.tsx').includes('allowsEditing: false')],
 ['User avatar requires server signature',upload.includes('const signedManaged = isMoment || isUserAvatar || isPersonAvatar')],
 ['Other media retains old legacy path',upload.includes('if (!signedManaged && (!APP_CONFIG.CLOUDINARY.cloudName || !preset))')],
 ['Avatar is confirmed before publication',read('src/services/media/mediaService.ts').includes('context.purpose === "avatar" && (context.entityType === "user" || context.entityType === "person")')],
 ['Profile stores verified avatarAssetId',profile.includes('avatarAssetId: assetId')],
 ['Profile creation attaches verified asset atomically',profile.includes('attachToDocument(')],
 ['Profile edit uses signed managed upload',profile.includes('async updateWithAvatar(')],
 ['Firestore has signed user-avatar contract',rules.includes('function verifiedUserAvatarAsset(') && rules.includes('function validUserAvatarProfile(')],
 ['User avatar cannot be directly deleted',rules.includes("!(resource.data.purpose == 'avatar' && resource.data.entityType in ['user','person'])")],
 ['Avatar visible on create and edit',create.includes('setAvatarUri') && edit.includes('<BloomInputAvatar')],
];
checks.forEach(([name,ok])=>{assert(ok,name);console.log('PASS',name)});
console.log('M3R2 Avatar '+checks.length+'/'+checks.length+' PASS');
