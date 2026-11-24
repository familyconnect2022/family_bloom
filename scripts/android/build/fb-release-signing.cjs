#!/usr/bin/env node
'use strict';

// Family Bloom U1R3R2 — fail-closed Release signing for Expo-generated Gradle.
// No passwords, keystore bytes or developer-specific paths enter source files.
const fs = require('node:fs');
const path = require('node:path');

const MARKER = '// FAMILY_BLOOM_U1R3R2_RELEASE_SIGNING';
const NAMES = [
  'FB_RELEASE_KEYSTORE_PATH',
  'FB_RELEASE_STORE_PASSWORD',
  'FB_RELEASE_KEY_ALIAS',
  'FB_RELEASE_KEY_PASSWORD',
];

function invariant(condition, message) {
  if (!condition) throw new Error(`SAFE STOP: ${message}`);
}

function checkCredentials(root, env = process.env) {
  for (const name of NAMES) invariant(typeof env[name] === 'string' && env[name].trim(), `${name} is missing`);
  const keyPath = env.FB_RELEASE_KEYSTORE_PATH;
  invariant(path.isAbsolute(keyPath) || path.win32.isAbsolute(keyPath), 'Keystore path must be absolute');
  invariant(/\.(jks|keystore)$/i.test(keyPath), 'Keystore must be a .jks or .keystore file');
  invariant(/^[a-zA-Z0-9_.-]+$/.test(env.FB_RELEASE_KEY_ALIAS), 'Key alias contains unexpected characters');
  invariant(fs.existsSync(keyPath) && fs.statSync(keyPath).isFile(), 'Release keystore file does not exist');
  // The key must never be under the project or be included in FULL CODE / Git.
  const realKey = fs.realpathSync(keyPath);
  const realRoot = fs.realpathSync(root);
  const rel = path.relative(realRoot, realKey);
  invariant(rel === '..' || (rel !== '' && rel.startsWith(`..${path.sep}`)) || path.isAbsolute(rel),
    'Release keystore must be outside the Android source directory');
  return { keyPath: realKey, alias: env.FB_RELEASE_KEY_ALIAS };
}

function findBlock(source, blockName, regionStart = 0, regionEnd = source.length) {
  const region = source.slice(regionStart, regionEnd);
  const expression = new RegExp(`\\b${blockName}\\s*\\{`, 'g');
  const matches = [...region.matchAll(expression)];
  invariant(matches.length === 1, `Expected exactly one ${blockName} block; found ${matches.length}`);
  const at = regionStart + matches[0].index;
  const opening = at + matches[0][0].lastIndexOf('{');
  let depth = 0;
  let quote = null;
  let lineComment = false;
  let blockComment = false;
  for (let i = opening; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];
    if (lineComment) { if (char === '\n') lineComment = false; continue; }
    if (blockComment) { if (char === '*' && next === '/') { blockComment = false; i += 1; } continue; }
    if (quote) { if (char === '\\') { i += 1; continue; } if (char === quote) quote = null; continue; }
    if (char === '/' && next === '/') { lineComment = true; i += 1; continue; }
    if (char === '/' && next === '*') { blockComment = true; i += 1; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        invariant(i < regionEnd, `${blockName} extends outside expected region`);
        return { opening, closing: i };
      }
    }
  }
  throw new Error(`SAFE STOP: Unterminated ${blockName} block`);
}

const RELEASE_CONFIG = `
        ${MARKER}
        release {
            storeFile file(System.getenv('FB_RELEASE_KEYSTORE_PATH'))
            storePassword System.getenv('FB_RELEASE_STORE_PASSWORD')
            keyAlias System.getenv('FB_RELEASE_KEY_ALIAS')
            keyPassword System.getenv('FB_RELEASE_KEY_PASSWORD')
        }
`;

function applySigning(source) {
  invariant(typeof source === 'string' && source.trim(), 'Gradle source missing');
  invariant(!source.includes(MARKER), 'Release signing already injected; clean prebuild required');
  let signing = findBlock(source, 'signingConfigs');
  const signingBody = source.slice(signing.opening + 1, signing.closing);
  invariant(!/\brelease\s*\{/.test(signingBody), 'Existing release signing config must be reviewed manually');
  invariant(/\bdebug\s*\{/.test(signingBody), 'Expected generated signingConfigs.debug block');
  let next = source.slice(0, signing.closing) + RELEASE_CONFIG + source.slice(signing.closing);
  const buildTypes = findBlock(next, 'buildTypes');
  const release = findBlock(next, 'release', buildTypes.opening + 1, buildTypes.closing);
  const body = next.slice(release.opening + 1, release.closing);
  const signingLines = body.match(/^\s*signingConfig\s+signingConfigs\.debug\s*$/gm) || [];
  invariant(signingLines.length === 1, 'Expected one debug signingConfig in generated release buildType');
  const changed = body.replace(/^([ \t]*)signingConfig\s+signingConfigs\.debug\s*$/m,
    '$1signingConfig signingConfigs.release');
  next = next.slice(0, release.opening + 1) + changed + next.slice(release.closing);
  invariant(next.includes(MARKER) && next.includes('signingConfig signingConfigs.release'),
    'Release signing patch did not apply');
  return next;
}

function run(root, command) {
  const info = checkCredentials(root);
  if (command === 'check') {
    process.stdout.write(`[RELEASE SIGNING] PASS: keystore found outside source; alias=${info.alias}\n`);
    return;
  }
  invariant(command === 'apply', 'Expected check or apply');
  const gradle = path.join(root, 'android', 'app', 'build.gradle');
  invariant(fs.existsSync(gradle), 'Expo prebuild must generate android/app/build.gradle first');
  const before = fs.readFileSync(gradle, 'utf8');
  const after = applySigning(before);
  fs.writeFileSync(gradle, after, 'utf8');
  process.stdout.write('[RELEASE SIGNING] PASS: generated Gradle uses pinned Release signing; no secrets written\n');
}

if (require.main === module) {
  try {
    const command = process.argv[2];
    invariant(command === 'check' || command === 'apply', 'Usage: node fb-release-signing.cjs check|apply');
    run(process.cwd(), command);
  } catch (error) {
    console.error(error.message); // Never print secret environment values.
    process.exitCode = 1;
  }
}

module.exports = { checkCredentials, applySigning, findBlock, run };
