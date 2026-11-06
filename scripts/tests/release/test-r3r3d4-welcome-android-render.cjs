#!/usr/bin/env node
'use strict';
// Historical visual regression UPDATED for user-approved D7 single-paper design.
// The prior test is retained in document/releases/r3r3d7/historical-visual-tests.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const welcome=read('src/components/onboarding/WelcomeModal.tsx');
require('./test-r3r3d7-welcome-single-paper.cjs');
assert(/<(?:Animated\.)?Image\s+source=\{WELCOME_PAGE\}/.test(welcome)&&!welcome.includes('SCENE_SEALED'));
console.log('PASS migrated test-r3r3d4-welcome-android-render.cjs: single bundled Image with optional opacity animation');
assert(welcome.includes('single-paper-image-ready')&&welcome.includes('single-paper-image-error-fallback'));
console.log('PASS migrated test-r3r3d4-welcome-android-render.cjs: image readiness and fallback');
