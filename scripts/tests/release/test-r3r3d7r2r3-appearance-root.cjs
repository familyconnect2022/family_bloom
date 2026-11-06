/** Android appearance architecture contract. Does not touch Firebase production. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const provider=read('src/theme/BloomThemeProvider.tsx');
const text=read('src/components/ui/BloomText.tsx');
const styles=read('src/theme/createBloomStyles.ts');
const sync=read('src/theme/appearanceCloudSync.ts');
const panel=read('src/components/ui/BloomLivingAppearancePanel.tsx');
const inputs=read('src/components/ui/BloomScaledInput.tsx');
const dock=read('src/app/(tabs)/_layout.tsx');
const palette=read('src/theme/palette.ts');
let count=0;
const verify=(name,ok)=>{assert(ok,name);console.log('PASS',name);count++;};
verify('One local-first appearance store with separated React subscriptions',!provider.includes('BloomRenderRevisionContext.Provider')&&provider.includes('useBloomColorsRevision')&&provider.includes('useBloomTypographyRevision'));
verify('No root route remount via revision keys',!provider.includes('key={`${theme}:${living}`}'));
verify('Text consumes compiler-visible typography and optional color snapshots',text.includes('useA3Typography()')&&text.includes('useA3OptionalTheme(needsTheme)')&&text.includes('theme?.colors[appearanceTone]'));
verify('Legacy inline typography scales once from stored original value',text.includes('1.15 * scale / 100')&&text.includes('lastSize.sourceValue'));
verify('Style generator scales with same 15% baseline',styles.includes('1.15 * fontScale / 100'));
verify('Previously scaled styles recompute from original instead of stale processed value',text.includes('bloomFinalStyleField')&&text.includes('lastSize.sourceValue')&&styles.includes('markBloomTypography'));
verify('Explicit letter/formula font remains respected',text.includes('explicitFamily')&&text.includes('familySource.sourceValue'));
verify('Text without explicit color adopts subscribed theme ink',text.includes('theme?.colors.primaryText'));
verify('Text inputs use reactive typography and preserve native ref',inputs.includes('useA3Typography()')&&inputs.includes('forwardRef<NativeTextInput')&&inputs.includes('last.sourceValue'));
verify('Appearance settings still expose personal font choice',panel.includes('setFontScale')&&panel.includes('setFont('));
verify('Local-first UID cache avoids continuous Firestore listener',!sync.includes('onSnapshot(')&&sync.includes('if (usable(cached))')&&sync.includes('getDocFromServer('));
verify('Cloud read and write are UID and generation guarded',sync.includes('activeUid !== next || bindGeneration !== generation')&&sync.includes('activeUid !== target || bindGeneration !== generation'));
verify('Pending offline edits are saved locally before a cloud write',sync.includes('await persistTail')&&sync.includes('pendingSync: true'));
verify('Logout resets public palette but signed-in hydration never publishes an intermediate Rose',
  sync.includes("if (!next) {") && sync.includes("applyBloomSelection(DEFAULT_BLOOM_SELECTION, 'signed-out')") &&
  sync.includes("applyBloomSelection(DEFAULT_BLOOM_SELECTION, 'first-use-default')") &&
  sync.includes('isAppearanceReadyForUid')); 
verify('Navigator still separates translucent outer from themed inner dock',dock.includes('backgroundColor: "transparent"')&&dock.includes('backgroundColor: dockColors.surface')&&palette.includes('getBloomDockColors'));
const src=path.join(root,'src');let migrated=0;
function scan(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(entry.name==='web')continue;const p=path.join(dir,entry.name);if(entry.isDirectory())scan(p);else if(entry.name.endsWith('.tsx')&&fs.readFileSync(p,'utf8').includes('BloomText as Text'))migrated++;}}
scan(src);
verify('Common Text primitive adopted in broad Android UI',migrated>=95);
console.log(`R3R3D7R2R3 APPEARANCE ROOT ${count}/${count} PASS; ${migrated} UI modules migrated`);
