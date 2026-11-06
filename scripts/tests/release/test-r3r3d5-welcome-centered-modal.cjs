#!/usr/bin/env node
'use strict';
// Historical visual regression UPDATED for user-approved D7 single-paper design.
// The prior test is retained in document/releases/r3r3d7/historical-visual-tests.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const welcome=read('src/components/onboarding/WelcomeModal.tsx');
require('./test-r3r3d7-welcome-single-paper.cjs');
assert(welcome.includes('computeWelcomePaperGeometry(viewport.width, viewport.height)')&&welcome.includes('resizeMode=\"cover\"'));
console.log('PASS migrated test-r3r3d5-welcome-centered-modal.cjs: art and text share cover geometry');
assert(welcome.indexOf('</Animated.ScrollView>')<welcome.indexOf('testID=\"welcome-fixed-cta-footer\"'));
console.log('PASS migrated test-r3r3d5-welcome-centered-modal.cjs: scrollable text with non-scrolling CTA');
