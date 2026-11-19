'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { checkCredentials, applySigning } = require('../../android/build/fb-release-signing.cjs');

const TEMPLATE = `android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution! In production, you need to generate your own keystore file.
            signingConfig signingConfigs.debug
            minifyEnabled false
        }
    }
}
`;

function throws(source, regex) {
  assert.throws(() => applySigning(source), regex);
}

function test() {
  const output = applySigning(TEMPLATE);
  assert.match(output, /FAMILY_BLOOM_U1R3R2_RELEASE_SIGNING/);
  assert.match(output, /signingConfig signingConfigs\.release/);
  assert.match(output, /FB_RELEASE_KEYSTORE_PATH/);
  assert.match(output, /FB_RELEASE_STORE_PASSWORD/);
  assert.match(output, /FB_RELEASE_KEY_ALIAS/);
  assert.match(output, /FB_RELEASE_KEY_PASSWORD/);
  assert.equal((output.match(/signingConfig signingConfigs\.debug/g) || []).length, 1);
  assert.doesNotMatch(output, /secret-password-in-source/);
  throws(output, /already injected/);
  throws(TEMPLATE.replace('signingConfig signingConfigs.debug\n            minifyEnabled', 'signingConfig signingConfigs.release\n            minifyEnabled'), /Expected one debug signingConfig/);
  throws(TEMPLATE.replace('    signingConfigs {', '    otherSigningConfigs {'), /Expected exactly one signingConfigs/);
  throws(TEMPLATE.replace('    buildTypes {', '    otherBuildTypes {'), /Expected exactly one buildTypes/);
  throws(TEMPLATE.replace('    signingConfigs {', '    signingConfigs { release {}'), /Existing release signing config/);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fb-signing-u1r3r2-'));
  try {
    const root = path.join(tmp, 'android-source');
    fs.mkdirSync(root);
    const outside = path.join(tmp, 'family-bloom-release.jks');
    fs.writeFileSync(outside, 'test key placeholder; never a real keystore');
    const env = {
      FB_RELEASE_KEYSTORE_PATH: outside,
      FB_RELEASE_STORE_PASSWORD: 'secret-password-in-source',
      FB_RELEASE_KEY_ALIAS: 'familybloom_release',
      FB_RELEASE_KEY_PASSWORD: 'secret-password-in-source',
    };
    assert.equal(checkCredentials(root, env).alias, 'familybloom_release');
    assert.throws(() => checkCredentials(root, { ...env, FB_RELEASE_STORE_PASSWORD: '' }), /STORE_PASSWORD is missing/);
    assert.throws(() => checkCredentials(root, { ...env, FB_RELEASE_KEYSTORE_PATH: 'relative.jks' }), /absolute/);
    const inside = path.join(root, 'leaked.jks');
    fs.writeFileSync(inside, 'not a real key');
    assert.throws(() => checkCredentials(root, { ...env, FB_RELEASE_KEYSTORE_PATH: inside }), /outside/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log('PASS: U1R3R2 release signing gates (Gradle fixture, credentials, fail-closed)');
}

test();
