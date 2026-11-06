#!/usr/bin/env node
'use strict';
// Historical visual regression UPDATED for user-approved D7 single-paper design.
// The prior test is retained in document/releases/r3r3d7/historical-visual-tests.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const welcome=read('src/components/onboarding/WelcomeModal.tsx');
require('./test-r3r3d7-welcome-single-paper.cjs');
assert.equal(JSON.parse(read('document/releases/r3r14/approved-letter-paragraphs.snapshot.json')).length,14);
console.log('PASS migrated test-r3r14-welcome-envelope-motion.cjs: preserve all 14 approved paragraphs');
assert(!welcome.includes('SCENE_SEALED') && !welcome.includes('SCENE_OPENING') &&
  !welcome.includes('setPhase(\'opening\')') && !welcome.includes('openingOpacity'));
assert(welcome.includes('if (!visible || !imageReady || !animateLetter) {'));
console.log('PASS migrated test-r3r14-welcome-envelope-motion.cjs: no obsolete envelope frame transition; decorative motion only after artwork ready');
