#!/usr/bin/env node
const fs=require('fs'),path=require('path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'); let pass=0,fail=0; const check=(n,o)=>{if(o){pass++;console.log(`PASS ${String(pass+fail).padStart(2,'0')} - ${n}`)}else{fail++;console.error(`FAIL ${String(pass+fail).padStart(2,'0')} - ${n}`)}};
console.log('\nP2.12.1 compatibility — Detail to Persistent Root Focus\n');
const flow=read('src/components/ui/BloomFullScreenFlow.tsx'),sheet=read('src/components/familyGraph/FamilyGraphPersonSheet.tsx'),graph=read('src/components/familyGraph/FamilyGraphPrototype.tsx'); const pkg=JSON.parse(read('package.json')),clean=read('scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat'),debug=read('scripts/android/dev/Family_Bloom_Android_Debug_Build_And_Run.bat'),release=read('scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat');
check('BloomFullScreenFlow retains onDismiss support', flow.includes('onDismiss?: () => void')&&flow.includes('onDismiss={onDismiss}'));
check('BloomFullScreenFlow retains instant dismiss capability', flow.includes('dismissImmediately?: boolean')&&flow.includes('animationType={dismissImmediately ? "none" : "slide"}'));
check('Person detail branch action is a single branch request', sheet.includes('onPress={() => onOpenBranch(person.id)}'));
check('Person sheet does not independently close after branch request', !sheet.slice(sheet.indexOf('onPress={() => onOpenBranch(person.id)}'),sheet.indexOf('onPress={() => onOpenBranch(person.id)}')+180).includes('onClose()'));
check('Graph uses direct known-good handleOpenBranch handoff', graph.includes('onOpenBranch={handleOpenBranch}'));
check('Opening branch presents root Focus before Detail cleanup', graph.includes('mountFocusOverlay(personId, hostFrame);') && graph.includes('setDetailFocusHandoffPending(true)') && graph.indexOf('mountFocusOverlay(personId, hostFrame);') < graph.indexOf('setDetailPersonId(null);', graph.indexOf('const handoffPersonSheetToFocus')));
check('Failed pending portal handoff state is absent', !/pendingFocusPersonId|requestFocusFromDetail|completeDetailFocusHandoff/.test(graph));
check('Focus shell uses data-only persistent root surface instead of native Modal', graph.includes('publishFamilyGraphFocusSurface') && !/<Modal\s+[\s\S]*?visible=\{focusOverlayVisible\}/m.test(graph));
check('Cached host branch path presents Focus immediately during Detail dismiss', graph.includes('handoffPersonSheetToFocus(personId, cachedHost)') && graph.includes('mountFocusOverlay(personId, hostFrame);') && graph.includes('onDismiss={handlePersonSheetDismiss}'));
check('P2.12 retained rendering contract remains present', graph.includes('loadedRegionKeysRef')&&graph.includes('renderBounds={null}')&&graph.includes('geometry={scene?.geometry ?? null}'));
let syntax=true; for(const f of ['src/components/ui/BloomFullScreenFlow.tsx','src/components/familyGraph/FamilyGraphPersonSheet.tsx','src/components/familyGraph/FamilyGraphPrototype.tsx']){const r=ts.transpileModule(read(f),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true,fileName:f}); if((r.diagnostics||[]).some(d=>d.category===ts.DiagnosticCategory.Error))syntax=false;}
check('P2.12.1 successor integration transpiles cleanly',syntax);
check('P2.12.1 package gate remains registered',pkg.scripts?.['phaseP2_12_1:check']==='node ./scripts/test-phase-p2_12_1-native-modal-focus-handoff.js');
check('Copy-over updater invokes P2.12.1 gate',clean.includes('test-phase-p2_12_1-native-modal-focus-handoff.js'));
check('Debug build invokes P2.12.1 gate',debug.includes('phaseP2_12_1:check'));
check('Release build invokes P2.12.1 gate',release.includes('phaseP2_12_1:check'));
console.log(`\nFamily Bloom P2.12.1 successor compatibility: ${pass}/${pass+fail} PASS`); if(fail)process.exit(1);
