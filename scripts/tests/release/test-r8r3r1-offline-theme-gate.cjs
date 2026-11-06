#!/usr/bin/env node
'use strict';
/** Source-only regression proving the updater gate runs WITHOUT node_modules.
 * Temporary fixture only: never mutates the developer's project or settings.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'family-bloom-theme-offline-'));
const files = [
  'scripts/tests/release/test-r8r3-theme-system.cjs',
  'src/theme/palette.ts', 'src/theme/runtime.ts',
  'src/theme/BloomThemeProvider.tsx', 'src/theme/appearanceCloudSync.ts', 'src/theme/createBloomStyles.ts',
  'src/app/_layout.tsx', 'src/app/session-gate.tsx', 'src/app/(profile)/settings.tsx',
  'src/components/ui/BloomThemeSettingsPanel.tsx',
  'src/constants/bloomSupper.ts', 'src/components/ui/BloomToast.tsx',
  'src/features/study/StudyFormula.tsx',
  'src/features/study/StudyFormulaEditor.tsx',
  'src/app/(tabs)/_layout.tsx',
];
const copy = rel => {
  const target=path.join(temp,rel);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.copyFileSync(path.join(root,rel),target);
};
function check() {
  const cmd=path.join(temp,'scripts/tests/release/test-r8r3-theme-system.cjs');
  return spawnSync(process.execPath,[cmd],{
    cwd:temp, encoding:'utf8', timeout:30000,
    env:{...process.env,NODE_PATH:'',NODE_OPTIONS:''}
  });
}
try {
  files.forEach(copy);
  assert(!fs.existsSync(path.join(temp,'node_modules')), 'Fixture must contain NO dependencies');
  const clean=check();
  assert.equal(clean.status,0,`Theme gate must run offline: ${clean.stderr}\n${clean.stdout}`);
  assert(clean.stdout.includes('22/22 PASS'), 'Real behavior and contrast assertions must run');
  console.log('PASS offline Node-only Theme gate (22 dynamic/static assertions, no dependencies)');
  const palette=path.join(temp,'src/theme/palette.ts');
  const original=fs.readFileSync(palette,'utf8');
  assert(original.includes("surface: '#FFFFFF'"),'Expected default Rose seed');
  fs.writeFileSync(palette,original.replace("surface: '#FFFFFF'", "surface: '#000000'"));
  const wrong=check();
  assert.notEqual(wrong.status,0,'Tampered Rose surface must fail closed');
  console.log('PASS wrong card surface rejected (no silent bypass)');
  fs.writeFileSync(palette,original+'\nexport const intentionallyInvalid = ;\n');
  const broken=check();
  assert.notEqual(broken.status,0,'Broken TS source must fail closed');
  console.log('PASS malformed TypeScript rejected without external parser');
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}
console.log('R8R3R1 offline preflight regression: 3/3 PASS');
