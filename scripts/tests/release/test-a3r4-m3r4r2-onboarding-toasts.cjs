#!/usr/bin/env node
'use strict';
/** Release contracts for Android profile -> family onboarding and global toast tone.
 * Static guards run without Firebase credentials; emulator/device e2e is separate.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../..');
const read = p => fs.readFileSync(path.join(root,p), 'utf8');
const avatar = read('src/components/ui/BloomButtonComponents/BloomAvatarButton.tsx');
const picker = read('src/hooks/media/useMediaUpload.ts');
const create = read('src/app/(profile)/create-profile.tsx');
const edit = read('src/components/ui/BloomInputComponents/BloomInputAvatar.tsx');
const family = read('src/app/(family)/(membership)/family-gateway.tsx');
const auth = read('src/context/AuthContext.tsx');
const profile = read('src/services/profile/profileService.ts');
const cloud = read('src/services/media/cloudinaryService.ts');
const media = read('src/services/media/mediaService.ts');
const api = read('src/services/media/momentMediaApi.ts');
const toast = read('src/components/ui/BloomToast.tsx');
const rules = read('firestore.rules');
const tests = [
 ['Avatar preview uses Expo image for native crop output', avatar.includes('from "expo-image"') && avatar.includes('contentFit="cover"')],
 ['Selected first-profile image survives Android route recreation per Firebase UID', create.includes('pending-profile-avatar:${user.uid}') && create.includes('AsyncStorage.setItem(avatarDraftKey, uri)') && create.includes('AsyncStorage.getItem(avatarDraftKey)')],
 ['No stale avatar draft after profile save', create.includes('AsyncStorage.removeItem(avatarDraftKey)')],
 ['Android crop result is recovered without overwriting newer choice', picker.includes('getPendingResultAsync()') && create.includes('!avatarSelectedByPickerRef.current')],
 ['Both create and edit use same avatar control', create.includes('<BloomAvatarButton') && edit.includes('<BloomAvatarButton')],
 ['First profile still uses verified managed upload + atomic asset attach', profile.includes('async createWithAvatar(') && profile.includes('await mediaService.attachToDocument(')],
 ['Avatar upload forbids unsigned Cloudinary fallback', cloud.includes('const signedManaged = isMoment || isUserAvatar || isPersonAvatar') && cloud.includes('!momentMediaApi.configured')],
 ['Avatar confirmation verifies Cloudinary identity against Vercel', media.includes('await momentMediaApi.confirmUpload(asset.id)') && api.includes('/api/media/confirm')],
 ['Avatar asset status is attached atomically to user document', media.includes('batch.set(doc(db, documentPath)') && media.includes('batch.update(doc(db, FIRESTORE_PATHS.mediaAsset(assetId))')],
 ['Rules enforce signed user avatar and immutable media identity', rules.includes('function validUserAvatarProfile(') && rules.includes('function allowedUserAvatarTransition(')],
 ['New family creation defers activation until explicit owner action', family.includes('{ activateAfterCreate: false }') && family.includes('await switchFamily(createdFamily.familyId)')],
 ['Family hold suppresses automatic single-home activation', auth.includes('memberships.length !== 1 || familyCreationHoldRef.current') && auth.includes('beginFamilyCreation') && auth.includes('endFamilyCreation')],
 ['Welcome only appears after successful member switch', family.indexOf('if (!entered) return;') < family.indexOf('welcomeAfterFamilyCreation();') && family.includes('welcomeAfterFamilyCreation();')],
 ['Pending welcome is restored if Android restarts before entering', auth.includes('pending-created-family-welcome:${uid}') && auth.includes('AsyncStorage.getItem(newFamilyWelcomeKey(user.uid))') && auth.includes('AsyncStorage.removeItem(newFamilyWelcomeKey(user.uid))')],
 ['Join and create actions use vertically spaced buttons', family.includes('formActions: { width: "100%", marginTop: 18, gap: 14 }') && family.includes('formActionButton')],
 ['Join and create handlers reject duplicate loading submits', (family.match(/if \(!user \|\| !userProfile \|\| loading\) return;/g) || []).length >= 2],
 ['Global toast defaults to explicit info tone', toast.includes('type: "info", ...config')],
 ['Join approved/rejected semantics use success and warning', family.includes('type: "success"') && family.includes('type: "warning"')],
];
let count=0;
for (const [name, ok] of tests) { assert.ok(ok, name); console.log('PASS', ++count, name); }
// Execute the exact palette literal, not a copied test fixture, in a restricted VM.
const match = toast.match(/const TOAST_STYLES = (\{[\s\S]*?\n\});/);
assert.ok(match,'Toast palette literal exists');
const literal = match[1].replace(/ as const/g,'');
const palettes = vm.runInNewContext('('+literal+')',Object.create(null));
const tones = Object.entries(palettes);
assert.deepEqual(tones.map(([n])=>n),['success','warning','error','info','notification']);
const backgrounds = new Set(tones.map(([,p])=>p.bg.toUpperCase()));
assert.equal(backgrounds.size,tones.length,'All semantic statuses have unique backgrounds');
for(const [name,p] of tones){
 assert.match(p.bg,/^#[0-9A-F]{6}$/i,name+' bg');
 assert.match(p.border,/^#[0-9A-F]{6}$/i,name+' border');
 assert.match(p.text,/^#[0-9A-F]{6}$/i,name+' text');
 assert.match(p.bar,/^#[0-9A-F]{6}$/i,name+' progress');
}
// Make sure Info is NOT pink/red: its blue component must dominate its red.
const info = palettes.info; assert.ok(parseInt(info.bar.slice(5,7),16)>parseInt(info.bar.slice(1,3),16),'Info bar must be blue');
assert.ok(parseInt(palettes.error.bar.slice(1,3),16)>parseInt(palettes.error.bar.slice(5,7),16),'Error bar must be red');
console.log('PASS palette five distinct semantic tones and color contracts');
const changedTypescriptFiles = ['src/context/AuthContext.tsx','src/app/(family)/(membership)/family-gateway.tsx','src/app/(profile)/create-profile.tsx','src/components/ui/BloomButtonComponents/BloomAvatarButton.tsx','src/components/ui/BloomToast.tsx'];
for (const file of changedTypescriptFiles) {
 const parsed=ts.transpileModule(read(file),{fileName:file,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
 assert.equal(parsed.diagnostics.filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,file+' parses');
}
console.log('PASS changed TypeScript/TSX files parse');
console.log(`A3R4-M3R4R2 Android onboarding + toast ${count+2}/${count+2} PASS`);
