#!/usr/bin/env node
'use strict';
/** Offline regression, not proof of Android native painting. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
let count=0;
const check=(name, fn)=>{fn();console.log(`PASS ${++count} ${name}`)};
function loadTS(rel){
 const js=ts.transpileModule(read(rel),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}});
 const c={exports:{}}; vm.runInNewContext(js.outputText,c,{filename:rel});return c.exports;
}
const {canEnterFamilyHome}=loadTS('src/services/navigation/familySessionAccess.ts');
const {resolveSessionGateDisplayStage, pendingCodeForSessionGate}=loadTS('src/services/navigation/sessionGateDisplayState.ts');
const base={uid:'account_A',profileUid:'account_A',profileStatus:'ready',membershipStatus:'ready',activeFamilyId:'family_A',verifiedMembershipFamilyIds:['family_A'],familySelectionRequired:false};
const layout=read('src/app/_layout.tsx');
const gate=read('src/app/session-gate.tsx');
const welcome=read('src/components/onboarding/WelcomeModal.tsx');
const auth=read('src/context/AuthContext.tsx');
const tab=read('src/context/TabStartupContext.tsx');
check('Verified family required for Welcome surface',()=>assert.equal(canEnterFamilyHome(base),true));
for(const [name,delta] of [
 ['no uid',{uid:null}],['foreign profile',{profileUid:'account_B'}],['profile loading',{profileStatus:'loading'}],
 ['membership loading',{membershipStatus:'loading'}],['membership permission failure',{membershipStatus:'error'}],
 ['no family',{activeFamilyId:null}],['stale membership index',{verifiedMembershipFamilyIds:['family_B']}],
 ['family selection required',{familySelectionRequired:true}]
]) check(`Welcome denies ${name}`,()=>assert.equal(canEnterFamilyHome({...base,...delta}),false));
check('Verified Welcome is rendered directly in native SessionGate screen',()=>assert.ok(gate.includes('if (welcomeOnGate) {') && gate.includes('testID="verified-welcome-native-screen"') && gate.includes('<WelcomeModal visible name={userProfile?.displayName} onContinue={dismissWelcome} />')));
check('Welcome guard uses shared verified family policy',()=>assert.ok(gate.includes('canEnterFamilyHome({') && gate.includes('const welcomeOnGate = authStatus === "signed-in" && verifiedFamily && welcomeReady && showWelcome;')));
check('Native /welcome route remains forbidden',()=>assert.ok(layout.includes('<Stack.Protected guard={false}>') && !layout.includes('router.replace("/welcome"')));
check('Auth error never displays Welcome or protected Home',()=>assert.ok(gate.includes('authStatus === "signed-in" && verifiedFamily') && layout.includes('const verifiedFamily = authStatus === "signed-in" && canEnterFamilyHome({')));
check('Public session-gate anchor remains first screen',()=>assert.ok(layout.indexOf('name="session-gate"')<layout.indexOf('<Stack.Protected guard={!user}>')));
check('Welcome always forces session gate rather than tabs',()=>assert.ok(layout.includes('if (welcomePending) {') && layout.includes('router.replace("/session-gate" as never)')));
check('Home remains unmounted until Welcome dismissed',()=>assert.ok(layout.includes('const allowFamilyRoutes = verifiedFamily && welcomeReady && !welcomeBlocking;') && layout.includes('<Stack.Protected guard={allowFamilyRoutes}>')));
check('No root sibling can be hidden behind native Android Stack',()=>assert.ok(!layout.includes('welcomePresentationPlane') && !layout.includes('root-sibling-mounted')));
check('No bootstrap shields layered above verified letter',()=>assert.ok(layout.includes('familyTransition && !welcomeBlocking') && layout.includes('!!user && !welcomeBlocking &&')));
check('Letter preserves reader, animation and real touch target',()=>assert.ok(welcome.includes('testID="welcome-one-artwork"') && welcome.includes('testID="welcome-letter-scroll"') && welcome.includes('testID="welcome-fixed-cta-footer"')));
check('Welcome records native layout, paint, touch and reader-interactive phases',()=>assert.ok(gate.includes('session-gate-letter-layout') && welcome.includes('single-paper-image-ready') && welcome.includes('single-paper-continue-pressed') && welcome.includes('single-paper-safe-text-region-measured')));
check('Welcome ledger acknowledgment persisted before returning to Home',()=>assert.ok(auth.includes('await welcomeLedger.markSeen(target.uid, membership);') && auth.includes('diagnostic.success(ackTicket')));
check('Welcome persistence failure keeps letter on screen',()=>{
 const dismiss=auth.split('const dismissWelcome = useCallback(async () => {')[1].split('const logout =')[0];
 assert.ok(dismiss.includes('} catch {') && dismiss.indexOf('setWelcomeTarget(current') < dismiss.indexOf('} catch {') && !dismiss.slice(dismiss.indexOf('} catch {')).includes('setWelcomeTarget('));
});
const state=(overrides={})=>({...{authStatus:'signed-in',profileStatus:'ready',membershipStatus:'ready',welcomeReady:true,userPresent:true},...overrides});
check('Verified Membership + Welcome ready no longer mislabeled MEM-201',()=>{
 const stage=resolveSessionGateDisplayStage(state());assert.equal(stage,'NAVIGATION');assert.equal(pendingCodeForSessionGate(stage),'NAV-501');
});
check('Pending Welcome ledger labeled WEL-401',()=>assert.equal(pendingCodeForSessionGate(resolveSessionGateDisplayStage(state({welcomeReady:false}))),'WEL-401')); 
check('Actually pending Membership labeled MEM-201',()=>assert.equal(pendingCodeForSessionGate(resolveSessionGateDisplayStage(state({membershipStatus:'loading'}))),'MEM-201')); 
check('Profile check labeled PRO-101',()=>assert.equal(pendingCodeForSessionGate(resolveSessionGateDisplayStage(state({profileStatus:'loading'}))),'PRO-101')); 
check('Auth check labeled AUTH-001',()=>assert.equal(pendingCodeForSessionGate(resolveSessionGateDisplayStage(state({authStatus:'initializing'}))),'AUTH-001')); 
check('Logged out anchor never implies verified Membership',()=>assert.equal(resolveSessionGateDisplayStage(state({userPresent:false,authStatus:'signed-out'})),'NAVIGATION'));
check('Session 12s stall timer must stop while verified Welcome is displayed',()=>assert.ok(gate.includes('if (failed || welcomeOnGate) return;') && gate.includes('if (!stalled || failed || welcomeOnGate) return;')));
check('Native chrome fallback only starts AFTER active tab reports ready',()=>assert.ok(tab.includes('if (!enabled || !released || chromeReady) return;') && tab.includes('chrome-after-tab-fallback') && tab.includes('4500')));
check('Chrome visual fallback cannot change authorization or Welcome flags',()=>assert.ok(!tab.includes('setMembershipStatus(') && !tab.includes('setWelcomeTarget(') && !tab.includes('setUserProfile(')));
check('No new Firebase or server requests introduced by welcome rendering',()=>assert.ok(!gate.includes('getDoc(') && !gate.includes('getDocs(') && !gate.includes('fetch(')));
console.log(`R3R3D2 verified native session-gate regression ${count}/${count} PASS; physical Android Release still required.`);
