const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const checks=[]; const expect=(c,l)=>checks.push({ok:!!c,label:l});
const hero=read('src/components/ui/BloomHeroHeader.tsx');
const input=read('src/components/ui/BloomInputComponents/BloomTextInput.tsx');
const login=read('src/app/(auth)/login.tsx');
const home=read('src/app/(tabs)/index.tsx');
const family=read('src/app/(tabs)/family.tsx');
const graph=read('src/app/family-graph.tsx');
const bootstrap=read('src/components/system/BloomAppBootstrap.tsx');
expect(hero.includes('| "auth"') && hero.includes('login-family-icon.png'), 'Hero system supports a purpose-aware image-led auth motif');
expect(hero.includes('width: "100%"') && hero.includes('alignSelf: "stretch"'), 'Hero is full-width instead of card-like');
expect(input.includes('outputRange: [COLORS.white, "#FFFBFC"]') && input.includes('borderWidth: 1.7'), 'Common inputs use a crisp high-contrast editable surface');
expect(login.includes('variant="auth"') && login.includes('Một nơi để nhà mình luôn gần nhau'), 'Login uses the Bloom illustrated hero language');
expect(home.includes('<BloomHeroHeader') && home.includes('variant="family"'), 'Home uses the same visual language');
expect(family.includes('title="Phả hệ gia đình"') && family.includes('title="Khám phá cây nhà"'), 'Family tab keeps one page title and a distinct genealogy section title');
expect(!graph.includes('<BloomStickyHeader') && graph.includes('<BloomHeroHeader') && graph.includes('onBack={() => router.back()}') && graph.includes('headerMode="controls"'), 'Family Graph removes duplicate sticky title/add controls and uses one purpose-aware hero with Back');
expect(bootstrap.includes('login-family-icon.png') && bootstrap.includes('Nhà mình đang nở hoa'), 'App bootstrap is image-led and emotionally warm');
const failed=checks.filter(x=>!x.ok); for(const x of checks) console.log(`${x.ok?'PASS':'FAIL'} | ${x.label}`); if(failed.length){console.error(`\
Phase 12 visual system contract failed: ${failed.length}/${checks.length}`); process.exit(1);} console.log(`\
Phase 12 visual system contract PASS: ${checks.length}/${checks.length}`);
