#!/usr/bin/env node
'use strict';
// H21R6: prevent the exact Render TS2322 public preparation phase regression.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');
const original = read('server/src/chess/chessTypes.ts');
const manager = read('server/src/chess/chessGameManager.ts');
const serverPkg = JSON.parse(read('server/package.json'));
const clean = read('scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat');
const buildShare = read('scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat');
const buildApk = read('scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat');
const gate = read('scripts/android/maintenance/Family_Bloom_VERIFY_SERVER_TYPES.bat');
let pass = 0;
const ok = (label, fn) => { fn(); console.log(`PASS ${label}`); pass++; };
function typeDiagnostics(source) {
  const file = path.join(os.tmpdir(), 'familybloom_h21r6_preparation_typecheck.ts');
  const content = `${source}\nconst publicPhase: PublicGameState['preparationPhase'] = 'play';\nconst waitingPhase: PersistedGame['preparationPhase'] = 'colors';\n`;
  const defaultHost = ts.createCompilerHost({noEmit:true,strict:true,target:ts.ScriptTarget.ES2022,skipLibCheck:true});
  const canonical = path.resolve(file);
  const get = defaultHost.getSourceFile.bind(defaultHost);
  defaultHost.getSourceFile = (name, languageVersion, onError, shouldCreateNewSourceFile) =>
    path.resolve(name) === canonical
      ? ts.createSourceFile(name, content, languageVersion)
      : get(name,languageVersion,onError,shouldCreateNewSourceFile);
  const exists = defaultHost.fileExists.bind(defaultHost);
  defaultHost.fileExists = (name) => path.resolve(name)===canonical || exists(name);
  const program = ts.createProgram([canonical], {noEmit:true,strict:true,target:ts.ScriptTarget.ES2022,skipLibCheck:true}, defaultHost);
  return ts.getPreEmitDiagnostics(program).filter(d=>d.category===ts.DiagnosticCategory.Error);
}
ok('PublicGameState permits play but PersistedGame retains only waiting phases', () => {
  const errors = typeDiagnostics(original);
  assert.equal(errors.length, 0, errors.map(e=>ts.flattenDiagnosticMessageText(e.messageText, ' ')).join('; '));
  assert(original.includes('"updatedAt" | "preparationPhase">'));
  assert(original.includes('preparationPhase: "board" | "colors" | "play"'));
});
ok('Original H21R5 union conflict is detected by real TypeScript semantic checking', () => {
  const broken = original.replace('"updatedAt" | "preparationPhase">', '"updatedAt">');
  const errors = typeDiagnostics(broken);
  assert(errors.some(e=>e.code===2322 && /play/.test(ts.flattenDiagnosticMessageText(e.messageText,' '))),
    errors.map(e=>`TS${e.code}: ${ts.flattenDiagnosticMessageText(e.messageText, ' ')}`).join('\n'));
});
ok('publicState emits play only after waiting states', () => {
  assert(manager.includes('preparationPhase: r.game.status === "waiting" ? (r.game.preparationPhase ?? "board") : "play"'));
});
ok('Render build calls server typecheck before TypeScript emit', () => {
  assert(serverPkg.scripts.build.startsWith('npm run typecheck && '));
  assert(serverPkg.scripts.typecheck.includes('--noEmit'));
});
ok('Server TypeScript preflight blocks failures', () => {
  assert(gate.includes('call npm run typecheck\nif errorlevel 1 ('));
  assert(gate.includes('exit /b 1'));
  assert(gate.includes('npm install --include=dev'));
});
ok('CLEAN APPLY invokes strict server preflight before reporting success', () => {
  assert(clean.includes('Family_Bloom_VERIFY_SERVER_TYPES.bat"\nif errorlevel 1 goto :fail'));
  assert(!clean.includes('Server TypeScript diagnostics were reported. CLEAN APPLY continues'));
});
ok('Build & Share and direct Release build invoke server preflight', () => {
  for(const bat of [buildShare,buildApk]) {
    assert(bat.includes('Family_Bloom_VERIFY_SERVER_TYPES.bat"\nif errorlevel 1 goto :fail'));
  }
});
console.log(`H21R6 Render server TS gate ${pass}/${pass} PASS`);
