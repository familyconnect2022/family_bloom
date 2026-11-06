const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'../../..');
const read = (f)=>fs.readFileSync(path.join(root,f),'utf8');
const layout=read('src/app/_layout.tsx');
const sessionGate=read('src/app/session-gate.tsx');
const auth=read('src/context/AuthContext.tsx');
const picker=read('src/components/ui/BloomInputComponents/BloomInputAvatar.tsx');
const sheet=read('src/components/ui/BloomInputComponents/AvatarSourceSheet.tsx');
const cv=read('src/app/(profile)/profile.tsx');
const welcome=read('src/services/onboarding/welcomeGate.ts');
const sessionAccess=read('src/services/navigation/familySessionAccess.ts');
const graph=read('src/app/(family)/(graph)/family-graph-person-editor.tsx');
const creation=read('src/app/(profile)/create-profile.tsx');
const checks=[
 ['Tabs require verified family and are blocked by Welcome',()=>{assert.match(layout,/<Stack\.Protected guard=\{allowFamilyRoutes\}>/);assert.match(layout,/canEnterFamilyHome\(\{/)}],
 ['Create profile allowed only for missing profile',()=>assert.match(layout,/guard=\{!!user && profileStatus === "missing"\}/)],
 ['Current user profile UID is checked by pure access gate',()=>assert.match(sessionAccess,/input.profileUid === input.uid/)],
 ['Membership verified before Home',()=>assert.match(sessionAccess,/input.membershipStatus === "ready"/)],
 ['Missing-profile screen does not wait for Membership',()=>{assert.match(layout,/profileStatus === "ready" && \(membershipStatus === "loading" \|\| membershipStatus === "error" \|\| !welcomeReady\)/);assert.match(layout,/guard=\{!!user && profileStatus === "missing"\}/)}],
 ['Profile bootstrap errors have retry instead of opening Home',()=>{assert.match(layout,/profileStatus === "error"/);assert.match(sessionGate,/profileStatus === "error"/);assert.match(sessionGate,/onPress=\{retryNow\}/);assert.match(sessionGate,/retryFirebaseVerification\(\)/);assert.match(layout,/<Stack.Screen name="session-gate"/)}],
 ['CV avatar compact mode avoids overflow',()=>{assert.match(cv,/<BloomInputAvatar label="" compact/);assert.match(picker, /!compact && <View/)}],
 ['No cached boot profile can authorize Home',()=>assert.doesNotMatch(auth,/setProfileStatus\("ready"\);\s*setMembershipStatus\("ready"\);/)],
 ['New UID clears previous user profile',()=>assert.match(auth,/profileRef\.current = null;\s*familiesRef\.current = \[\];[\s\S]{0,240}setUserProfile\(null\);/)],
 ['Welcome no longer requires tab paint',()=>assert.doesNotMatch(welcome,/input\.rootSegment === '\(tabs\)'/)],
 ['Welcome has independent visual readiness',()=>assert.match(layout,/welcomeBlocking/)],
 ['Profile edit button in portrait card',()=>assert.match(cv,/CHÂN DUNG THÀNH VIÊN[\s\S]{0,900}Chỉnh sửa hồ sơ/)],
 ['Profile identity uses stable fixed-height row',()=>assert.match(cv,/heroTop: \{[^\n]*minHeight: 128/)],
 ['CV and white cards keep content stable',()=>assert.match(cv,/heroCard: \{[^\n]*backgroundColor: COLORS\.surface/)],
 ['Camera choice exposed',()=>assert.match(sheet,/Chụp ảnh mới/)],
 ['Gallery choice exposed',()=>assert.match(sheet,/Chọn từ thư viện ảnh/)],
 ['Unused bundled avatar presets are hidden',()=>assert.doesNotMatch(sheet,/Chọn ảnh có sẵn/)],
 ['Camera uses verified native permission',()=>assert.match(picker,/requestCameraPermissionsAsync/)],
 ['Gallery goes through native picker',()=>assert.match(picker,/launchImageLibraryAsync/)],
 ['Unreliable preset processing removed',()=>assert.doesNotMatch(picker,/choosePreset|ImageManipulator\.manipulateAsync\(asset\.localUri/)],
 ['Crop occurs inside app',()=>assert.match(picker,/<AvatarCropEditor/)],
 ['Profile and create use shared picker',()=>{assert.match(cv,/<BloomInputAvatar/);assert.match(creation,/<BloomInputAvatar/)}],
 ['Remove previous avatar still available in compact mode',()=>assert.match(sheet,/Bỏ ảnh đại diện/)],
 ['Graph person uses shared picker',()=>assert.match(graph,/<BloomInputAvatar/)],
 ['Graph avatar remains distinct media scope',()=>assert.match(graph,/person-avatar-\$\{savedPersonId\}/)],
 ['Camera modal closes before external activity',()=>assert.match(picker,/setTimeout\(\(\) => \{ void select\(choice\); \}, 320\)/)],
];
let passed=0;for(const [name,run] of checks){try{run();passed++;console.log('PASS',name)}catch(e){console.error('FAIL',name,e.message);process.exitCode=1}}
// Test the actual pure authorization predicate, rather than checking a
// particular React implementation string or assuming root guards are correct.
const ts = (() => { for (const n of ['typescript','/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript']) {
  try { return require(n); } catch {} } return null; })();
if (ts) {
  const js=ts.transpileModule(sessionAccess,{fileName:'familySessionAccess.ts',compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const mod={exports:{}};new Function('module','exports',js)(mod,mod.exports);
  const gate=mod.exports.canEnterFamilyHome;
  const ok={uid:'uidA',profileUid:'uidA',profileStatus:'ready',membershipStatus:'ready',activeFamilyId:'familyA',verifiedMembershipFamilyIds:['familyA'],familySelectionRequired:false};
  const cases=[
    [ok,true],
    [{...ok,uid:null},false],
    [{...ok,uid:'uidB'},false],
    [{...ok,profileUid:'uidB'},false],
    [{...ok,profileStatus:'missing'},false],
    [{...ok,profileStatus:'loading'},false],
    [{...ok,profileStatus:'error'},false],
    [{...ok,membershipStatus:'loading'},false],
    [{...ok,activeFamilyId:null},false],
    [{...ok,activeFamilyId:'familyB'},false],
    [{...ok,verifiedMembershipFamilyIds:[]},false],
    [{...ok,familySelectionRequired:true},false],
  ];
  cases.forEach(([input,expected],index)=>assert.equal(gate(input),expected,`session access case ${index+1}`));
  console.log(`R7 P0 dynamic session access: ${cases.length}/${cases.length}`);
}
console.log(`R7 CV/ONBOARDING CONTRACT: ${passed}/${checks.length}`);
