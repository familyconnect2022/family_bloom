#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..');
const localPath = path.join(root, 'modules/family-bloom-overlay/package.json');
const installedPath = path.join(root, 'node_modules/family-bloom-overlay/package.json');
if (!fs.existsSync(localPath) || !fs.existsSync(installedPath)) process.exit(1);
try {
  const local = JSON.parse(fs.readFileSync(localPath, 'utf8'));
  const installed = JSON.parse(fs.readFileSync(installedPath, 'utf8'));
  process.exit(local.name === installed.name && local.version === installed.version ? 0 : 1);
} catch { process.exit(1); }
