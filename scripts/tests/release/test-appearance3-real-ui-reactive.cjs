#!/usr/bin/env node
'use strict';
/** Structural regression for the React Compiler-compatible real-screen rollout.
 * This checks actual function bodies (including memo-wrapped components) rather
 * than relying on how often a legacy revision hook is called. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ts=require('../../vendor/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'../../..'),src=path.join(root,'src');
const appJson=JSON.parse(fs.readFileSync(path.join(root,'app.json'),'utf8'));
assert.equal(appJson.expo.experiments.reactCompiler,true,'Compiler remains ON in this trial');
const compat=fs.readFileSync(path.join(src,'appearance3/compatReactiveStyles.ts'),'utf8');
assert(compat.includes('useA3Theme()')&&compat.includes('useA3Typography()')&&compat.includes('useMemo('));
assert(!/firebase|firestore|setDoc|AsyncStorage/i.test(compat.replace(/Firebase/g,'')), 'No persistence in reactive style render bridge');
const required=[
 'app/(tabs)/index.tsx','app/(tabs)/_layout.tsx','app/(tabs)/family.tsx',
 'app/(tabs)/moments.tsx','app/(tabs)/planner.tsx','app/(tabs)/play.tsx',
 'app/(profile)/settings.tsx','app/(profile)/profile.tsx',
 'app/(family)/(graph)/family-graph-admin.tsx',
 'components/ui/BloomPageComponents.tsx','components/ui/BloomHeroHeader.tsx',
 'components/ui/BloomThemeSettingsPanel.tsx','components/layout/ScreenContainer.tsx',
];
for(const rel of required){const data=fs.readFileSync(path.join(src,rel),'utf8');assert(data.includes('useA3LegacyStyles('),`Missing a live styles subscription in ${rel}`);}
let files=0,components=0,remaining=[];const exceptionAreas=[
 '/components/games/','/components/onboarding/WelcomeModal.tsx',
 '/features/study/StudyFormula.tsx', '/features/home/timeCapsule/TimeCapsuleRevealPrototype.tsx',
 '/diagnostics/SessionDiagnosticCard.tsx',
 '/theme/BloomAppearanceAccountBridge.tsx','/web/'
];
function excluded(rel){return exceptionAreas.some(area=>('/'+rel).includes(area));}
function scan(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
 const p=path.join(dir,entry.name);if(entry.isDirectory()){scan(p);continue;}
 if(!entry.name.endsWith('.tsx')||entry.name.endsWith('.web.tsx'))continue;
 const rel=path.relative(src,p).replaceAll('\\','/'),sf=ts.createSourceFile(p,fs.readFileSync(p,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 files++;
 function inspect(name,body){if(!name||!/^[A-Z]/.test(name)||!body)return;components++;
  function v(node){if(ts.isPropertyAccessExpression(node)&&ts.isIdentifier(node.expression)&&['COLORS','styles','s'].includes(node.expression.text)){
   if(!excluded(rel)){const loc=sf.getLineAndCharacterOfPosition(node.getStart());remaining.push(`${rel}:${loc.line+1} ${name} ${node.expression.text}`);}
  }ts.forEachChild(node,v);}v(body);
 }
 for(const st of sf.statements){if(ts.isFunctionDeclaration(st)&&st.body)inspect(st.name?.text,st.body);
 if(ts.isVariableStatement(st))for(const d of st.declarationList.declarations){if(!ts.isIdentifier(d.name)||!d.initializer)continue;const init=d.initializer;
 if((ts.isArrowFunction(init)||ts.isFunctionExpression(init))&&ts.isBlock(init.body))inspect(d.name.text,init.body);
 else if(ts.isCallExpression(init)&&init.arguments[0]&&(ts.isFunctionExpression(init.arguments[0])||ts.isArrowFunction(init.arguments[0]))&&ts.isBlock(init.arguments[0].body))inspect(d.name.text,init.arguments[0].body);
 }}
}}
scan(src);
assert(files>=165,`Source scan incomplete: ${files}`);
assert(components>=330,`Component scan incomplete: ${components}`);
assert.deepEqual(remaining,[],`Compiler-unsafe global style/paint references left in migrated screens:\n${remaining.slice(0,20).join('\n')}`);
const screen=fs.readFileSync(path.join(src,'components/layout/ScreenContainer.tsx'),'utf8');
assert(screen.includes('backgroundColor ?? themeColors.softSurface'),'ScreenContainer should default to reactive colors');
const plane=fs.readFileSync(path.join(src,'components/layout/BloomThemedPlane.tsx'),'utf8');
assert(plane.includes('useA3Theme()')&&plane.includes('__a3Colors[tone]'));
const home=fs.readFileSync(path.join(src,'app/(tabs)/index.tsx'),'utf8');
assert(home.includes('const HomeSummaryIsland = memo(function HomeSummaryIsland')&&home.includes('const __a3_styles = useA3LegacyStyles(styles);'),'Memoized home islands must use reactive snapshots');
console.log(`Appearance 3.0 real UI: PASS ${files} TSX files / ${components} components scanned; 0 non-exempt global paint/style reads`);
