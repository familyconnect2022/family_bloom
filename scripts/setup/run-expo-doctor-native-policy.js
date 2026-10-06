#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');

const KNOWN_CHECK_TITLE = 'Check for app config fields that may not be synced in a non-CNG project';
const KNOWN_DETAIL = 'This project contains native project folders but also has native configuration properties in app.config.js';

function stripAnsi(value) {
  return String(value || '').replace(/\u001B\[[0-?]*[ -\/]*[@-~]/g, '');
}

function classifyDoctorResult(rawOutput, exitCode) {
  const output = stripAnsi(rawOutput).replace(/\r/g, '');
  if (Number(exitCode) === 0) {
    return { ok: true, ignoredKnownNativeSyncWarning: false, reason: 'expo-doctor passed' };
  }

  const summary = output.match(/(\d+)\/(\d+)\s+checks passed\.\s+(\d+)\s+checks failed/i);
  const failedCount = summary ? Number(summary[3]) : null;
  const hasKnownTitle = output.includes(KNOWN_CHECK_TITLE);
  const hasKnownDetail = output.includes(KNOWN_DETAIL);
  const mentionsPrebuild = /Prebuild/i.test(output);

  if (failedCount === 1 && hasKnownTitle && hasKnownDetail && mentionsPrebuild) {
    return {
      ok: true,
      ignoredKnownNativeSyncWarning: true,
      reason: 'known non-CNG native config sync warning',
    };
  }

  return {
    ok: false,
    ignoredKnownNativeSyncWarning: false,
    reason: failedCount == null
      ? 'expo-doctor failed and its failure summary could not be classified safely'
      : `expo-doctor reported ${failedCount} failing check(s)`,
  };
}

function buildDoctorInvocations(platform = process.platform, env = process.env) {
  if (platform === 'win32') {
    const comSpec = env.ComSpec || env.COMSPEC || 'cmd.exe';
    return [
      {
        label: 'Windows cmd.exe',
        command: comSpec,
        args: ['/d', '/s', '/c', 'npx expo-doctor'],
        shell: false,
      },
      {
        label: 'Windows shell fallback',
        command: 'npx expo-doctor',
        args: [],
        shell: true,
      },
    ];
  }

  return [
    {
      label: 'npx',
      command: 'npx',
      args: ['expo-doctor'],
      shell: false,
    },
  ];
}

function launchDoctor() {
  const invocations = buildDoctorInvocations();
  let lastError = null;

  for (const invocation of invocations) {
    const result = spawnSync(invocation.command, invocation.args, {
      cwd: process.cwd(),
      encoding: 'utf8',
      windowsHide: true,
      shell: invocation.shell,
    });

    if (!result.error) {
      return result;
    }

    lastError = result.error;
    console.warn(`[Family Bloom] ${invocation.label} could not launch Expo Doctor: ${result.error.message}`);
  }

  const error = lastError || new Error('No Expo Doctor launch strategy succeeded');
  return { status: 1, stdout: '', stderr: '', error };
}

function runDoctor() {
  const result = launchDoctor();

  if (result.error) {
    console.error(`[Family Bloom] Failed to launch expo-doctor after Windows-safe fallback: ${result.error.message}`);
    process.exit(1);
  }

  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);

  const combined = `${stdout}\n${stderr}`;
  const code = typeof result.status === 'number' ? result.status : 1;
  const classification = classifyDoctorResult(combined, code);

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
  KNOWN_CHECK_TITLE,
  KNOWN_DETAIL,
  stripAnsi,
  classifyDoctorResult,
  buildDoctorInvocations,
  launchDoctor,
};
