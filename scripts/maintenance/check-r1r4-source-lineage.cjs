#!/usr/bin/env node
'use strict';
/** Family Bloom upgrade source identity: accept only protected official release
 * fingerprints (including R3R3D7R2R1/R2R2/R2R3/R2R3R1/R2R3R2R1). Reject unknown/custom
 * source before backup, cleanup or overlay. Never read Firebase secrets. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const manifest = require(path.join(root, 'document/releases/m3r4r5/known-source-lineages.json'));
const target = path.resolve(process.argv[2] || process.env.FB_TARGET || root);
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const equal = (rel, expected) => {
  const p = path.join(target, rel);
  return fs.existsSync(p) && fs.statSync(p).isFile() && hash(p) === expected;
};
if (!fs.existsSync(path.join(target, manifest.files[0]))) {
  // Preserve existing upstream test fixtures without the actual AuthContext.
  // A real Family Bloom app (create-profile.tsx exists) must never bypass.
  if (fs.existsSync(path.join(target, 'src/app/(profile)/create-profile.tsx'))) {
    console.error('[STOP] Missing AuthContext in a full project; cannot verify identity.');
    process.exit(2);
  }
  console.log('[WARN] Minimal test fixture without an application codebase.');
  process.exit(0);
}
// Multiple hotfix variants may share routing/base hashes; check every candidate
// and accept only one whose full protected fingerprint matches.
const criticalMismatches = [];
const recentOfficial = {
  R2R1: manifest.additional_r2r1_required_files,
  R2R2: manifest.additional_r2r2_required_files,
  R2R3: manifest.additional_r2r3_required_files,
  R2R3R1: manifest.additional_r2r3r1_required_files,
  R2R3R2R1: manifest.additional_r2r3r2r1_required_files,
  R2R3R3: manifest.additional_r2r3r3_required_files,
};
for (const [variant, hashes] of Object.entries(manifest.baselines)) {
  if (!manifest.files.every((rel, i) => equal(rel, hashes[i]))) continue;
  if (['R2R1','R2R2','R2R3','R2R3R1','R2R3R2R1','R2R3R3','R3','R5','R6','R7','R7R1','R8','R8R1','R8R2','R8R3','R8R3R1','R8R3R2','R8R3R3','R8R4R1','R8R4R2','R8R4R3','R8R4R4','R8R4R4R2','R8R4R4R3','R8R4R4R3R1','R8R4R4R3R2','R8R4R4R3R3','R8R4R4R3R4','R8R4R4R3R4R1','R8R4R4R3R4R2','R8R4R4R3R4R3','R8R4R4R3R4R3R2','R8R4R4R3R4R3R3','R8R4R4R3R4R3R3D1','R8R4R4R3R4R3R3D2','R8R4R4R3R4R3R3D3','R8R4R4R3R4R3R3D4','R8R4R4R3R4R3R3D5','R8R4R4R3R4R3R3D6','R8R4R4R3R4R3R3D7','R8R4R4R3R4R3R3D7R1'].includes(variant)) {
    const criticalByVariant = {R3:manifest.additional_r3_required_files || {},R5:manifest.additional_r5_required_files || {},R6:manifest.additional_r6_required_files || {},R7:manifest.additional_r7_required_files || {},R7R1:manifest.additional_r7r1_required_files || {},R8:manifest.additional_r8_required_files || {},R8R1:manifest.additional_r8r1_required_files || {},R8R2:manifest.additional_r8r2_required_files || {},R8R3:manifest.additional_r8r3_required_files || {},R8R3R1:manifest.additional_r8r3r1_required_files || {},R8R3R2:manifest.additional_r8r3r2_required_files || {},R8R3R3:manifest.additional_r8r3r3_required_files || {},R8R4R1:manifest.additional_r8r4r1_required_files || {},R8R4R2:manifest.additional_r8r4r2_required_files || {},R8R4R3:manifest.additional_r8r4r3_required_files || {},R8R4R4:manifest.additional_r8r4r4_required_files || {},R8R4R4R2:manifest.additional_r8r4r4r2_required_files || {},R8R4R4R3:manifest.additional_r8r4r4r3_required_files || {},R8R4R4R3R1:manifest.additional_r8r4r4r3r1_required_files || {},R8R4R4R3R2:manifest.additional_r8r4r4r3r2_required_files || {},R8R4R4R3R3:manifest.additional_r8r4r4r3r3_required_files || {},R8R4R4R3R4:manifest.additional_r8r4r4r3r4_required_files || {},R8R4R4R3R4R1:manifest.additional_r8r4r4r3r4r1_required_files || {},R8R4R4R3R4R2:manifest.additional_r8r4r4r3r4r2_required_files || {},R8R4R4R3R4R3:manifest.additional_r8r4r4r3r4r3_required_files || {},R8R4R4R3R4R3R2:manifest.additional_r8r4r4r3r4r3r2_required_files || {},R8R4R4R3R4R3R3:manifest.additional_r8r4r4r3r4r3r3_required_files || {},R8R4R4R3R4R3R3D1:manifest.additional_r8r4r4r3r4r3r3d1_required_files || {},R8R4R4R3R4R3R3D2:manifest.additional_r8r4r4r3r4r3r3d2_required_files || {},R8R4R4R3R4R3R3D3:manifest.additional_r8r4r4r3r4r3r3d3_required_files || {},R8R4R4R3R4R3R3D4:manifest.additional_r8r4r4r3r4r3r3d4_required_files || {},R8R4R4R3R4R3R3D5:manifest.additional_r8r4r4r3r4r3r3d5_required_files || {},R8R4R4R3R4R3R3D6:manifest.additional_r8r4r4r3r4r3r3d6_required_files || {},R8R4R4R3R4R3R3D7:manifest.additional_r8r4r4r3r4r3r3d7_required_files || {},R8R4R4R3R4R3R3D7R1:manifest.additional_r8r4r4r3r4r3r3d7r1_required_files || {}};
    const additional = Object.entries(recentOfficial[variant] || criticalByVariant[variant] || {});
    const mismatched = additional.filter(([rel, digest]) => !equal(rel, digest)).map(([rel]) => rel);
    if (mismatched.length) {
      criticalMismatches.push({variant, files:mismatched});
      continue;
    }
  }
  console.log(`[PASS] Recognized original ${variant}; protected source fingerprint matched.`);
  process.exit(0);
}
if (criticalMismatches.length) {
  console.error('[STOP] Base fingerprint matches but protected files differ in these candidates:');
  for (const candidate of criticalMismatches) {
    console.error(`  ${candidate.variant}: ${candidate.files.join(', ')}`);
  }
  console.error('No files were modified by this verification.');
  process.exit(2);
}
console.error('[STOP] Source lineage not recognized as an approved original release (R2R1/R2R2/R2R3/R2R3R1/R2R3R2R1/R2R3R3 or R1/R3/R4/R5/R6/R7/R7R1/R8/R8R1/R8R2/R8R3/R8R3R1/R8R3R2/R8R3R3/R8R4R1/R8R4R2/R8R4R3/R8R4R4/R8R4R4R2/R8R4R4R3/R8R4R4R3R1/R8R4R4R3R2/R8R4R4R3R3/R8R4R4R3R4/R8R4R4R3R4R1/R8R4R4R3R4R2/R8R4R4R3R4R3/R8R4R4R3R4R3R2/R8R4R4R3R4R3R3/R8R4R4R3R4R3R3D1/R8R4R4R3R4R3R3D2/R8R4R4R3R4R3R3D3/R8R4R4R3R4R3R3D4/R8R4R4R3R4R3R3D5/R8R4R4R3R4R3R3D6/R8R4R4R3R4R3R3D7.');
console.error('This may be a custom/partial source tree. Auto Update refuses to overwrite it.');
console.error('No files were modified by this verification.');
process.exit(2);
