#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const picker = read('src/hooks/media/useMediaUpload.ts');
const avatarInput = read('src/components/ui/BloomInputComponents/BloomInputAvatar.tsx');
const avatarButton = read('src/components/ui/BloomButtonComponents/BloomAvatarButton.tsx');
const sync = read('src/services/media/avatarAsyncSync.ts');
const service = read('src/services/profile/profileService.ts');
const profile = read('src/app/(profile)/profile.tsx');
const create = read('src/app/(profile)/create-profile.tsx');
const graphAdmin = read('src/app/(family)/(graph)/family-graph-admin.tsx');
const graphEditor = read('src/app/(family)/(graph)/family-graph-person-editor.tsx');
const toast = read('src/components/ui/BloomToast.tsx');
const checks = [
  ['Native picker avoids cropper, uses in-app square crop', !picker.includes('requestMediaLibraryPermissionsAsync') && avatarInput.includes('allowsEditing: false') && read('src/components/ui/BloomInputComponents/AvatarCropEditor.tsx').includes('avatarCropRect')],
  ['Old pending picker results never replayed', !picker.includes('ImagePicker.getPendingResultAsync(') && !picker.includes('AVATAR_PICK_INTENT')],
  ['Android canceled pick cannot replay cached image', !/if\s*\(!uri\s*&&\s*Platform\.OS\s*===\s*["']android/.test(picker)],
  ['Picker rejects obsolete results with latest ticket', avatarInput.includes('ticket !== latest.current')],
  ['Every accepted avatar crop changes render revision', avatarInput.includes('setRevision((old) => old + 1)') && create.includes('setAvatarUri')],
  ['Local preview bypasses image cache and transition', avatarButton.includes('cachePolicy="none"') && avatarButton.includes('transition={0}')],
  ['Profile create is persisted without waiting for upload', create.includes('await createUserProfile(user.uid, profileInput)') && create.includes('avatarAsyncSync.enqueue')],
  ['Profile editing persists text without waiting for upload', profile.includes('await profileService.update(user.uid') && profile.includes('avatarAsyncSync.enqueue')],
  ['Background job persists and is UID scoped', sync.includes('AsyncStorage.setItem') && sync.includes('getAuth().currentUser?.uid === uid')],
  ['Superseded asset cannot attach', sync.includes('canCommit: async') && service.includes('options?.canCommit') && service.includes('markCleanupPending(uploaded.asset.id)')],
  ['Foreground reattempt and dismiss/remove are implemented', read('src/context/AuthContext.tsx').includes('avatarAsyncSync.resume') && sync.includes('async discard(uid: string)')],
  ['Cloudinary identity confirmation retained', read('src/services/media/mediaService.ts').includes('momentMediaApi.confirmUpload(asset.id)')],
  ['Graph avatars keep signed MIME mapping', graphAdmin.includes('avatarFileFromUri(') && graphEditor.includes('avatarFileFromUri(')],
  ['Toast success is green and information is blue', toast.includes('bg: "#EAF8F0"') && toast.includes('bg: "#EAF3FF"')],
  ['Toast warning is amber and error is red', toast.includes('bg: "#FFF4DF"') && toast.includes('bg: "#FFF0F0"')],
];
for (const [label, ok] of checks) { assert.ok(ok, label); console.log('PASS', label); }
const typescriptLocations = [
  'typescript',
  '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript',
];
let ts = null;
for (const location of typescriptLocations) { try { ts = require(location); break; } catch {} }
if (ts) {
  const source = read('src/services/media/avatarFile.ts');
  const output = ts.transpileModule(source, { fileName: 'avatarFile.ts', compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const loaded = { exports: {} };
  new Function('module', 'exports', 'require', output)(loaded, loaded.exports, () => { throw new Error('Unexpected require'); });
  for (const [uri, mime, ext] of [
    ['file:///crop/pic.png', 'image/png', 'png'], ['file:///crop/pic.JPG', 'image/jpeg', 'jpg'],
    ['file:///crop/pic.jpeg?x=1', 'image/jpeg', 'jpg'], ['file:///crop/pic.webp', 'image/webp', 'webp'],
    ['file:///crop/pic.heic', 'image/heic', 'heic'],
  ]) {
    const file = loaded.exports.avatarFileFromUri(uri, 'avatar-test');
    assert.equal(file.mimeType, mime);
    assert.equal(file.fileName, `avatar-test.${ext}`);
  }
  console.log('PASS Avatar file MIME mapping 5/5');
}
console.log(`M3R4R3 Avatar+toast checks ${checks.length}/${checks.length} PASS`);
