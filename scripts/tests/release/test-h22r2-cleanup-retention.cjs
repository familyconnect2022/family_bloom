#!/usr/bin/env node
'use strict';
const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
// H22R2 release gate: reproduce the actual post-overlay cleanup in an isolated
// temporary mini-project. Do not ever run that mutating script on production
// source during this test. Check both real package contents and cleanup result.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__legacyScriptsDir, '..');
const critical = [
  'src/services/xiangqi/xiangqiLocalRules.ts',
  'src/services/xiangqi/xiangqiSocketService.ts',
  'src/types/xiangqiRealtime.ts',
  'src/services/games/nativeXiangqiGameplayController.ts',
  'src/components/games/XiangqiChallengeGate.tsx',
  'src/components/games/XiangqiSessionRecoveryGate.tsx',
  'src/components/games/BoardGamePresentationRoot.android.tsx',
  'server/src/xiangqi/xiangqiGameManager.ts',
  'server/src/xiangqi/xiangqiSocket.ts',
  'scripts/tests/release/test-h22-xiangqi-parity.cjs',
];
const file = (base, rel) => path.join(base, ...rel.split('/'));
function checkSource() {
  const missing = critical.filter(rel=>!fs.existsSync(file(root,rel)));
  if (missing.length) {
    throw new Error(`H22R2 FULL SOURCE INCOMPLETE after copy/cleanup:\n${missing.map(x=>`  MISSING ${x}`).join('\n')}\nRe-extract the FULL ZIP and COPY ALL files into the project before running CLEAN APPLY or Build & Share.`);
  }
  console.log(`PASS H22R2 source completeness (${critical.length} required files)`);
}
function checkCleanup() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'family-bloom-h22r2-cleanup-'));
  try {
    const dir = file(temp, 'scripts/setup');
    fs.mkdirSync(dir,{recursive:true});
    fs.copyFileSync(file(root,'scripts/setup/cleanup-overlay-routes.js'),file(temp,'scripts/setup/cleanup-overlay-routes.js'));
    const preserved = [
      'src/services/xiangqi/xiangqiLocalRules.ts',
      'src/services/xiangqi/xiangqiSocketService.ts',
      'src/services/chess/chessSocketService.ts',
      'src/services/xiangqi/brandNewRulesInFuture.ts',
      'src/services/chess/chessNewServiceInFuture.ts',
    ];
    const retired = [
      'src/services/xiangqi/xiangqiSessionBootstrap.ts',
      'src/services/xiangqi/xiangqiSurfaceStore.ts',
      'src/services/chess/chessSurfaceStore.ts',
    ];
    for (const rel of [...preserved,...retired]) {
      const full = file(temp,rel);
      fs.mkdirSync(path.dirname(full),{recursive:true});
      fs.writeFileSync(full, `H22R2 fixture ${rel}\n`);
    }
    const cleanup = file(temp, 'scripts/setup/cleanup-overlay-routes.js');
    for(let i=0;i<2;i++){
      const result = spawnSync(process.execPath,[cleanup],{cwd:temp,encoding:'utf8',timeout:15000});
      assert.equal(result.status,0,`cleanup pass ${i+1} failed: ${result.stdout}\n${result.stderr}`);
      for(const rel of preserved)assert(fs.existsSync(file(temp,rel)),`cleanup unexpectedly DELETED a live source file: ${rel}`);
      for(const rel of retired)assert(!fs.existsSync(file(temp,rel)),`cleanup failed to retire old source: ${rel}`);
    }
    console.log('PASS H22R2 actual cleanup execution (2 passes), live rules/socket retained and obsolete sources removed');
  } finally {
    fs.rmSync(temp,{recursive:true,force:true});
  }
}
try {
  checkSource();
  if (!process.argv.includes('--quick')) checkCleanup();
  console.log('H22R2 safe source retention: PASS');
} catch(err) {
  console.error('[FAIL H22R2 SOURCE SAFE]',err.message);
  process.exitCode=1;
}
