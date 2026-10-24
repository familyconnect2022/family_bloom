#!/usr/bin/env node
'use strict';
const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  PROJECT_ROOT,
  resolveProjectRoot,
  resolvePinnedDoctorCli,
  buildDoctorInvocations,
  launchDoctor,
} = require('../../setup/run-expo-doctor-native-policy');

let pass = 0;
let fail = 0;
function check(name, condition, detail = '') {
  if (condition) {
    pass += 1;
    console.log(`PASS ${name}`);
  } else {
    fail += 1;
    console.error(`FAIL ${name}${detail ? ` :: ${detail}` : ''}`);
  }
}

const root = path.resolve(__legacyScriptsDir, '..');
const wrapperPath = path.join(root, 'scripts/setup/run-expo-doctor-native-policy.js');
const wrapper = fs.readFileSync(wrapperPath, 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const debugBat = fs.readFileSync(path.join(root, 'scripts/android/dev/Family_Bloom_Android_Debug_Build_And_Run.bat'), 'utf8');
const releaseBat = fs.readFileSync(path.join(root, 'scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat'), 'utf8');
const installBat = fs.readFileSync(path.join(root, 'scripts/setup/Family_Bloom_Install_And_Doctor.bat'), 'utf8');
const cleanBat = fs.readFileSync(path.join(root, 'scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat'), 'utf8');

check('Doctor project root is derived from wrapper location', PROJECT_ROOT === root && resolveProjectRoot() === root);
check('Doctor launcher does not spawn expo-doctor.cmd', !wrapper.includes("expo-doctor.cmd"));
check('Doctor launcher does not shell through npx', !/npx\s+expo-doctor/i.test(wrapper) && !/shell:\s*true/.test(wrapper));
check('Doctor launcher invokes pinned CLI through process.execPath', wrapper.includes('command: process.execPath') && wrapper.includes('args: [doctor.cliPath]'));
check('Doctor launcher forces cwd to resolved project root', wrapper.includes('cwd: projectRoot') || wrapper.includes('cwd: invocation.cwd'));
check('Doctor launcher reads expo-doctor package bin metadata', wrapper.includes("node_modules', 'expo-doctor") && wrapper.includes('manifest.bin'));

const fixtureBase = fs.mkdtempSync(path.join(os.tmpdir(), 'Family Bloom Doctor Fixture '));
try {
  const packageDir = path.join(fixtureBase, 'node_modules', 'expo-doctor');
  const cliDir = path.join(packageDir, 'build');
  fs.mkdirSync(cliDir, { recursive: true });
  fs.writeFileSync(path.join(packageDir, 'package.json'), JSON.stringify({
    name: 'expo-doctor',
    version: '1.20.4',
    bin: { 'expo-doctor': './build/index.js' },
  }, null, 2));
  fs.writeFileSync(path.join(cliDir, 'index.js'), "console.log('21/21 checks passed.');\n");

  const resolved = resolvePinnedDoctorCli(fixtureBase);
  check('Pinned Doctor CLI resolves through package.json bin', resolved.cliPath === path.join(cliDir, 'index.js'));
  check('Pinned Doctor version is retained', resolved.version === '1.20.4');

  const winInvocation = buildDoctorInvocations('win32', { ComSpec: 'C:\\Windows\\System32\\cmd.exe' }, fixtureBase)[0];
  check('Windows Doctor uses Node executable rather than .cmd', winInvocation.command === process.execPath && winInvocation.args[0] === path.join(cliDir, 'index.js'));
  check('Windows Doctor launch keeps shell disabled', winInvocation.shell === false);
  check('Windows Doctor launch pins cwd to fixture root with spaces', winInvocation.cwd === fixtureBase && fixtureBase.includes(' '));

  const launched = launchDoctor(fixtureBase);
  check('Node CLI launcher succeeds from a path containing spaces', launched.status === 0, launched.error?.message || launched.stderr || '');
  check('Node CLI launcher receives Doctor stdout', String(launched.stdout || '').includes('21/21 checks passed.'));
} finally {
  fs.rmSync(fixtureBase, { recursive: true, force: true });
}

check('P2.12.8 package gate is registered', pkg.scripts?.['phaseP2_12_8:check']?.includes('test-phase-p2_12_8-windows-expo-doctor-node-cli-launch.js'));
check('Debug build validates P2.12.8 before Doctor', debugBat.indexOf('phaseP2_12_8:check') >= 0 && debugBat.indexOf('phaseP2_12_8:check') < debugBat.indexOf('doctor:native-check'));
check('Release build validates P2.12.8 before Doctor', releaseBat.indexOf('phaseP2_12_8:check') >= 0 && releaseBat.indexOf('phaseP2_12_8:check') < releaseBat.indexOf('doctor:native-check'));
check('Install+Doctor validates P2.12.8 before Doctor', installBat.indexOf('phaseP2_12_8:check') >= 0 && installBat.indexOf('phaseP2_12_8:check') < installBat.indexOf('doctor:native-check'));
check('Clean apply runs P2.12.8 regression', cleanBat.includes('test-phase-p2_12_8-windows-expo-doctor-node-cli-launch.js'));

console.log(`\nP2.12.8 Windows Expo Doctor Node CLI Launch: ${pass}/${pass + fail} PASS`);
process.exit(fail ? 1 : 0);
