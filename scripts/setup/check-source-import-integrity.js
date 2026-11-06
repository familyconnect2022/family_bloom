#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const Module = require('module');

const root = path.resolve(__dirname, '../..');
const sourceRoots = ['src', 'modules/family-bloom-overlay'];
const sourceExts = ['.ts', '.tsx', '.js', '.jsx'];
const resolveExts = [
  '.android.ts', '.android.tsx', '.native.ts', '.native.tsx', '.web.ts', '.web.tsx',
  '.ts', '.tsx', '.js', '.jsx', '.json',
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.mp3', '.m4a', '.ogg', '.wav', '.aac'
];
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const declared = new Set([
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
]);
const allowedTransitive = new Set(['expo-modules-core']);
const builtins = new Set(Module.builtinModules.map((x) => x.replace(/^node:/, '')));

let files = 0;
let imports = 0;
const missing = [];
const undeclared = [];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.expo' || entry.name === 'android' || entry.name === 'ios') continue;
      walk(full, out);
    } else if (sourceExts.some((ext) => entry.name.endsWith(ext))) out.push(full);
  }
  return out;
}

function collectSpecs(text) {
  const specs = [];
  const patterns = [
    /(?:^|\n)\s*(?:import|export)\s+(?:type\s+)?[\s\S]{0,800}?\s+from\s*["']([^"']+)["']/g,
    /(?:^|\n)\s*import\s*["']([^"']+)["']/g,
    /\b(?:require|import)\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(text))) specs.push(m[1]);
  }
  return [...new Set(specs)];
}

function candidatesFor(base) {
  const result = [base];
  for (const ext of resolveExts) result.push(base + ext);
  for (const name of [
    'index.android.ts', 'index.android.tsx', 'index.native.ts', 'index.native.tsx',
    'index.web.ts', 'index.web.tsx', 'index.ts', 'index.tsx', 'index.js', 'index.jsx', 'index.json'
  ]) result.push(path.join(base, name));
  return result;
}

function resolveSource(fromFile, spec) {
  let base;
  if (spec.startsWith('@/')) base = path.join(root, 'src', spec.slice(2));
  else if (spec.startsWith('@assets/')) base = path.join(root, 'assets', spec.slice('@assets/'.length));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(fromFile), spec);
  else return true;
  return candidatesFor(base).some((p) => fs.existsSync(p) && fs.statSync(p).isFile());
}

function packageRoot(spec) {
  if (spec.startsWith('@')) return spec.split('/').slice(0, 2).join('/');
  return spec.split('/')[0];
}

for (const relRoot of sourceRoots) {
  for (const file of walk(path.join(root, relRoot))) {
    files++;
    const text = fs.readFileSync(file, 'utf8');
    for (const spec of collectSpecs(text)) {
      imports++;
      if (spec.startsWith('.') || spec.startsWith('@/') || spec.startsWith('@assets/')) {
        if (!resolveSource(file, spec)) missing.push(`${path.relative(root, file)} -> ${spec}`);
        continue;
      }
      const dep = packageRoot(spec);
      if (!declared.has(dep) && !allowedTransitive.has(dep) && !builtins.has(dep)) {
        undeclared.push(`${path.relative(root, file)} -> ${spec} (package ${dep})`);
      }
    }
  }
}

console.log(`SOURCE_IMPORT_INTEGRITY files=${files} imports=${imports}`);
if (missing.length) {
  console.error(`FAIL missing source imports (${missing.length})`);
  for (const item of missing) console.error(`  ${item}`);
}
if (undeclared.length) {
  console.error(`FAIL undeclared external packages (${undeclared.length})`);
  for (const item of undeclared) console.error(`  ${item}`);
}
if (missing.length || undeclared.length) process.exit(1);
console.log('PASS all literal source imports resolve and all external packages are declared');
