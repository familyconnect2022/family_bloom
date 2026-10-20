#!/usr/bin/env node
'use strict';
// H23R1: Static Expo Router duplicate declaration guard.
// Expo Router throws during initial render when one navigator declares a route twice.
// Keep this independent of node_modules so preflight can run before install.
const fs = require('node:fs');
const path = require('node:path');

function layoutFiles(dir) {
  if (!fs.existsSync(dir)) throw new Error(`Missing app directory: ${dir}`);
  const files = [];
  for (const child of fs.readdirSync(dir, { withFileTypes: true })) {
    if (child.name.startsWith('.')) continue;
    const target = path.join(dir, child.name);
    if (child.isDirectory()) files.push(...layoutFiles(target));
    else if (child.isFile() && /^_layout\.[jt]sx?$/.test(child.name)) files.push(target);
  }
  return files;
}

function duplicatesInLayout(contents, file = '_layout.tsx') {
  // Each Stack/Tabs screen declaration must have a unique literal name within its layout.
  // Not across different layouts, where local names are expected to repeat.
  const matches = /<(Stack|Tabs|Drawer)\.Screen\b[^>]*?\bname\s*=\s*["']([^"']+)["']/gms;
  const seen = new Map();
  const errors = [];
  for (const m of contents.matchAll(matches)) {
    const type = m[1], name = m[2];
    const line = contents.slice(0, m.index).split('\n').length;
    const key = `${type}:${name}`;
    const original = seen.get(key);
    if (original) errors.push(`${file}:${line} duplicates <${type}.Screen name="${name}"> first declared at line ${original}`);
    else seen.set(key, line);
  }
  return errors;
}

function checkAppRoutes(projectRoot) {
  const dir = path.join(projectRoot, 'src', 'app');
  const files = layoutFiles(dir);
  if (!files.length) throw new Error(`No Expo Router layouts found in ${dir}`);
  const problems = files.flatMap(file => duplicatesInLayout(fs.readFileSync(file, 'utf8'), path.relative(projectRoot, file).replace(/\\/g, '/')));
  return { problems, layouts: files.length };
}

function assertUniqueRoutes(root) {
  const result = checkAppRoutes(root);
  if (result.problems.length) {
    for (const issue of result.problems) console.error('FAIL EXPO ROUTER: ' + issue);
    throw new Error(`Expo Router has ${result.problems.length} duplicate screen declaration(s). Do NOT launch Metro or build.`);
  }
  console.log(`PASS Expo Router: ${result.layouts} layouts checked, no duplicate Stack/Tabs/Drawer names`);
  return result;
}
module.exports = { duplicatesInLayout, checkAppRoutes, assertUniqueRoutes };
if (require.main === module) {
  try { assertUniqueRoutes(path.resolve(__dirname, '..', '..')); }
  catch (e) { console.error('FAIL route:check:', e.message); process.exitCode = 1; }
}
