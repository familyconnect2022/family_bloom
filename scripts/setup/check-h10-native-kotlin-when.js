#!/usr/bin/env node
'use strict';
// Fast guard for H10's exact Kotlin failure, runs before the Gradle build.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..');
const file = path.join(root, 'modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt');
const source = fs.readFileSync(file, 'utf8');
const block = source.match(/val background = when\s*\{([\s\S]*?)\n\s*\}/);
const required = [
  'square == current.selectedSquare',
  'square == current.checkSquare',
  'square in current.queuedPremoveSquares',
  'square == current.lastFrom || square == current.lastTo',
];
if (!block || required.some(term => !block[1].includes(term)) || source.includes('val background = when (square)')) {
  console.error('[ERROR] H10 Kotlin cell-coloring branches mix String and Boolean; fix ChessNativeBoardView.kt before Gradle.');
  process.exit(1);
}
console.log('[PASS] H10 native Kotlin cell-coloring uses condition-only when branches.');
