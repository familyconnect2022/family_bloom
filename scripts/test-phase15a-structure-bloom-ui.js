const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
let pass = 0;
let fail = 0;
const check = (name, ok, detail = '') => {
  if (ok) { pass += 1; console.log(`PASS ${name}`); }
  else { fail += 1; console.error(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
};

const docRootFiles = fs.readdirSync(path.join(root, 'document')).filter((name) => fs.statSync(path.join(root, 'document', name)).isFile());
check('document root only keeps README', docRootFiles.length === 1 && docRootFiles[0] === 'README.md', docRootFiles.join(', '));
check('phase 15 handoff note exists', exists('document/phases/phase-15/PHASE_15A_STRUCTURE_BLOOM_SUPPER_CONSISTENCY.md'));
check('phase 14 chess docs are grouped', exists('document/phases/phase-14/chess/PHASE_14V4P_CHESS_BOARD_LOCAL_OVERLAY_HOST.md'));

check('home routes grouped', exists('src/app/(home)/(whispers)/home-whispers.tsx') && exists('src/app/(home)/(games)/home-games.tsx'));
check('family routes grouped', exists('src/app/(family)/(graph)/family-graph.tsx') && exists('src/app/(family)/(membership)/family-gateway.tsx'));
check('activity notification routes grouped', exists('src/app/(activity)/(notifications)/notifications.tsx'));
check('old loose home route is gone', !exists('src/app/(home)/home-whispers.tsx') && !exists('src/app/(home)/home-games.tsx'));

const rootLayout = read('src/app/_layout.tsx');
const registeredStackNames = [...rootLayout.matchAll(/<Stack\.Screen\s+name="([^"]+)"/g)].map((match) => match[1]);
const missingStackTargets = registeredStackNames.filter((name) => {
  const base = path.join(root, 'src/app', name);
  return !(fs.existsSync(`${base}.tsx`) || fs.existsSync(`${base}.ts`) || fs.existsSync(base));
});
check('root Stack.Screen registrations resolve after route grouping', missingStackTargets.length === 0, missingStackTargets.join(', '));

check('data kitchen grouped', exists('src/data/kitchen/bloomRecipesV1.ts') && !exists('src/data/bloomRecipesV1.ts'));
check('data games grouped', exists('src/data/games/homeGameQuestionBank.ts') && !exists('src/data/homeGameQuestionBank.ts'));
check('data music grouped', exists('src/data/music/vietnameseMusicCatalogV2.ts') && !exists('src/data/vietnameseMusicCatalogV2.ts'));

const supper = read('src/constants/bloomSupper.ts');
check('Bloom Supper shared token exists', supper.includes('surface:') && supper.includes('modal:') && supper.includes('shadow:'));
const pageComponents = read('src/components/ui/BloomPageComponents.tsx');
check('BloomCard uses shared Supper token', pageComponents.includes('BLOOM_SUPPER.surface.card') && pageComponents.includes('BLOOM_SUPPER.radius.card'));
const toast = read('src/components/ui/BloomToast.tsx');
check('BloomToast uses shared Supper token', toast.includes('BLOOM_SUPPER'));
const confirmModal = read('src/components/ui/BloomConfirmModal.tsx');
check('BloomConfirmModal uses shared Supper token', confirmModal.includes('BLOOM_SUPPER'));
const loadingOverlay = read('src/components/ui/BloomLoadingOverlay.tsx');
check('BloomLoadingOverlay uses shared Supper token', loadingOverlay.includes('BLOOM_SUPPER.modal.backdrop'));
const datePicker = read('src/components/ui/BloomInputComponents/BloomDatePicker.tsx');
const timePicker = read('src/components/ui/BloomTimePicker.tsx');
check('date/time pickers share modal visual language', datePicker.includes('BLOOM_SUPPER.modal.backdrop') && timePicker.includes('BLOOM_SUPPER.modal.backdrop'));

const home = read('src/app/(tabs)/index.tsx');
check('Home has full Bloom Supper Hero', home.includes('<BloomHeroHeader') && home.includes('footer={') && !/\<BloomHeroHeader[\s\S]{0,250}\bcompact\b/.test(home));
check('Home feature cards use BloomCard', home.includes('<BloomCard') && home.includes('HomeFeatureCard'));

const screenContainer = read('src/components/layout/ScreenContainer.tsx');
check('ScreenContainer supports list keyboard safety', screenContainer.includes('keyboardSafe') && screenContainer.includes('KeyboardAvoidingView'));
const keyboard = read('src/components/layout/BloomKeyboardScreen.tsx');
const bloomInput = read('src/components/ui/BloomInputComponents/BloomTextInput.tsx');
check('Bloom keyboard screen measures focused input', keyboard.includes('measureInWindow') && keyboard.includes('keyboardReserve'));
check('BloomTextInput asks host to reveal focus', bloomInput.includes('useBloomKeyboardFocus') && bloomInput.includes('revealInput(inputRef.current'));
check('Android uses resize keyboard mode', read('app.json').includes('"softwareKeyboardLayoutMode": "resize"'));
check('Memory Book list screen is keyboard safe', read('src/app/(memories)/memory-book.tsx').includes('keyboardSafe'));
check('Graph relation list screen is keyboard safe', read('src/app/(family)/(graph)/family-graph-relationship-editor.tsx').includes('keyboardSafe'));

const productionFiles = [];
const walk = (dir) => {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full);
    else if (/\.tsx?$/.test(name)) productionFiles.push(full);
  }
};
walk(path.join(root, 'src/app'));
const routeInputHosts = productionFiles
  .filter((file) => !file.includes(`${path.sep}(internal)${path.sep}`))
  .map((file) => ({ file, text: fs.readFileSync(file, 'utf8') }))
  .filter(({ text }) => text.includes('BloomTextInput') && !text.includes('BloomKeyboardScreen') && !text.includes('keyboardSafe') && !text.includes('KeyboardAvoidingView'));
check('production routes with BloomTextInput have keyboard-safe host', routeInputHosts.length === 0, routeInputHosts.map((x) => path.relative(root, x.file)).join(', '));

const heroExceptions = ['src/app/(home)/(music)/home-music.tsx', 'src/app/(home)/(time-capsule)/home-time-capsule-demo.tsx'];
const userRoutesWithoutHero = productionFiles
  .filter((file) => !file.includes(`${path.sep}(internal)${path.sep}`) && path.basename(file) !== '_layout.tsx')
  .map((file) => ({ file, rel: path.relative(root, file).replace(/\\/g, '/'), text: fs.readFileSync(file, 'utf8') }))
  .filter(({ rel, text }) => !text.includes('BloomHeroHeader') && !heroExceptions.includes(rel));
check('user-facing routes use Bloom Hero or explicit exception', userRoutesWithoutHero.length === 0, userRoutesWithoutHero.map((x) => x.rel).join(', '));

const warmFiles = [
  'src/app/(tabs)/family.tsx',
  'src/app/(tabs)/planner.tsx',
  'src/app/(tabs)/moments.tsx',
  'src/app/(family)/(graph)/family-graph.tsx',
  'src/app/(family)/(graph)/family-graph-proposals.tsx',
  'src/app/(profile)/profile.tsx',
  'src/app/(chess)/chess-lobby.tsx',
  'src/app/(home)/(time-capsule)/home-time-capsules.tsx',
];
const visibleTechnical = warmFiles.flatMap((file) => {
  const text = read(file);
  const banned = ['quản trị viên', 'máy chủ cờ vua', 'document nội dung', 'đối thủ thử nghiệm'];
  return banned.filter((word) => text.toLowerCase().includes(word.toLowerCase())).map((word) => `${file}: ${word}`);
});
check('known user-facing technical copy is removed', visibleTechnical.length === 0, visibleTechnical.join('; '));


const debugBuild = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBuild = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');
check('Android build helpers use current Chess aggregate gate', debugBuild.includes('npm run chess:current-check') && releaseBuild.includes('npm run chess:current-check'));
check('obsolete Chess renderer gates no longer block Android builds',
  !debugBuild.includes('npm run phase14v4:check') && !debugBuild.includes('npm run phase14v4e:check') && !debugBuild.includes('npm run phase14v4f:check') && !debugBuild.includes('npm run phase14v4g:check') &&
  !releaseBuild.includes('npm run phase14v4:check') && !releaseBuild.includes('npm run phase14v4e:check') && !releaseBuild.includes('npm run phase14v4f:check') && !releaseBuild.includes('npm run phase14v4g:check'));

console.log(`\nPhase 15A: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
