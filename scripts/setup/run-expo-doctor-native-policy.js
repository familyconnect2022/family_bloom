#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const KNOWN_CHECK_TITLE = 'Check for app config fields that may not be synced in a non-CNG project';
const KNOWN_DETAIL = 'This project contains native project folders but also has native configuration properties in app.config.js';

function stripAnsi(value) {
  return String(value || '').replace(/\u001B\[[0-?]*[ -\/]*[@-~]/g, '');
}

function classifyDoctorResult(rawOutput, exitCode) {
  const output = stripAnsi(rawOutput).replace(/\r/g, '');
  if (Number(exitCode) === 0) {
    return { ok: true, ignoredKnownNativeSyncWarning: false, ignoredCompatiblePatchDrift: false, reason: 'expo-doctor passed' };
  }

  const summary = output.match(/(\d+)\/(\d+)\s+checks passed\.\s+(\d+)\s+checks failed/i);
  const simpleFailureSummary = output.match(/(?:^|\n)\s*(\d+)\s+check(?:s)? failed(?:\.|,|\s|$)/i);
  const failedCount = summary ? Number(summary[3]) : (simpleFailureSummary ? Number(simpleFailureSummary[1]) : null);
  const hasKnownTitle = output.includes(KNOWN_CHECK_TITLE);
  const hasKnownDetail = output.includes(KNOWN_DETAIL);
  const mentionsPrebuild = /Prebuild/i.test(output);
  const hasCompatiblePatchDrift = /packages? out of date/i.test(output)
    && /npx expo install --check/i.test(output)
    && /Advice:/i.test(output);

  // Build scripts already run check-expo-dependencies.js and check-package-lock.js
  // before Expo Doctor. If those strict project-contract checks pass, Expo's
  // recommendation to move to a newer compatible SDK patch is advisory only.
  // Do not block a local APK build/share solely for that recommendation.
  if (failedCount === 1 && hasCompatiblePatchDrift) {
    return {
      ok: true,
      ignoredKnownNativeSyncWarning: false,
      ignoredCompatiblePatchDrift: true,
      reason: 'compatible Expo SDK patch drift advisory',
    };
  }

  if (failedCount === 1 && hasKnownTitle && hasKnownDetail && mentionsPrebuild) {
    return {
      ok: true,
      ignoredKnownNativeSyncWarning: true,
      ignoredCompatiblePatchDrift: false,
      reason: 'known non-CNG native config sync warning',
    };
  }

  return {
    ok: false,
    ignoredKnownNativeSyncWarning: false,
    ignoredCompatiblePatchDrift: false,
    reason: failedCount == null
      ? 'expo-doctor failed and its failure summary could not be classified safely'
      : `expo-doctor reported ${failedCount} failing check(s)`,
  };
}

function resolveProjectRoot() {
  return PROJECT_ROOT;
}

function resolvePinnedDoctorCli(projectRoot = PROJECT_ROOT) {
  const packageDir = path.join(projectRoot, 'node_modules', 'expo-doctor');
  const packageJsonPath = path.join(packageDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(
      `Pinned local Expo Doctor is missing at ${packageJsonPath}. Run the supported dependency sync/CLEAN APPLY first.`,
    );
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  } catch (error) {
    throw new Error(`Could not read ${packageJsonPath}: ${error.message}`);
  }

  let binRelative = null;
  if (typeof manifest.bin === 'string') {
    binRelative = manifest.bin;
  } else if (manifest.bin && typeof manifest.bin === 'object') {
    binRelative = manifest.bin['expo-doctor'] || Object.values(manifest.bin)[0] || null;
  }

  if (!binRelative || typeof binRelative !== 'string') {
    throw new Error(`expo-doctor package.json does not expose a usable CLI bin entry: ${packageJsonPath}`);
  }

  const cliPath = path.resolve(packageDir, binRelative);
  if (!fs.existsSync(cliPath)) {
    throw new Error(`Pinned expo-doctor CLI file is missing: ${cliPath}`);
  }

  return {
    packageJsonPath,
    cliPath,
    version: String(manifest.version || 'unknown'),
  };
}

function buildDoctorInvocations(_platform = process.platform, _env = process.env, projectRoot = PROJECT_ROOT) {
  const doctor = resolvePinnedDoctorCli(projectRoot);
  return [
    {
      label: `pinned local expo-doctor@${doctor.version} via Node CLI`,
      command: process.execPath,
      args: [doctor.cliPath],
      cwd: projectRoot,
      shell: false,
      doctor,
    },
  ];
}

function launchDoctor(projectRoot = PROJECT_ROOT) {
  let invocation;
  try {
    invocation = buildDoctorInvocations(process.platform, process.env, projectRoot)[0];
  } catch (error) {
    return { status: 1, stdout: '', stderr: '', error };
  }

  const result = spawnSync(invocation.command, invocation.args, {
    cwd: invocation.cwd,
    encoding: 'utf8',
    windowsHide: true,
    shell: false,
    env: process.env,
  });

  if (result.error) {
    console.warn(`[Family Bloom] ${invocation.label} could not launch Expo Doctor: ${result.error.message}`);
  }
  return result;
}

function runDoctor() {
  const projectRoot = resolveProjectRoot();
  const result = launchDoctor(projectRoot);

  if (result.error) {
    console.error(`[Family Bloom] Failed to launch pinned local expo-doctor via Node CLI: ${result.error.message}`);
    process.exit(1);
  }

  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);

  const combined = `${stdout}\n${stderr}`;
  const code = typeof result.status === 'number' ? result.status : 1;
  const classification = classifyDoctorResult(combined, code);

  if (classification.ok && classification.ignoredCompatiblePatchDrift) {
    console.log('');
    console.log('[Family Bloom] WARN: Expo Doctor recommends newer compatible SDK patch packages.');
    console.log('[Family Bloom] Strict package.json/node_modules/package-lock checks already passed, so APK build/share may continue.');
    console.log('[Family Bloom] Run `npx expo install --fix` later when you want to refresh to the newest SDK 57 patch set.');
    process.exit(0);
  }

  if (classification.ok && classification.ignoredKnownNativeSyncWarning) {
    console.log('');
    console.log('[Family Bloom] WARN: Expo Doctor reported only the known native-config sync warning.');
    console.log('[Family Bloom] This build intentionally keeps the Android native project and then runs `expo prebuild --clean`.');
    console.log('[Family Bloom] Continuing because no other Expo Doctor check failed.');
    process.exit(0);
  }

  if (!classification.ok) {
    console.error('');
    console.error(`[Family Bloom] Expo Doctor remains build-blocking: ${classification.reason}.`);
    process.exit(code || 1);
  }

  process.exit(0);
}

if (require.main === module) {
  runDoctor();
}

module.exports = {
  PROJECT_ROOT,
  KNOWN_CHECK_TITLE,
  KNOWN_DETAIL,
  stripAnsi,
  classifyDoctorResult,
  resolveProjectRoot,
  resolvePinnedDoctorCli,
  buildDoctorInvocations,
  launchDoctor,
};
