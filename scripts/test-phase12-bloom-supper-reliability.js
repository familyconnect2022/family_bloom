const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const checks = [];
const expect = (condition, label) => checks.push({ ok: !!condition, label });

const hero = read('src/components/ui/BloomHeroHeader.tsx');
const layout = read('src/app/_layout.tsx');
const dialogProvider = read('src/components/ui/BloomDialogProvider.tsx');
const graphRoute = read('src/app/(family)/(graph)/family-graph.tsx');
const graph = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
const theme = read('src/constants/theme.ts');
const sharedInput = read('src/components/ui/BloomInputComponents/shared.ts');
const textInput = read('src/components/ui/BloomInputComponents/BloomTextInput.tsx');
const momentQueue = read('src/context/MomentPublishContext.tsx');
const auth = read('src/context/AuthContext.tsx');

expect(exists('assets/images/bloom-supper/event-hero-art.png') && exists('assets/images/bloom-supper/moment-hero-art.png'), 'Bloom Supper Event/Moment hero artwork is packaged');
expect(exists('assets/images/bloom-supper/tree-hero-art.png') && exists('assets/images/bloom-supper/family-hero-art.png'), 'Bloom Supper Tree/Family hero artwork is packaged');
expect(hero.includes('variant === "event"') && hero.includes('<EventIllustration />') && hero.includes('variant === "tree"') && hero.includes('<TreeIllustration />'), 'Purpose-aware hero renders clean native illustrations without embedded screenshot typography');
expect(hero.includes('width: "100%"') && hero.includes('paddingTop: Math.max(insets.top, 8) + 10'), 'Hero owns full width and status-bar safe area');
expect(layout.includes('<BloomDialogProvider>') && dialogProvider.includes('BloomConfirmDialog'), 'Global Bloom-styled dialog layer is mounted');

const srcRoot = path.join(root, 'src');
const stack = [srcRoot];
let nativeAlertFiles = [];
while (stack.length) {
  const current = stack.pop();
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) stack.push(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) {
      const text = fs.readFileSync(full, 'utf8');
      if (/\bAlert\.alert\s*\(/.test(text)) nativeAlertFiles.push(path.relative(root, full));
    }
  }
}
expect(nativeAlertFiles.length === 0, `No product Alert.alert remains${nativeAlertFiles.length ? ` (${nativeAlertFiles.join(', ')})` : ''}`);

expect(graphRoute.includes('<BloomHeroHeader') && graphRoute.includes('variant="tree"') && graphRoute.includes('headerMode="controls"'), 'Family Graph uses a single tree hero plus controls-only graph header');
expect(graph.includes('paddingHorizontal: 18') && graph.includes('marginHorizontal: 18') && graph.includes('marginHorizontal: 8'), 'Family Graph controls/banner/viewport keep edge padding');
expect(theme.includes("inputSurfaceFocus: '#FFFDFE'") && theme.includes("inputBorder: '#DDA6BA'") && theme.includes("inputBorderFocus: '#DA668C'"), 'Shared input palette has stronger contrast');
expect(sharedInput.includes('softSurface: "#FFFFFF"') && sharedInput.includes('border: "#DDA6BA"') && textInput.includes('borderWidth: 1.7') && textInput.includes('shadowOpacity: 0.10'), 'Shared editable surfaces have visible borders and depth');

expect(momentQueue.includes('pendingRef.current.find((item) => item.localId === localId)') && momentQueue.includes('pendingRef.current = next'), 'Moment retry reads/writes the immediate task ref to avoid stale retry state');
expect(momentQueue.includes('}, 900);') && momentQueue.includes('Android can report ACTIVE'), 'Foreground reconnect retry includes an Android network grace period');
expect(momentQueue.includes('uploadedFiles') && momentQueue.includes('momentResumeProgress'), 'Moment retry preserves resumable upload checkpoints');

const switchBlock = auth.slice(auth.indexOf('const switchFamily = useCallback'), auth.indexOf('const completeFamilyTransition'));
expect(switchBlock.includes('setFamilyTransition({') && switchBlock.indexOf('setFamilyTransition({') < switchBlock.indexOf('familyService.switchActiveFamily'), 'Family-switch transition starts before async membership verification');
expect(exists('scripts/test-phase11-final-performance-gate.js'), 'Phase 11 Final Performance Gate remains available as a regression guard');

const failed = checks.filter((x) => !x.ok);
for (const x of checks) console.log(`${x.ok ? 'PASS' : 'FAIL'} | ${x.label}`);
if (failed.length) {
  console.error(`\nPhase 12 Bloom Supper + Reliability contract failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`\nPhase 12 Bloom Supper + Reliability contract PASS: ${checks.length}/${checks.length}`);
