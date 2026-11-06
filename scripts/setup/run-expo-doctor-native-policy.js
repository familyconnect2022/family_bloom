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
  const patchRows = output.split('\n').map(line => line.trim().match(
    /^([^\s]+)\s+[~^]?(\d+)\.(\d+)\.(\d+)\s+(\d+)\.(\d+)\.(\d+)\s*$/,
  )).filter(Boolean);
  const patchCount = output.match(/(\d+) packages? out of date/i);
  const hasCompatiblePatchDrift = /packages? out of date/i.test(output)
    && /npx expo install --check/i.test(output)
    && /Advice:/i.test(output)
    && !/major version mismatches|minor version mismatches/i.test(output)
    && patchCount && Number(patchCount[1]) === patchRows.length && patchRows.length > 0
    && patchRows.every(match => match[2] === match[5] && match[3] === match[6]);

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

// Only the online React Native Directory call may be retried when its server fails.
function isRemoteDirectoryFailure(output) {
  return /Directory check failed with unexpected server response/i.test(stripAnsi(output));
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

function launchDoctor(projectRoot = PROJECT_ROOT, overrideEnv = {}) {
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
    env: { ...process.env, ...overrideEnv },
  });

  if (result.error) {
    console.warn(`[Family Bloom] ${invocation.label} could not launch Expo Doctor: ${result.error.message}`);
  }
  return result;
}

function runDoctorWithDirectoryFallback(projectRoot = PROJECT_ROOT) {
  const first = launchDoctor(projectRoot);
  const output = `${first.stdout || ''}\n${first.stderr || ''}`;
  if ((first.status === 0 && !first.error) ||
      !isRemoteDirectoryFailure(output) ||
      process.env.EXPO_DOCTOR_ENABLE_DIRECTORY_CHECK === '0') {
    return { first, final: first, retriedWithoutDirectory: false };
  }
  // Scope the override to one retry. Do not persist it in project configuration.
  const final = launchDoctor(projectRoot, { EXPO_DOCTOR_ENABLE_DIRECTORY_CHECK: '0' });
  return { first, final, retriedWithoutDirectory: true };
}

function runDoctor() {
  const { first, final, retriedWithoutDirectory } = runDoctorWithDirectoryFallback(resolveProjectRoot());
  if (first.stdout) process.stdout.write(first.stdout);
  if (first.stderr) process.stderr.write(first.stderr);
  if (retriedWithoutDirectory) {
    console.warn('[Family Bloom] React Native Directory server unavailable; retrying Expo Doctor WITHOUT the online Directory check only.');
    console.warn('[Family Bloom] All local SDK/native dependency checks remain enforced.');
    if (final.stdout) process.stdout.write(final.stdout);
    if (final.stderr) process.stderr.write(final.stderr);
  }
  if (final.error) {
    console.error(`[Family Bloom] Expo Doctor failed to launch: ${final.error.message}`);
    process.exit(1);
  }
  const combined = `${final.stdout || ''}\n${final.stderr || ''}`;
  const code = typeof final.status === 'number' ? final.status : 1;
  const result = classifyDoctorResult(combined, code);
  if (result.ok && result.ignoredCompatiblePatchDrift) {
    console.warn('[Family Bloom] Compatible Expo SDK patch advisory; local package/lock contract still required.');
    console.warn('[Family Bloom] Optional update: npx expo install --fix');
    process.exit(0);
  }
  if (result.ok && result.ignoredKnownNativeSyncWarning) {
    console.warn('[Family Bloom] Known native configuration/prebuild warning only.');
    process.exit(0);
  }
  if (!result.ok) {
    console.error(`[Family Bloom] Doctor BLOCKS build: ${result.reason}`);
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
  isRemoteDirectoryFailure,
  runDoctorWithDirectoryFallback,
};
