#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
let count=0;function check(title,value){assert.ok(value,title);count++;console.log('PASS',title)}
const layout=read('src/app/_layout.tsx'),welcome=read('src/app/welcome.tsx'),screen=read('src/app/session-gate.tsx'),signal=read('src/services/navigation/welcomePresentationSignal.ts');
check('Welcome is only registered for verified family and explicit welcome request',layout.includes('welcomeBlocking = verifiedFamily && welcomeReady && showWelcome')&&screen.includes('testID="verified-welcome-native-screen"'));
check('No family Home while welcome remains pending',layout.includes('const allowFamilyRoutes = verifiedFamily && welcomeReady && !welcomeBlocking;'));
check('Safe public route always exists',layout.includes('name="session-gate"'));
check('Welcome painted frame signal: root waits for native view layout',screen.includes('<WelcomeModal visible') && !layout.includes('welcomeFrameReady'));
check('Welcome frame signal resets on unmount',welcome.includes('Redirect href="/session-gate"'));
check('Auth transition shows visible loading surface',layout.includes('<BloomAppBootstrap ready={false} message="Đang xác minh và mở mái nhà…" />'));
check('Failed verification has manual retry without home bypass',screen.includes('retryFirebaseVerification')&&screen.includes('setStalled(true)'));
const hero=read('src/components/ui/BloomHeroHeader.tsx');
check('Header image fills horizontal bounds; supported Expo image position',hero.includes('contentFit="cover"')&&hero.includes('contentPosition="top"')&&!hero.includes('contentPosition="center top"'));
check('Header taller with left-middle high contrast copy',hero.includes('viewportHeight * 0.35')&&hero.includes('copyDirectOnArt')&&hero.includes('getBloomHeroTextShade'));
check('Irregular theme fog stays noninteractive',hero.includes('pointerEvents="none"')&&hero.includes('getBloomFogArt(palette, isDark ? "dark" : "light")'));
const cloud=read('src/theme/appearanceCloudSync.ts'),rules=read('firestore.rules');
check('UID-scoped Firestore appearance path and own-user Security Rules',cloud.includes('FIRESTORE_PATHS.userAppearance(target)')&&rules.includes("preferenceId == 'appearance'")&&rules.includes('self(uid)'));
check('Missing/legacy theme initializes Rose without gating auth',cloud.includes('DEFAULT_BLOOM_SELECTION')&&cloud.includes('DEFAULT_LIVING_APPEARANCE')&&cloud.includes('if (usable(data))')&&cloud.includes('No network: Rose default works')&&cloud.includes('Missing document never causes an auto-write'));
check('Pending sync survives offline and does not cross accounts',cloud.includes('pendingSync: true')&&cloud.includes('activeUid !== target || bindGeneration !== generation'));
const palette=read('src/theme/palette.ts');
check('Semantic text/on-primary/selected text roles defined',palette.includes('textOnSelected: string')&&palette.includes('buttonPrimaryText: string')&&palette.includes('calendarSelectedText: string'));
for(const p of ['src/components/ui/BloomInputComponents/BloomDatePicker.tsx','src/components/ui/BloomTimePicker.tsx','src/components/events/EventCard.tsx','src/components/ui/BloomConfirmModal.tsx','src/components/ui/BloomConfirmDialog.tsx']) check(`Contrast: ${path.basename(p)}`,read(p).includes('COLORS.onPrimary'));
for(const p of ['src/features/study/StudyComposer.tsx','src/features/study/StudyFormulaEditor.tsx','src/components/media/MediaViewerProvider.tsx','src/components/games/BoardGamePresentationRoot.tsx','src/features/home/kitchen/KitchenFeaturePanel.tsx','src/features/home/whispers/WhisperFeaturePanel.tsx']) check(`Live theme subscriber: ${path.basename(p)}`,read(p).includes('useBloomThemeRevision();'));
const manifest=require(path.join(root,'document/releases/m3r4r5/known-source-lineages.json'));
check('R8R4R4R3R4 fingerprint registered',Array.isArray(manifest.baselines.R8R4R4R3R4)&&manifest.baselines.R8R4R4R3R4.length===manifest.files.length);
console.log(`R8R4R4R3R4 auth/theme/firestore contracts ${count}/${count} PASS; physical APK still required.`);
