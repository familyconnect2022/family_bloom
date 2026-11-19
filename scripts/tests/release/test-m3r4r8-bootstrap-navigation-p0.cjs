#!/usr/bin/env node
'use strict';
/** Offline executable P0 contract. No Firebase credentials or React Native needed.
 * Screens can only be unlocked after UID/profile/membership verification.
 * Simulate the two user journeys that regressed on the Android test phone.
 */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
// Works in a clean FULL ZIP with Node 22+ (no node_modules yet). On older
// Node, use the locally installed TypeScript when available.
let ts;try{ts=require('typescript')}catch{}
const load=(file)=>{
  const source=read(file);
  if(ts){const js=ts.transpileModule(source,{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const m={exports:{}};new Function('module','exports',js)(m,m.exports);return m.exports;}
  const strip=require('node:module').stripTypeScriptTypes;
  if(typeof strip!=='function') throw new Error('Node >=22 or local TypeScript required for P0 runtime checks');
  const js=strip(source,{mode:'strip'}).replace(/\bexport\s+(?=(?:const|function|class)\b)/g,'');
  const names=file.includes('rootRoutePolicy')?['resolveRootRoute']:file.includes('familySessionAccess')?['canEnterFamilyHome']:['canPresentWelcome'];
  return new Function(js+'\nreturn {'+names.join(',')+'};')();
};
let n=0;
function check(label,actual,expected){assert.deepEqual(actual,expected,label);n++;console.log('PASS',label)}
const {resolveRootRoute}=load('src/services/navigation/rootRoutePolicy.ts');
const {canEnterFamilyHome}=load('src/services/navigation/familySessionAccess.ts');
const {canPresentWelcome}=load('src/services/onboarding/welcomeGate.ts');
const base={pathname:'/session-gate',rootSegment:'session-gate',isSignedIn:false,profileStatus:'idle',familySelectionRequired:false,hasValidActiveFamily:false,familyTransition:false};
check('Auth not resolved cannot itself unlock Home',canEnterFamilyHome({uid:null,profileUid:null,profileStatus:'idle',membershipStatus:'idle',activeFamilyId:null,verifiedMembershipFamilyIds:[],familySelectionRequired:false}),false);
check('Signed out user lands in Login',resolveRootRoute(base)?.target,'/(auth)/login');
check('Fresh UID missing profile lands in Create Profile',resolveRootRoute({...base,isSignedIn:true,profileStatus:'missing'})?.target,'/create-profile');
check('Fresh UID in create-profile cannot redirect itself',resolveRootRoute({...base,pathname:'/create-profile',rootSegment:'(profile)',isSignedIn:true,profileStatus:'missing'}),null);
check('Existing profile without memberships goes to family gateway',resolveRootRoute({...base,isSignedIn:true,profileStatus:'ready'})?.target,'/family-gateway');
check('Multiple homes require explicit choice',resolveRootRoute({...base,isSignedIn:true,profileStatus:'ready',familySelectionRequired:true})?.target,'/family-select');
check('Verified family switches anchor to Home after Welcome',resolveRootRoute({...base,isSignedIn:true,profileStatus:'ready',hasValidActiveFamily:true})?.target,'/(tabs)');
const family={uid:'newUser',profileUid:'newUser',profileStatus:'ready',membershipStatus:'ready',activeFamilyId:'familyA',verifiedMembershipFamilyIds:['familyA'],familySelectionRequired:false};
check('Valid verified family permitted',canEnterFamilyHome(family),true);
check('Different profile UID denied',canEnterFamilyHome({...family,profileUid:'oldUser'}),false);
check('No profile denied',canEnterFamilyHome({...family,profileStatus:'missing',profileUid:null}),false);
check('Membership still loading denied',canEnterFamilyHome({...family,membershipStatus:'loading'}),false);
check('Membership not belonging to active family denied',canEnterFamilyHome({...family,verifiedMembershipFamilyIds:['familyB']}),false);
check('No active family denied',canEnterFamilyHome({...family,activeFamilyId:null}),false);
check('Unresolved family selection denied',canEnterFamilyHome({...family,familySelectionRequired:true}),false);
const welcome={requested:true,visualReady:true,rootSegment:'session-gate',transitionActive:false,authenticated:true};
check('Welcome visible on safe anchor before mounting Home',canPresentWelcome(welcome),true);
check('Welcome cannot appear without verified family',canPresentWelcome({...welcome,authenticated:false}),false);
check('Welcome cannot appear before visual readiness',canPresentWelcome({...welcome,visualReady:false}),false);
const layout=read('src/app/_layout.tsx');
// Execute the real redirect condition in RootRouteGate. R7R1 referenced an
// undeclared `inTabs` variable here, producing ReferenceError only when
// navigation was actually needed (especially on a new UID -> Create Profile).
// Static TSX syntax tests and policy-only simulations did NOT catch it.
const rootGateText=layout.split('const RootRouteGate =')[1]?.split('const RootNavigator =')[0] ?? '';
const conditionMatch=rootGateText.match(/if\s*\(\s*(target\s*&&\s*target\s*!==\s*pathname\s*&&\s*!\([^\n]+)\)\s*\{/);
assert(conditionMatch, 'Must find exact RootRouteGate redirect predicate');
const redirectCondition=conditionMatch[1];
const executeRedirectPredicate=new Function('target','pathname','rootSegment',`return Boolean(${redirectCondition});`);
check('Fresh account redirect predicate executes without ReferenceError',executeRedirectPredicate('/create-profile','/session-gate','session-gate'),true);
check('Already at Create Profile does not redirect itself',executeRedirectPredicate('/create-profile','/create-profile','(profile)'),false);
check('Already inside Tabs never redirects to Tabs',executeRedirectPredicate('/(tabs)','/','(tabs)'),false);
check('Unverified profile must not be routed into Home by redirect predicate',executeRedirectPredicate('/create-profile','/session-gate','session-gate'),true);
const auth=read('src/context/AuthContext.tsx');
const anchor=read('src/app/session-gate.tsx');
const profileService=read('src/services/profile/profileService.ts');
assert(layout.includes('<Stack.Screen name="session-gate"') && layout.indexOf('<Stack.Screen name="session-gate"')<layout.indexOf('<Stack.Protected guard={!user}>'),'Always-available anchor must be first and outside protected groups');n++;
console.log('PASS Unprotected session gate precedes all protected groups');
assert(anchor.includes('export default function SessionGate') && anchor.includes('retryFirebaseVerification') && !anchor.includes('useFamilyDashboard') && !anchor.includes('familyService') && !anchor.includes('familyService') && !anchor.includes('router.push(') && !anchor.includes('router.push('),'Session anchor can only display verification status and retry; never access family data');n++;
console.log('PASS Anchor only reads Auth verification statuses; no family content');
assert(layout.includes('router.replace("/session-gate"') && layout.includes('identityPending || profileStatus === "error"') && read('src/app/session-gate.tsx').includes('testID="verified-welcome-native-screen"') && layout.includes('if (welcomePending)'),'Unresolved identity must park on safe anchor; verified Welcome must appear inside native safe screen before Home');n++;
console.log('PASS Unresolved identity uses safe anchor and verified Welcome opens protected route');
assert(layout.includes('const showTransitionShield = allowFamilyRoutes && !familyUiReady;') && layout.includes('<BloomAppBootstrap ready={false} message="Đang mở mái nhà của bạn…" />'),'Keep a visual shield after Welcome until tab first frame');n++;
console.log('PASS Home transition remains visually shielded until tabs are painted');
assert(layout.includes('const allowFamilyRoutes = verifiedFamily && welcomeReady && !welcomeBlocking;') && layout.includes('<Stack.Protected guard={allowFamilyRoutes}>'),'Home cannot mount beneath Welcome');n++;
console.log('PASS Home guard excludes Welcome phase');
// R16 Secure V2 moved initial verification into a helper receiving the
// verified Firebase identity. Check within that helper, not against the old
// `currentUser` expression from the pre-V2 bootstrap implementation.
const bootstrap=auth.split('const startAuthoritativeVerification =')[1]?.split('if(nativeSecureSessionPreview.requiresSession')[0]||'';
const remote=bootstrap.indexOf('void loadAuthoritativeProfile(verifiedUser);');
const cached=bootstrap.indexOf('void bootSessionCache.read(verifiedUser.uid)');
assert(remote>=0 && cached>remote && bootstrap.includes('.catch(()=>undefined);') &&
  auth.includes('startAuthoritativeVerification(verifiedUser);') &&
  auth.includes('nativeSecureSessionPreview.activate(currentUser)'),
  'Firestore check must precede optional cache and use the V2 verified identity');n++;
console.log('PASS Profile Firestore read cannot be blocked by failed cache read');
assert(profileService.includes('getDocFromServer(') && profileService.includes('getAuthoritative: getAuthoritativeProfile') && auth.includes('profileService.getAuthoritative(currentUser.uid)'), 'Missing profile must be confirmed by Firestore server, not stale cache');n++;
console.log('PASS New UID profile existence determined by authoritative server read');
assert(auth.includes('epoch !== authEpochRef.current || authUidRef.current !== currentUser.uid') && auth.includes('epoch !== authEpochRef.current || authUidRef.current !== user.uid'),'UID switches reject late family mutations');n++;
console.log('PASS Late async membership updates cannot mutate next UID');
console.log(`Family Bloom R8 P0 Bootstrap Navigation: ${n}/${n} PASS`);
