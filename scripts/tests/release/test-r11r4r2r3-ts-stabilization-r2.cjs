#!/usr/bin/env node
'use strict';
// R3 TS Stabilization R2 regression: checks only the exact fixes evidenced in the 2026-11-09 log.
// This gate does not replace npm run typecheck, which is mandatory in Release BAT.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const checked = [];
function walk(dir) {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir,d.name);
    if (d.isDirectory()) walk(full);
    else if (/\.tsx$/.test(d.name)) {
      const src=fs.readFileSync(full,'utf8');
      for (const match of src.matchAll(/<StatusBar\b[^>]*?>/gs)) {
        if (/\b(?:backgroundColor|translucent)\s*=/.test(match[0])) {
          throw new Error('Unsupported expo-status-bar prop in '+path.relative(root,full));
        }
      }
      checked.push(full);
    }
  }
}
walk(path.join(root,'src'));
const questions=fs.readFileSync(path.join(root,'src/app/(home)/(learning)/study-questions.tsx'),'utf8');
if (!questions.includes('cursorRef=useRef<any>(undefined)')) throw new Error('React 19 useRef initializer was removed');
const diag=fs.readFileSync(path.join(root,'src/diagnostics/sessionDiagnostics.ts'),'utf8');
if (!diag.includes('width: number;') || !diag.includes('height: number;') ||
  !diag.includes('Number.isFinite(detail.width)') || !diag.includes('Number.isFinite(detail.height)')) {
  throw new Error('Safe geometry diagnostic schema regression');
}
for (const bat of ['Family_Bloom_Android_Release_Build_APK_And_Share.bat','Family_Bloom_Android_Test_App_RELEASE.bat']) {
  const src=fs.readFileSync(path.join(root,'scripts/android/build',bat),'utf8');
  if (!src.includes('call npm run typecheck')) throw new Error('Missing mandatory Release TS gate in '+bat);
}
console.log('[PASS] R3 TS Stabilization R2 source gate:',checked.length,'TSX files, React ref, Welcome telemetry and both Release BAT gates');
