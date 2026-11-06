/** Screenshot follow-up: semantic font picker and card-icon theme regression.
 * No Firebase, simulator, node_modules or backend access needed.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const provider = read('src/theme/BloomThemeProvider.tsx');
const panel = read('src/components/ui/BloomLivingAppearancePanel.tsx');
const fund = read('src/app/(home)/(fund)/home-fund.tsx');
const moments = read('src/app/(tabs)/moments.tsx');
let passed = 0;
function check(label, assertion) {
  assert.ok(assertion, label);
  passed++;
  console.log(`PASS ${String(passed).padStart(2,'0')} - ${label}`);
}
check('Font UI subscribes to immutable preferences, not discarded revision',
  provider.includes('useSyncExternalStore(subscribeLivingAppearance, getLivingAppearance, getLivingAppearance)') &&
  !provider.includes('useSyncExternalStore(subscribeLivingAppearance, getLivingAppearanceRevision'));
check('Every font option previews its OWN family, independent of selected UI font',
  panel.includes('fontFamily: getLivingFontFamily(item.id)') && panel.includes('getLivingLetterSpacing(item.id)') &&
  panel.includes('>{item.example}</NativeText>'));
check('Font preview grows with displayed percentage',
  panel.includes('fontScale / 100') && panel.includes('fontSize: sampleSize'));
check('Accessibility reads current selection and presets',
  panel.includes('accessibilityState={{ checked: font === item.id }}') &&
  panel.includes('accessibilityState={{checked: fontScale === size}}') &&
  panel.includes('setFontScale(size)'));
check('Font/motion changes are explicit user actions only',
  panel.includes('onPress={() => setFont(item.id)}') &&
  panel.includes('onPress={() => setFontScale(size)}') &&
  !panel.includes('setDoc(') && !panel.includes('appearanceUserEdited('));
check('Moment family-strip decorative icon uses theme primary',
  moments.includes('name="images-outline" size={22} color={__a3Colors.primary}') &&
  moments.includes('backgroundColor: COLORS.iconBackground'));
check('Fund ordinary wallet/shield/info icons use theme primary',
  fund.includes('name="wallet" size={27} color={__a3Colors.primary}') &&
  fund.includes('name="shield-checkmark" size={24} color={__a3Colors.primary}') &&
  fund.includes('name="information-circle-outline" size={20} color={__a3Colors.primary}'));
check('Fund income remains positive and expense remains separate',
  fund.includes('typeIncomeText: { color: COLORS.positive }') &&
  fund.includes('typeExpenseText: { color: COLORS.primary }'));
check('Fund primary CTA has contrast on both enabled/disabled states',
  fund.includes('primaryAction: { minHeight: 50, borderRadius: 18, backgroundColor: COLORS.primary,') &&
  fund.includes('isFundTeam ? __a3Colors.onPrimary : __a3Colors.secondaryText') &&
  fund.includes('!isFundTeam && {color: __a3Colors.secondaryText}'));
console.log(`Appearance font/card screenshot gate: ${passed}/${passed} PASS`);
