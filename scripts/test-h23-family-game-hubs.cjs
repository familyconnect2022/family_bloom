#!/usr/bin/env node
'use strict';
const fs=require('node:fs'), path=require('node:path'), assert=require('node:assert/strict'), crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'), read=s=>fs.readFileSync(path.join(root,s),'utf8');
const ok=(description,passed)=>{assert(passed,description);console.log('PASS H23: '+description);};
const home=read('src/app/(home)/(games)/home-games.tsx'), stack=read('src/app/_layout.tsx');
// H23R1: H23 previously declared both new arenas twice and crashed Expo Router at startup.
require('./setup/check-expo-route-uniqueness.cjs').assertUniqueRoutes(root);
for(const [kind,signature,socket,events] of [
 ['chess','ChessFamilyLobby','chessSocketService','CHESS_EVENTS'],
 ['xiangqi','XiangqiFamilyLobby','xiangqiSocketService','XIANGQI_EVENTS']]){
 const src=read(`src/app/(home)/(games)/home-${kind}.tsx`);
 ok(`${kind}: separate route and root Stack`,stack.includes(`(home)/(games)/home-${kind}`)&&home.includes(`/home-${kind}`)&&src.includes(`function ${signature}`));
 ok(`${kind}: account membership from auth UID, never graph person`,src.includes('useFamilyMembers(activeFamilyId)')&&src.includes('m.uid!==user?.uid')&&!src.includes('familyGraph')&&!src.includes('personService'));
 ok(`${kind}: Firestore invitation availability without socket presence`,src.includes("watchInvitationSlots(") && !src.includes(`${socket}.onPresence(`) && !src.includes(`${socket}.on("presence",`));
 ok(`${kind}: Firebase invitation without opening game Socket`,src.includes("createFirebaseInvitation({") && src.includes("toUid,") && !src.includes(`${events}.inviteCreate`));
 ok(`${kind}: own game recovery but no Socket.IO lobby`,!src.includes(`${events}.lobbyJoin`) && src.includes(`${events}.sessionRecover`) && src.includes(`${events}.gameJoin`));
}
const names=['wk','wq','wr','wb','wn','wp','bk','bq','br','bb','bn','bp'];
const manifest=JSON.parse(read('document/releases/H23_RESTORED_CHESS_PIECES_MANIFEST.json'));
for(const name of names){
 const p=`assets/images/chess/pieces-png-default/${name}.png`,q=`modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/${name}.png`;
 const a=fs.readFileSync(path.join(root,p)),b=fs.readFileSync(path.join(root,q));
 ok(`original ${name}.png 192x192 RGBA identity on both platforms`,a.equals(b)&&a.readUInt32BE(16)===192&&a.readUInt32BE(20)===192&&a[25]===6&&crypto.createHash('sha256').update(a).digest('hex')===manifest.pieces[name].sha256);
}
const app=JSON.parse(read('app.json')).expo, nativeModule=read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt');
ok('APK native identity updated for asset replacement',app.version==='1.3.30'&&app.android.versionCode===143040&&nativeModule.includes('P2.37R2C-H25-native-1'));
ok('production home game entrypoints no longer activate prototype board',!home.includes('activateBoardGamePresentation('));
console.log('PASS H23 family arena routes/auth presence/restored chess sprites');
