const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(__legacyScriptsDir, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const walk = (dir) => {
  const out = [];
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(rel));
    else out.push(rel);
  }
  return out;
};
let pass = 0, fail = 0;
function check(label, condition, detail = '') {
  const n = String(pass + fail + 1).padStart(2, '0');
  if (condition) { pass++; console.log(`PASS ${n} - ${label}`); }
  else { fail++; console.log(`FAIL ${n} - ${label}${detail ? ` :: ${detail}` : ''}`); }
}

console.log('\nP2.2 — Provider Boundary / Transient Route Safety\n');

const tabRuntime = read('src/context/TabRuntimeContext.tsx');
const members = read('src/hooks/family/useFamilyMembers.ts');
const eventDetail = read('src/app/(activity)/event/[eventId].tsx');

check('TabRuntime exposes optional lifecycle effect for shared tab/transient hooks',
  tabRuntime.includes('export function useOptionalTabLiveEffect(') &&
  tabRuntime.includes('const store = useContext(TabRuntimeContext);') &&
  tabRuntime.includes('if (!store || !tabId) return;'));
check('Strict useTabLiveEffect still requires TabRuntimeProvider for actual tab-only call sites',
  tabRuntime.includes('export function useTabLiveEffect(') && tabRuntime.includes('const store = useStore();'));
check('Family members hook uses optional tab lifecycle instead of fabricating home ownership',
  members.includes('useOptionalTabLiveEffect') &&
  members.includes('useOptionalTabLiveEffect(runtimeTabId,') &&
  !members.includes('useTabLiveEffect(runtimeTabId ?? "home"'));
check('Transient member listener remains mount-scoped when runtimeTabId is absent',
  members.includes('if (!familyId || runtimeTabId) return;') && members.includes('familyService.watchMembers('));
check('Event detail still consumes shared members without a fake runtimeTabId',
  eventDetail.includes('useFamilyMembers(activeFamilyId)'));

const appFiles = walk('src/app').filter((p) => /\.(ts|tsx)$/.test(p));
const nonTabFiles = appFiles.filter((p) => !p.startsWith('src/app/(tabs)/'));
const directRuntimeOutsideTabs = nonTabFiles.filter((p) => /from\s+["'][^"']*TabRuntimeContext["']/.test(read(p)));
check('No transient route imports TabRuntimeContext directly', directRuntimeOutsideTabs.length === 0, directRuntimeOutsideTabs.join(', '));

const strictTabModules = [
  'hooks/family/useFamilyEvents',
  'hooks/family/useFamilyDashboard',
  'hooks/family/usePendingFamilyReviews',
  'hooks/moments/useFamilyMoments',
  'components/home/HomeActivityBell',
];
const strictOutside = [];
for (const p of nonTabFiles) {
  const src = read(p);
  for (const marker of strictTabModules) {
    if (src.includes(marker)) strictOutside.push(`${p} -> ${marker}`);
  }
}
check('Known strict tab-lifecycle modules are not imported by transient routes', strictOutside.length === 0, strictOutside.join(' | '));

// Dependency-chain audit: a transient route can fail even without importing TabRuntimeContext
// directly (EventDetail -> useFamilyMembers was the original regression). Walk relative
// imports recursively and reject any path that reaches a module which executes a strict
// tab-runtime hook.
const sourceFiles = [...walk('src/app'), ...walk('src/components'), ...walk('src/hooks'), ...walk('src/context'), ...walk('src/services')]
  .filter((p) => /\.(ts|tsx)$/.test(p));
const sourceSet = new Set(sourceFiles);
const importRe = /(?:from\s+|import\s*\()\s*["']([^"']+)["']/g;
function resolveRelativeImport(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null;
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), specifier));
  const candidates = [
    `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`,
    path.posix.join(base, 'index.ts'), path.posix.join(base, 'index.tsx'),
  ];
  return candidates.find((candidate) => sourceSet.has(candidate)) || null;
}
const graph = new Map();
for (const file of sourceFiles) {
  const text = read(file);
  const deps = [];
  importRe.lastIndex = 0;
  let match;
  while ((match = importRe.exec(text))) {
    const resolved = resolveRelativeImport(file, match[1]);
    if (resolved) deps.push(resolved);
  }
  graph.set(file, deps);
}
const strictCallMarkers = [
  'useTabLiveEffect(', 'useTabRuntime(', 'useTabLiveState(',
  'useTabRuntimeSnapshot(', 'useTabDirtyVersion(', 'useTabRuntimeController(',
];
const strictModules = new Set(sourceFiles.filter((file) => {
  if (file === 'src/context/TabRuntimeContext.tsx') return false;
  const text = read(file);
  return strictCallMarkers.some((marker) => text.includes(marker));
}));
const indirectViolations = [];
for (const start of nonTabFiles.filter((file) => !file.endsWith('/_layout.tsx') && file !== 'src/app/_layout.tsx' && file !== 'src/app/_layout.web.tsx')) {
  const stack = [[start, [start]]];
  const seen = new Set();
  while (stack.length) {
    const [file, chain] = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    if (strictModules.has(file)) {
      indirectViolations.push(chain.join(' -> '));
      break;
    }
    for (const dep of graph.get(file) || []) stack.push([dep, [...chain, dep]]);
  }
}
check('No transient route reaches a strict tab-runtime hook through an indirect dependency chain',
  indirectViolations.length === 0, indirectViolations.slice(0, 5).join(' | '));

const memberCallers = [
  'src/app/(activity)/event/[eventId].tsx',
  'src/app/(home)/(time-capsule)/home-time-capsule-compose.tsx',
  'src/app/(family)/(graph)/family-graph-admin.tsx',
  'src/app/(family)/(graph)/family-graph-person-editor.tsx',
  'src/app/(family)/(graph)/family-graph-proposals.tsx',
  'src/app/(family)/member/[uid].tsx',
  'src/components/familyGraph/FamilyGraphPersonSheet.tsx',
];
const missingMemberCallers = memberCallers.filter((p) => !fs.existsSync(path.join(root, p)) || !read(p).includes('useFamilyMembers('));
check('All known transient/shared member consumers remain covered by the safe hook', missingMemberCallers.length === 0, missingMemberCallers.join(', '));

const syntaxFiles = [
  'src/context/TabRuntimeContext.tsx',
  'src/hooks/family/useFamilyMembers.ts',
  ...memberCallers,
];
const syntaxErrors = [];
for (const file of syntaxFiles) {
  const output = ts.transpileModule(read(file), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
    reportDiagnostics: true,
    fileName: file,
  });
  for (const diagnostic of output.diagnostics || []) {
    if (diagnostic.category === ts.DiagnosticCategory.Error) syntaxErrors.push(`${file}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`);
  }
}
check(`Provider-boundary files transpile clean (${syntaxFiles.length})`, syntaxErrors.length === 0, syntaxErrors.slice(0, 4).join(' | '));

const pkg = JSON.parse(read('package.json'));
check('P2.2 gate is registered in package scripts', pkg.scripts?.['phaseP2_2:check'] === 'node ./scripts/tests/history/test-phase-p2_2-provider-boundary-route-safety.js');
check('P2.2 gate runs in post-copy updater', read('scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat').includes('test-phase-p2_2-provider-boundary-route-safety.js'));
check('P2.2 gate runs in Android Debug build', read('scripts/android/dev/Family_Bloom_Android_Debug_Build_And_Run.bat').includes('phaseP2_2:check'));
check('P2.2 gate runs in Android Release build', read('scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat').includes('phaseP2_2:check'));

console.log(`\nFamily Bloom P2.2 Provider Boundary Route Safety: ${pass}/${pass + fail} PASS`);
process.exit(fail ? 1 : 0);
