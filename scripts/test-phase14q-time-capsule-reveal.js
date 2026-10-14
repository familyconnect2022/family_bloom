const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
const check = (name, ok) => checks.push({ name, ok: !!ok });

const play = read('src/app/(tabs)/play.tsx');
const route = read('src/app/(home)/(time-capsule)/home-time-capsule-demo.tsx');
const reveal = read('src/features/home/timeCapsule/TimeCapsuleRevealPrototype.tsx');
const pkg = JSON.parse(read('package.json'));

check('route exists', route.includes('TimeCapsuleRevealPrototype'));
check('hub entry exists', play.includes('title="Hộp thời gian"') && (play.includes('/home-time-capsules') || play.includes('/home-time-capsule-demo')));
check('hub names all three reveal themes', play.includes('Ấm áp') && play.includes('Trang trọng') && play.includes('Rộn ràng'));
check('music panel removed from visible hub', !play.includes('<HomeMusicPanel'));
check('music source left intact', fs.existsSync(path.join(root, 'src/features/home/music/HomeMusicPanel.tsx')));
check('reanimated used', reveal.includes('react-native-reanimated') && reveal.includes('useSharedValue'));
check('haptics used', reveal.includes('expo-haptics') && reveal.includes('impactAsync'));
check('three theme keys exist', reveal.includes('warm: {') && reveal.includes('formal: {') && reveal.includes('festive: {'));
check('Vietnamese theme names exist', reveal.includes('label: "Ấm áp"') && reveal.includes('label: "Trang trọng"') && reveal.includes('label: "Rộn ràng"'));
check('warm remains default', reveal.includes('initialThemeKey = "warm"') && reveal.includes('useState<ThemeKey>(initialThemeKey)'));
check('formal palette is blue-led', reveal.includes('night: "#071423"') && reveal.includes('boxFront: "#3F79B8"') && reveal.includes('accentDeep: "#3978C5"'));
check('festive palette is pale-yellow plus pink', reveal.includes('boxTop: "#F5D987"') && reveal.includes('ribbon: "#F5A9B5"') && reveal.includes('button: "#F5D47D"'));
check('warm palette preserved', reveal.includes('boxTop: "#F4C2C2"') && reveal.includes('accentDeep: "#DB6F8D"'));
check('theme picker exists', reveal.includes('styles.themePicker') && reveal.includes('selectTheme(key)'));
check('theme cannot switch mid-animation', reveal.includes('if (running || next === themeKey) return'));
check('each theme owns motion timing', reveal.includes('duration: 2550') && reveal.includes('duration: 2850') && reveal.includes('duration: 2350'));
check('formal motion has no letter overshoot', reveal.includes('letterOvershoot: 1.0'));
check('festive motion has stronger pop', reveal.includes('letterOvershoot: 1.085') && reveal.includes('lidRotate: -7'));
check('formal particles are restrained', reveal.includes('FORMAL_PARTICLES') && (reveal.match(/const FORMAL_PARTICLES[\s\S]*?const FESTIVE_PARTICLES/) || [''])[0].match(/kind: "spark"/g)?.length === 8);
check('festive particles include confetti', reveal.includes('FESTIVE_PARTICLES') && reveal.includes('kind: "confetti"'));
check('particle sets remain bounded', ((reveal.match(/const FESTIVE_PARTICLES[\s\S]*?export const TIME_CAPSULE_REVEAL_THEMES/) || [''])[0].match(/kind: "/g) || []).length <= 14);
check('single UI-thread timeline remains', reveal.includes('withTiming(1') && reveal.includes('Easing.linear'));
check('old 3D lid path remains removed', !reveal.includes('rotateX') && !reveal.includes('perspective:'));
check('layered halo remains', reveal.includes('haloOuter') && reveal.includes('haloMiddle') && reveal.includes('haloInner') && reveal.includes('coreGlow'));
check('letter still waits for opening beat', reveal.includes('const start = theme.motion.letterStart') && reveal.includes('opacity: interpolate'));
check('letter still starts at exact scale zero', reveal.includes('[0, 0, 0.05, 0.4, 0.92, theme.motion.letterOvershoot, 1, 1]'));
check('letter remains in front of box', reveal.includes('maxWidth: 370, zIndex: 32') && reveal.includes('marginTop: 76, zIndex: 21'));
check('premium box layers remain', reveal.includes('lidUnderside') && reveal.includes('boxBodyBackLip') && reveal.includes('boxSideShade') && reveal.includes('boxBottomShade'));
check('theme-specific seal icon exists', reveal.includes('sealIcon: "flower"') && reveal.includes('sealIcon: "diamond-outline"') && reveal.includes('sealIcon: "star"'));
check('theme-specific copy exists', reveal.includes('THÔNG ĐIỆP QUAN TRỌNG') && reveal.includes('TIN VUI ĐÃ ĐẾN'));
check('waited-days emotional line exists', reveal.includes('Lời này đã chờ') && reveal.includes('waitedDays'));
check('replay exists', reveal.includes('Xem lại hiệu ứng') && reveal.includes('reset'));
check('prototype does not import firestore', !reveal.includes('firestore') && !route.includes('firestore'));
check('no new animation dependency required', !!pkg.dependencies['react-native-reanimated'] && !!pkg.dependencies['expo-haptics']);

let failed = 0;
for (const item of checks) {
  console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}`);
  if (!item.ok) failed++;
}
console.log(`Phase14Q V2.2 checks: ${checks.length - failed} PASS / ${failed} FAIL`);
process.exitCode = failed ? 1 : 0;
