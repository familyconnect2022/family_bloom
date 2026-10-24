#!/usr/bin/env node
'use strict';
const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
// Dependency-free preflight: prevents the R7R1/R7R2 featureFlag export regression
// from surviving until CLEAN APPLY has already modified the user's project.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__legacyScriptsDir, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const source = read('src/constants/featureFlags.ts');
let n = 0;
function check(label, yes) { assert.ok(yes, label); console.log('PASS '+ (++n) + ' '+label); }
check('FEATURE_FLAGS remains exported', /export\s+const\s+FEATURE_FLAGS\s*=\s*\{/.test(source));
check('Firebase Spark disables Cloud Functions until opt-in', /get USE_CLOUD_FUNCTIONS\(\)/.test(source) && /cloudFunctionsActive = false/.test(read('src/constants/cloudRuntimeState.ts')));
check('Cross-family graph capability stays explicitly declared', /\bCROSS_FAMILY_GRAPH_BRIDGE_AVAILABLE\s*:\s*true\s*[,}]/.test(source));
check('Cross-family graph default remains disabled', /\bCROSS_FAMILY_GRAPH_BRIDGE_DEFAULT_ENABLED\s*:\s*false\s*[,}]/.test(source));
check('Family bulletin stays hidden without deleting source', /export\s+const\s+ENABLE_FAMILY_BULLETIN\s*:\s*boolean\s*=\s*false/.test(source));
for(const file of [
  'src/services/familyGraph/familyGraphMutationService.ts',
  'src/services/familyGraph/familyPersonContentService.ts',
  'src/services/familyGraph/graphProposalService.ts',
]) {
  const code = read(file);
  check(file+' still uses the available graph flag', code.includes('FEATURE_FLAGS.USE_CLOUD_FUNCTIONS') && code.includes('import { FEATURE_FLAGS }'));
}
check('Android bulletin uses its separate dormant flag', read('src/app/(tabs)/play.tsx').includes('ENABLE_FAMILY_BULLETIN &&'));
check('Web bulletin uses its separate dormant flag', read('src/web/pages/PlayWebPage.tsx').includes('ENABLE_FAMILY_BULLETIN &&'));
console.log(`H25R2R7R2R1 FEATURE FLAG REGRESSION: ${n}/${n} PASS`);
