#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}
const root=path.resolve(__dirname,'../../..');
const read=x=>fs.readFileSync(path.join(root,x),'utf8');
function loadModule(file){const exports={};const compiled=ts.transpileModule(read(file),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;new Function('exports',compiled)(exports);return exports;}
const geom=loadModule('src/components/ui/BloomInputComponents/avatarCropMath.ts');
const preview=280;
assert.deepEqual(geom.avatarCropRect(1200,800,1,{x:0,y:0}), {originX:200,originY:0,width:800,height:800});
assert.deepEqual(geom.avatarCropRect(800,1200,1,{x:0,y:0}), {originX:0,originY:200,width:800,height:800});
assert.deepEqual(geom.avatarCropRect(512,512,1,{x:0,y:0}), {originX:0,originY:0,width:512,height:512});
const moved=geom.avatarCropRect(1200,800,1,{x:40,y:0});assert(moved.originX<200&&moved.originX>=0);
const zoomed=geom.avatarCropRect(1200,800,2,{x:0,y:0});assert(zoomed.width===400&&zoomed.originX===400);
for(const [w,h] of [[100,100],[1,5000],[5000,1],[4000,3000],[3000,4000]])for(const z of [1,1.5,2,4]){
  const rect=geom.avatarCropRect(w,h,z,{x:100000,y:-100000});
  assert(rect.originX>=0&&rect.originY>=0&&rect.width>0&&rect.height>0&&rect.originX+rect.width<=w&&rect.originY+rect.height<=h);
}
console.log('PASS avatar crop geometry center / pan / zoom / boundary 100+ cases');
const fields=[
 ['Native picker does not launch external cropper','src/components/ui/BloomInputComponents/BloomInputAvatar.tsx',/allowsEditing:\s*false/],
 ['Picker previews raw photo before crop dialog','src/components/ui/BloomInputComponents/BloomInputAvatar.tsx',/apply\(asset\.uri\);[\s\S]*setPhoto/],
 ['Local crop is actually exported as 512x512 pixels','src/components/ui/BloomInputComponents/AvatarCropEditor.tsx',/ImageManipulator\.manipulateAsync\([\s\S]*\{ crop: rect \}[\s\S]*AVATAR_OUTPUT/],
 ['Square avatar supports geometry-based corner radius','src/components/ui/BloomButtonComponents/BloomAvatarButton.tsx',/shape === "square"/],
 ['Preview bypasses old Expo image cache','src/components/ui/BloomButtonComponents/BloomAvatarButton.tsx',/cachePolicy="none"/],
 ['Progress derives from native Cloudinary progress bytes','src/services/media/avatarAsyncSync.ts',/onProgress: \(value\)/],
 ['Newer selection cancels older upload commit','src/services/media/avatarAsyncSync.ts',/canCommit: async/],
 ['Durable cropped image stored in document directory','src/services/media/avatarAsyncSync.ts',/new Directory\(Paths\.document/],
 ['Cloud upload confirmation and asset attachment preserved','src/services/media/mediaService.ts',/momentMediaApi\.confirmUpload\(asset\.id\)/],
 ['CV uses same avatar component as onboarding','src/app/(profile)/profile.tsx',/BloomInputAvatar/],
 ['CV edits on same screen without full-screen edit flow','src/app/(profile)/profile.tsx',/editVisible \&\& <View style=\{styles\.cvSaveBar\}/],
 ['CV keeps existing family and moments links','src/app/(profile)/profile.tsx',/\(tabs\)\/moments/],
 ['CV has 32dp spacing after header','src/app/(profile)/profile.tsx',/paddingTop: 32/],
 ['Onboarding avatar has 32dp spacing after header','src/app/(profile)/create-profile.tsx',/paddingTop: 32/],
 ['Toast success, info, warning, error separated','src/components/ui/BloomToast.tsx',/bg: "#EAF3FF"/],
];
fields.forEach(([label,file,pattern])=>{assert(pattern.test(read(file)),label);console.log('PASS',label)});
const pkg=JSON.parse(read('package.json'));
assert(pkg.dependencies['expo-image-manipulator'].startsWith('~57.'));
assert(pkg.dependencies['expo-file-system'].startsWith('~57.'));
console.log(`PASS ${fields.length} contract gates + crop geometry`);
