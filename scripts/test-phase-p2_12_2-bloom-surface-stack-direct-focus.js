#!/usr/bin/env node
const fs=require('fs'), path=require('path'), ts=require('typescript');
const root=path.resolve(__dirname,'..'); const read=p=>fs.readFileSync(path.join(root,p),'utf8');
let pass=0,fail=0; const check=(n,o)=>{if(o){pass++;console.log(`PASS ${String(pass+fail).padStart(2,'0')} - ${n}`)}else{fail++;console.error(`FAIL ${String(pass+fail).padStart(2,'0')} - ${n}`)}};
console.log('\nP2.12.2 compatibility — Surface Stack with Persistent Root Focus\n');
const rootLayout=read('src/app/_layout.tsx'), stack=read('src/components/system/BloomSurfaceStack.tsx'), store=read('src/services/presentation/bloomSurfaceStackStore.ts'), manager=read('src/services/presentation/bloomRootSurfaceManager.ts'), graph=read('src/components/familyGraph/FamilyGraphPrototype.tsx'), chess=read('src/components/chess/ChessSurfaceHost.tsx'), mini=read('src/components/chess/ChessMiniHost.tsx');
const pkg=JSON.parse(read('package.json')), clean=read('Family_Bloom_CLEAN_APPLY_FULL.bat'), debug=read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat'), release=read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');
check('App root still mounts one BloomSurfaceStack', rootLayout.includes('<BloomSurfaceStack backgroundWarmReady={backgroundWarmReady} />'));
check('Game plane still owns persistent Chess full and mini surfaces', stack.includes('<ChessSurfaceHost occludedByHigherSurface={policy.gamesOccluded} />')&&stack.includes('<ChessMiniHost occludedByHigherSurface={policy.gamesOccluded} />')&&stack.includes('styles.gameLayer'));
check('Canonical root surface priorities remain ordered', manager.includes('game: 100')&&manager.includes('focus: 200')&&manager.includes('globalSystem: 300'));
check('Game layer still references canonical root layer constant', stack.includes('zIndex: BLOOM_ROOT_Z_ORDER.game'));
check('Global system UI remains root-high-priority', stack.includes('zIndex: BLOOM_ROOT_Z_ORDER.globalSystem'));
check('Root stack owns one typed Family Graph Focus host without ReactNode transport', stack.includes('<FamilyGraphFocusSurfaceHost />') && !store.includes('ReactNode'));
check('Family Graph Focus no longer allocates native Modal windows', !/<Modal\s+[\s\S]*?visible=\{focusOverlayVisible\}/m.test(graph) && graph.includes('publishFamilyGraphFocusSurface'));
check('Focus root host occupies canonical focus layer', stack.includes('styles.focusLayer') && stack.includes('<FamilyGraphFocusSurfaceHost />'));
check('Canonical Focus layer sits above ordinary persistent game layer', stack.includes('zIndex: BLOOM_ROOT_Z_ORDER.focus') && stack.includes('zIndex: BLOOM_ROOT_Z_ORDER.game'));
check('Retained BSH remains intact after presentation rollback', graph.includes('loadedRegionKeysRef')&&graph.includes('renderBounds={null}')&&graph.includes('geometry={scene?.geometry ?? null}'));
let syntax=true; for(const f of ['src/services/presentation/bloomSurfaceStackStore.ts','src/services/presentation/bloomRootSurfaceManager.ts','src/components/system/BloomSurfaceStack.tsx','src/components/familyGraph/FamilyGraphPrototype.tsx','src/app/_layout.tsx']){const r=ts.transpileModule(read(f),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true,fileName:f}); if((r.diagnostics||[]).some(d=>d.category===ts.DiagnosticCategory.Error))syntax=false;}
check('P2.12.2 successor integration transpiles cleanly', syntax);
check('P2.12.2 package gate remains registered', pkg.scripts?.['phaseP2_12_2:check']==='node ./scripts/test-phase-p2_12_2-bloom-surface-stack-direct-focus.js');
check('Copy-over updater invokes P2.12.2 compatibility gate', clean.includes('test-phase-p2_12_2-bloom-surface-stack-direct-focus.js'));
check('Debug build invokes P2.12.2 compatibility gate', debug.includes('phaseP2_12_2:check'));
check('Release build invokes P2.12.2 compatibility gate', release.includes('phaseP2_12_2:check'));
console.log(`\nFamily Bloom P2.12.2 successor compatibility: ${pass}/${pass+fail} PASS`); if(fail)process.exit(1);
