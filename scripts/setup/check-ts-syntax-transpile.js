#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
let ts;
try { ts = require('typescript'); }
catch (error) {
  console.error('FAIL TypeScript package is not installed; run npm install before syntax transpile gate');
  process.exit(1);
}
const root = path.resolve(__dirname, '../..');
const roots = ['src', 'modules/family-bloom-overlay'];
let total = 0;
let failed = 0;
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.expo', 'ios'].includes(entry.name)) continue;
      if (entry.name === 'android' && !full.includes(path.join('modules', 'family-bloom-overlay', 'android'))) continue;
      walk(full);
      continue;
    }
    if (!/\.(?:ts|tsx)$/.test(entry.name)) continue;
    total++;
    const source = fs.readFileSync(full, 'utf8');
    const output = ts.transpileModule(source, {
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
      fileName: full,
      reportDiagnostics: true,
    });
    const diagnostics = (output.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error);
    if (diagnostics.length) {
      failed++;
      console.error(`FAIL ${path.relative(root, full)}`);
      for (const d of diagnostics) console.error(`  ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
    }
  }
}
for (const rel of roots) walk(path.join(root, rel));
if (failed) {
  console.error(`FAIL TS/TSX syntax transpile: ${failed}/${total} file(s) failed`);
  process.exit(1);
}
console.log(`PASS TS/TSX syntax transpile: ${total}/${total} files`);
