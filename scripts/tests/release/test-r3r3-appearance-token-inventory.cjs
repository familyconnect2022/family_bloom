/** Source-only contract for theme token conversion.
 * Intentional fixed colors: historical letter art, chess/xiangqi pieces,
 * system notification badge, dev-only diagnostic probes and SVG scene art.
 * New generic UI hardcodes should FAIL this gate, not silently accumulate. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ts=require('../../vendor/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'../../..');
let files=0,colors=0,hardcoded=0,unexpected=[];
const approvedOccurrences=new Map();
const allowed = rel => rel.includes('/onboarding/WelcomeModal.tsx') ||
  rel.includes('/(internal)/') || rel.endsWith('/app/_layout.tsx') ||
  rel.endsWith('/app/session-gate.tsx') ||
  rel.endsWith('/services/push/localNotificationService.ts') ||
  rel.endsWith('/services/xiangqi/xiangqiLocalRules.ts') ||
  rel.endsWith('/components/ui/BloomInputComponents/AvatarCropEditor.tsx') ||
  rel.endsWith('/components/ui/BloomInputComponents/BloomInputAvatar.tsx');
// Explicitly reviewed image overlays, scrims, glossy surfaces and game imagery.
// Generic cards/text/buttons should always use semantic appearance tokens.
// Pin exact allowed literal values and counts to catch newly introduced hardcodes.
const approvedOverlayValues = new Map([
  ["src/app/(activity)/event/[eventId].tsx", {max:2, values:new Set(["rgba(54,34,42,0.5)", "rgba(58,38,46,0.58)"])}],
  ["src/app/(chat)/chat/index.tsx", {max:1, values:new Set(["rgba(255,255,255,0.78)"])}],
  ["src/app/(family)/(graph)/family-graph-admin.tsx", {max:4, values:new Set(["rgba(255,255,255,0.72)", "rgba(255,255,255,0.86)", "rgba(255,255,255,0.95)", "rgba(61,43,49,0.28)"])}],
  ["src/app/(family)/family-timeline.tsx", {max:1, values:new Set(["rgba(67,39,49,.72)"])}],
  ["src/app/(family)/member/[uid].tsx", {max:2, values:new Set(["rgba(255,255,255,0.75)", "rgba(255,255,255,0.9)"])}],
  ["src/app/(home)/(time-capsule)/home-time-capsules.tsx", {max:7, values:new Set(["rgba(137,87,103,0.12)", "rgba(255,255,255,0.17)", "rgba(255,255,255,0.38)", "rgba(255,255,255,0.72)", "rgba(255,255,255,0.86)", "rgba(86,45,59,0.08)"])}],
  ["src/app/(memories)/memory-book.tsx", {max:1, values:new Set(["rgba(244,162,190,0.17)"])}],
  ["src/app/(profile)/profile.tsx", {max:3, values:new Set(["rgba(255,255,255,0.92)", "rgba(69,43,53,0.42)", "rgba(74,45,56,0.34)"])}],
  ["src/app/(tabs)/moments.tsx", {max:2, values:new Set(["rgba(0,0,0,0.48)", "rgba(0,0,0,0.55)"])}],
  ["src/components/familyGraph/FamilyGraphFocusHost.tsx", {max:1, values:new Set(["rgba(45,31,37,0.22)"])}],
  ["src/components/familyGraph/FamilyGraphFocusView.tsx", {max:1, values:new Set(["rgba(255,255,255,0.88)"])}],
  ["src/components/familyGraph/FamilyGraphPersonSheet.tsx", {max:4, values:new Set(["rgba(255,255,255,0.18)", "rgba(62,45,51,0.28)", "rgba(67,39,49,0.72)", "rgba(80,49,61,0.72)"])}],
  ["src/components/familyGraph/FamilyGraphPrototype.tsx", {max:1, values:new Set(["rgba(62,45,51,0.28)"])}],
  ["src/components/games/BoardGamePresentationRoot.tsx", {max:9, values:new Set(["rgba(255,255,255,0.18)", "rgba(255,255,255,0.28)", "rgba(255,255,255,0.34)", "rgba(255,255,255,0.76)", "rgba(255,255,255,0.78)", "rgba(255,255,255,0.90)", "rgba(255,255,255,0.91)", "rgba(63,45,12,0.72)", "rgba(80,55,65,0.10)"])}],
  ["src/components/games/ChessChallengeGate.tsx", {max:1, values:new Set(["rgba(255,240,249,.83)"])}],
  ["src/components/games/FirebaseBoardInvitationGate.tsx", {max:1, values:new Set(["rgba(38,21,33,.42)"])}],
  ["src/components/media/MediaViewerProvider.tsx", {max:8, values:new Set(["rgba(0,0,0,0.34)", "rgba(0,0,0,0.52)", "rgba(241,221,229,0.96)", "rgba(255,245,248,0.16)", "rgba(255,245,248,0.94)", "rgba(255,255,255,0.14)", "rgba(9,7,8,0.34)"])}],
  ["src/components/moments/MomentCard.tsx", {max:3, values:new Set(["rgba(0,0,0,0.46)", "rgba(44,27,34,0.48)", "rgba(65,39,49,0.34)"])}],
  ["src/components/moments/PendingMomentCard.tsx", {max:2, values:new Set(["rgba(54,34,42,0.54)", "rgba(70,42,52,0.56)"])}],
  ["src/components/system/BloomAppBootstrap.tsx", {max:3, values:new Set(["rgba(255,255,255,0.38)", "rgba(255,255,255,0.4)", "rgba(255,255,255,0.82)"])}],
  ["src/components/ui/BloomHeroHeader.tsx", {max:55, values:new Set(["rgba(102,145,101,0.32)", "rgba(102,145,101,0.42)", "rgba(102,86,160,0.34)", "rgba(102,86,160,0.58)", "rgba(105,137,95,0.42)", "rgba(111,164,125,0.35)", "rgba(122,145,99,0.4)", "rgba(128,68,91,0.35)", "rgba(128,68,91,0.38)", "rgba(163,99,190,0.45)", "rgba(255,255,255,0.14)", "rgba(255,255,255,0.18)", "rgba(255,255,255,0.25)", "rgba(255,255,255,0.27)", "rgba(255,255,255,0.32)", "rgba(255,255,255,0.34)", "rgba(255,255,255,0.38)", "rgba(255,255,255,0.40)", "rgba(255,255,255,0.42)", "rgba(255,255,255,0.45)", "rgba(255,255,255,0.50)", "rgba(255,255,255,0.52)", "rgba(255,255,255,0.64)", "rgba(255,255,255,0.72)", "rgba(255,255,255,0.75)", "rgba(255,255,255,0.76)", "rgba(255,255,255,0.78)", "rgba(255,255,255,0.8)", "rgba(255,255,255,0.82)", "rgba(255,255,255,0.84)", "rgba(255,255,255,0.88)", "rgba(255,255,255,0.92)", "rgba(255,255,255,0.94)", "rgba(255,255,255,0.95)", "rgba(255,255,255,0.96)", "rgba(255,255,255,0.97)"])}],
  ["src/components/ui/BloomInputComponents/AvatarSourceSheet.tsx", {max:1, values:new Set(["rgba(28,20,31,0.45)"])}],
  ["src/components/ui/BloomToast.tsx", {max:3, values:new Set(["rgba(0,0,0,0.05)", "rgba(255,255,255,0.72)", "rgba(255,255,255,0.9)"])}],
  ["src/features/home/music/HomeMusicPanel.tsx", {max:4, values:new Set(["rgba(236,205,229,0.45)", "rgba(255,255,255,0.56)", "rgba(255,255,255,0.58)", "rgba(255,255,255,0.67)"])}],
  ["src/features/home/timeCapsule/TimeCapsuleRevealPrototype.tsx", {max:20, values:new Set(["rgba(0,0,0,0.23)", "rgba(240,246,255,0.72)", "rgba(240,249,255,0.22)", "rgba(255,244,196,0.25)", "rgba(255,255,255,0.035)", "rgba(255,255,255,0.04)", "rgba(255,255,255,0.045)", "rgba(255,255,255,0.08)", "rgba(255,255,255,0.10)", "rgba(255,255,255,0.13)", "rgba(255,255,255,0.14)", "rgba(255,255,255,0.15)", "rgba(255,255,255,0.16)", "rgba(255,255,255,0.20)", "rgba(255,255,255,0.32)", "rgba(255,255,255,0.40)", "rgba(255,255,255,0.42)", "rgba(255,255,255,0.48)", "rgba(255,255,255,0.82)"])}],
]);
const colorProps=new Set(['color','backgroundColor','borderColor','borderTopColor','borderBottomColor','borderLeftColor','borderRightColor','tintColor','shadowColor','stroke','fill']);
const pat=/^(?:#[\da-f]{3,8}|white|black|red|pink|blue|green|rgba?\([^)]*\))$/i;
function walk(dir) {
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {
  if(entry.name==='web')continue;
  const p=path.join(dir,entry.name);
  if(entry.isDirectory()){walk(p);continue;}
  if(!/\.(ts|tsx)$/.test(entry.name)||entry.name.endsWith('.web.tsx'))continue;
  files++;
  const rel=path.relative(root,p).replaceAll('\\','/');
  const source=ts.createSourceFile(p,fs.readFileSync(p,'utf8'),ts.ScriptTarget.Latest,true,entry.name.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  function visit(node) {
   if(ts.isPropertyAssignment(node)||ts.isJsxAttribute(node)) {
    const name=node.name.getText(source);
    if(colorProps.has(name)) {
     colors++;
     const value=node.initializer;
     let raw=ts.isStringLiteral(value)?value.text:null;
     if(ts.isJsxExpression(value)&&value.expression&&ts.isStringLiteral(value.expression))raw=value.expression.text;
     if(raw && raw!=='transparent'&&pat.test(raw)) {
      hardcoded++;
      if(!allowed(rel)) {
        const approved=approvedOverlayValues.get(rel);
        const count=(approvedOccurrences.get(rel)||0)+1;
        approvedOccurrences.set(rel,count);
        if(!approved||!approved.values.has(raw)||count>approved.max)
          unexpected.push({file:rel,line:source.getLineAndCharacterOfPosition(node.pos).line+1,value:raw});
      }
     }
    }
   }
   if(ts.isCallExpression(node)&&node.expression.getText(source)==='StyleSheet.create' && /COLORS\.|getBloomActiveColors\(/.test(node.getText(source))) {
    let wrapped=false,parent=node.parent;
    while(parent&&parent!==source){if(ts.isCallExpression(parent)&&parent.expression.getText(source)==='createBloomStyles')wrapped=true;parent=parent.parent;}
    // Inside a component hook-produced factory also okay; static module-level style isn't.
    if(!wrapped) {
      parent=node.parent;let inFunction=false;
      while(parent&&parent!==source){if(ts.isFunctionLike(parent))inFunction=true;parent=parent.parent;}
      if(!inFunction)unexpected.push({file:rel,value:'theme tokens captured at static module StyleSheet.create'});
    }
   }
   ts.forEachChild(node,visit);
  }
  visit(source);
 }
}
walk(path.join(root,'src'));
assert(files>=350,'missing source files');
assert(colors>=4000,'color-token coverage unexpectedly decreased');
assert(hardcoded<=176,`Hard-coded paint declarations grew: ${hardcoded}`);
for(const [file, spec] of approvedOverlayValues) {
 assert((approvedOccurrences.get(file)||0)<=spec.max,`Increased fixed paint in ${file}`);
}
assert.deepEqual(unexpected,[],`Generic UI must use theme tokens: ${JSON.stringify(unexpected.slice(0,12))}`);
const main=fs.readFileSync(path.join(root,'src/components/layout/BloomThemedPlane.tsx'),'utf8');
// Appearance 3.0: a reactive store snapshot, never the legacy COLORS Proxy,
// must determine the native screen surface.
assert(main.includes('useA3Theme()') && /(?:__a3Colors|colors)\[tone\]/.test(main),
  'BloomThemedPlane must read a subscribed color snapshot, not global COLORS');
console.log(`APPEARANCE TOKENS PASS: ${files} Android/shared files, ${colors} color fields, ${hardcoded} reviewed overlays/art colors, 0 unreviewed generic hardcodes`);
