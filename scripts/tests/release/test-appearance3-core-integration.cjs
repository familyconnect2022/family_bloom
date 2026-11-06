/** Source-level integration gate for real product primitives. This is NOT a
 * substitute for React Compiler output verification or on-device Release QA. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const get=p=>fs.readFileSync(path.join(root,p),'utf8');
const files={
  theme:get('src/appearance3/useAppearance3.ts'),
  tokens:get('src/theme/palette.ts'),
  text:get('src/components/ui/BloomText.tsx'),
  input:get('src/components/ui/BloomScaledInput.tsx'),
  field:get('src/components/ui/BloomInputComponents/BloomTextInput.tsx'),
  card:get('src/components/ui/BloomPageComponents.tsx'),
  action:get('src/components/ui/BloomActionCard.tsx'),
  button:get('src/components/ui/BloomButtonComponents/BloomButton.tsx'),
  dialog:get('src/components/ui/BloomConfirmDialog.tsx'),
  modal:get('src/components/ui/BloomConfirmModal.tsx'),
  hero:get('src/components/ui/BloomHeroHeader.tsx'),
  preview:get('src/app/(internal)/appearance3-core-preview.tsx'),
  entry:get('src/app/(internal)/appearance3-lab.tsx'),
  bridge:get('src/theme/BloomAppearanceAccountBridge.tsx'),
  compiler:get('app.json'),
  sync:get('src/theme/appearanceCloudSync.ts'),
  registry:get('src/theme/bloomTypographyRegistry.ts'),
};
let pass=0;
const verify=(label,result)=>{assert.ok(result,label);console.log('PASS '+String(++pass).padStart(2,'0')+' - '+label);};
verify('Compiler stays ON in isolated trial',JSON.parse(files.compiler).expo.experiments.reactCompiler===true);
verify('Color snapshot direct from React store',files.theme.includes('useSyncExternalStore(subscribeBloomTheme, getBloomThemeSnapshot'));
verify('Typography snapshot explicitly subscribes to typography only',files.theme.includes('useSyncExternalStore(subscribeLivingTypography, getTypographySnapshot'));
verify('Optional color subscription has fixed hook order',files.theme.includes('useA3OptionalTheme(enabled: boolean)')&&files.theme.includes('useSyncExternalStore(enabled ? subscribeBloomTheme'));
verify('Text uses original typography declaration + semantic props',files.text.includes('lastSize.sourceValue')&&files.text.includes('appearanceRole')&&files.text.includes('appearanceTone'));
verify('Text and native input use current reactive typography',files.text.includes('useA3Typography()')&&files.input.includes('useA3Typography()'));
verify('Native inputs preserve forwardRef and cursor identity',files.input.includes('forwardRef<NativeTextInput')&&!files.input.includes('key={'));
verify('Card uses current theme snapshot directly',files.card.includes('const { colors } = useA3Theme();')&&files.card.includes('backgroundColor: colors.card'));
verify('Action Card memoized but depends on reactive colors',files.action.includes('memo(function BloomActionCard')&&files.action.includes('useA3Theme()'));
verify('Button colors and minimum touch height are reactive',files.button.includes('useA3Tokens()')&&files.button.includes('Math.ceil(sizes.body * 3.1)'));
verify('TextInput theme colors and size are reactive without remount',files.field.includes('useA3Tokens()')&&files.field.includes('appearanceTone="primaryText"')&&files.field.includes('useRef<TextInput>(null)'));
verify('Both product modals consume immutable token data',files.dialog.includes('useA3Theme()')&&files.modal.includes('useA3Theme()')&&files.dialog.includes('backgroundColor: colors.overlay'));
verify('Hero chooses artwork from subscribed palette',files.hero.includes('const theme = useA3Theme();')&&files.hero.includes('const palette = theme.selection.palette')&&files.hero.includes('surface: theme.colors.heroSurface')&&!files.hero.includes('HERO_CONFIG = createBloomStyles'));
verify('Live core preview exercises all six real base primitives',/BloomCard/.test(files.preview)&&/BloomTextInput/.test(files.preview)&&/BloomButton/.test(files.preview)&&/BloomConfirmModal/.test(files.preview)&&/BloomHeroHeader/.test(files.preview)&&/BloomText/.test(files.preview));
verify('Lab links to live core preview',files.entry.includes('/(internal)/appearance3-core-preview'));
verify('Core preview only switches in-memory and restores on exit',files.preview.includes('updateBloomPalette(id)')&&files.preview.includes('applyBloomSelection(originalSelection')&&!files.preview.includes('appearanceUserEdited('));
verify('Cold start account bridge still holds private UI',files.bridge.includes('isAppearanceReadyForUid(uid)'));
verify('No continuous appearance Firestore listener',!files.sync.includes('onSnapshot('));
verify('Legacy style registry preserves original declarations',files.registry.includes('sourceValue: original?.[field]'));
for (const [name,src] of Object.entries(files)) {
  if(['sync','bridge'].includes(name))continue;
  verify(`${name} appearance render performs no Firebase writes`,!/\b(setDoc|updateDoc|addDoc)\s*\(/.test(src));
}
console.log(`Appearance 3.0 Core Integration: ${pass}/${pass} PASS`);
