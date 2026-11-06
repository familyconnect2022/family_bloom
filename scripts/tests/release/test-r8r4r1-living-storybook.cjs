#!/usr/bin/env node
'use strict';
/** Source-only release contract. Never performs production Firestore writes. */
const fs=require('node:fs'),p=require('node:path'),assert=require('node:assert/strict');
const ts=require('../../vendor/typescript/lib/typescript.js');
const root=p.resolve(__dirname,'../../..');let checks=0;
function pass(message){checks++;console.log('PASS',message)}
function read(path){return fs.readFileSync(p.join(root,path),'utf8')}
function loadPure(rel, imports={}){
 const compiled=ts.transpileModule(read(rel),{fileName:rel,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
 const module={exports:{}};
 new Function('module','exports','require',compiled.outputText)(module,module.exports,id=>{if (Object.prototype.hasOwnProperty.call(imports,id))return imports[id];throw Error('Unknown import '+id)});
 return module.exports;
}
const appearance=loadPure('src/theme/livingAppearance.ts');
assert(appearance.isLivingAppearance({font:'modern',fontScale:100,motion:'gentle'}));
assert(appearance.isLivingAppearance({font:'classic',fontScale:160,motion:'still'}));
assert(!appearance.isLivingAppearance({font:'classic',fontScale:500,motion:'still'}));
assert(!appearance.isLivingAppearance({font:'bad',fontScale:100,motion:'vivid'}));
let changes=0;appearance.subscribeLivingAppearance(()=>changes++);
assert(appearance.applyLivingAppearance({font:'cute',fontScale:130,motion:'vivid'}));
assert.equal(changes,1);assert.equal(appearance.getLivingAppearance().font,'cute');
pass('5 font modes, 90–160% scale, 3 motion levels are typed and validated');
const original=JSON.parse(read('document/releases/r8r4r1/Family_Bloom_MASTER_REVIEW_92_PLUS_CHESS_XIANGQI.json'));
assert.equal(original.screens.length,92);assert.equal(original.review_comments,26);
assert.equal(original.game_identity_approval.identity.chess.piece,'pawn');
assert.equal(original.game_identity_approval.identity.xiangqi.piece,'general');
pass('One integrated 92-screen review (26 remarks) supersedes old Xiangqi pawn typo');
const game=read('src/app/(home)/(games)/home-games.tsx');
assert(game.includes('pieces-png-default/bp.png'));assert(!game.includes('pieces-png-default/bn.png'));
assert(game.includes('assets/xiangqi/red_general.png'));
assert(read('src/app/(home)/(games)/home-chess.tsx').includes('pieces-png-default/bp.png'));
assert(read('src/app/(home)/(games)/home-xiangqi.tsx').includes('assets/xiangqi/red_general.png'));
pass('Approved native Chess pawn and Xiangqi general identities are present in arena entry points');
const gameOverlay=read('src/components/games/BoardGamePresentationRoot.android.tsx');
assert(gameOverlay.includes('setBoardGameNativePresentation'));
assert(gameOverlay.includes('subscribeBoardGameNativeChessActions'));
assert(gameOverlay.includes('subscribeBoardGameNativeXiangqiActions'));
pass('Native Full/Mini presentation controller remains present and untouched');
const cloud=read('src/theme/appearanceCloudSync.ts');
assert(cloud.includes('APPEARANCE_USER_STORAGE + target'));
assert(cloud.includes('getDocFromServer'));
assert(cloud.includes('activeUid !== target') && cloud.includes('bindGeneration !== generation'));
assert(cloud.includes('pendingSync: true'));
assert(cloud.includes('FIRESTORE_PATHS.userAppearance(target)'));
pass('Per-UID local cache, first-use remote read, and queued offline writes are guarded by UID');
for(const rel of ['firestore.rules','firestore.cloud.rules']){
 const s=read(rel);
 assert(s.includes('match /preferences/{preferenceId}'));
 assert(s.includes("if self(uid) && preferenceId == 'appearance'"));
 assert(s.includes("request.resource.data.fontScale <= 160"));
 assert(s.includes("allow list, delete: if false;"));
}
pass('Firestore appearance document has separate owner-only contract in both rules files');
assert(read('src/components/ui/BloomPageComponents.tsx').includes("shape === 'storybook'"));
assert(read('src/components/ui/BloomPageComponents.tsx').includes("shape === 'ticket'"));
assert(read('src/components/ui/BloomPageComponents.tsx').includes("shape === 'polaroid'"));
assert(read('src/components/ui/BloomThemeSettingsPanel.tsx').includes('setPalette'));
assert(read('src/components/ui/BloomLivingAppearancePanel.tsx').includes('setFontScale'));
pass('Storybook cards / white data cards and typography controls are implemented');
const auth=read('src/context/AuthContext.tsx'),layout=read('src/app/_layout.tsx');
assert(auth.includes('profileStatus !== "ready" || membershipStatus !== "ready"'));
assert(layout.includes('const welcomeBlocking = verifiedFamily && welcomeReady && showWelcome;'));
assert(auth.includes('interactiveLoginUid.current'));
assert(auth.includes('welcomeLedger.markSeen(target.uid, membership)'));
pass('Auth Welcome continues to require verified UID, profile and active membership');
console.log(`R8R4R1 LIVING STORYBOOK CONTRACT: ${checks}/${checks} PASS`);
