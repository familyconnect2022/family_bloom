const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const appJsonPath = path.join(root, 'app.json');
const appConfigPath = path.join(root, 'app.config.js');
const packagePath = path.join(root, 'package.json');

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}
function pass(message) { console.log(`PASS ${message}`); }
function pluginName(plugin) { return Array.isArray(plugin) ? plugin[0] : plugin; }

if (!fs.existsSync(appJsonPath) || !fs.existsSync(appConfigPath) || !fs.existsSync(packagePath)) {
  console.error('FAIL app.json/app.config.js/package.json is missing');
  process.exit(1);
}

const base = JSON.parse(fs.readFileSync(appJsonPath, 'utf8')).expo;
const buildConfig = require(appConfigPath);
const effective = typeof buildConfig === 'function' ? buildConfig({ config: base }) : buildConfig.expo || buildConfig;
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const plugins = effective.plugins || [];
const audioPlugin = plugins.find((plugin) => pluginName(plugin) === 'expo-audio');

if (effective.android?.package === 'com.familybloom.android') pass('single Android package identity');
else fail(`Android package is ${effective.android?.package || '<missing>'}`);

if (effective.android?.googleServicesFile === './google-services.json') pass('google-services.json remains explicit');
else fail('googleServicesFile is not ./google-services.json');

if (audioPlugin) pass('expo-audio config plugin is present in effective config');
else fail('expo-audio config plugin is missing from effective config');

if (Array.isArray(audioPlugin)) {
  const options = audioPlugin[1] || {};
  if (options.recordAudioAndroid === false) pass('expo-audio does not request Android microphone recording');
  else fail('expo-audio recordAudioAndroid must be false for playback-only Family Bloom');
  if (options.enableBackgroundPlayback === false) pass('expo-audio background playback service stays disabled');
  else fail('expo-audio enableBackgroundPlayback must be false for short board SFX');
  if (options.enableBackgroundRecording === false) pass('expo-audio background recording stays disabled');
  else fail('expo-audio enableBackgroundRecording must be false');
}

if (pkg.dependencies?.['expo-audio'] === '~57.0.5') pass('package.json pins expo-audio ~57.0.5');
else fail(`package.json expo-audio=${pkg.dependencies?.['expo-audio'] || '<missing>'}`);

if (pkg.dependencies?.['expo-asset'] === '~57.0.19') pass('package.json directly installs expo-asset peer for expo-audio');
else fail(`package.json expo-asset=${pkg.dependencies?.['expo-asset'] || '<missing>'}`);

for (const required of ['expo-router', 'expo-splash-screen', '@react-native-firebase/app']) {
  if (plugins.some((plugin) => pluginName(plugin) === required)) pass(`inherited plugin ${required}`);
  else fail(`effective plugin ${required} missing`);
}

process.exit(process.exitCode || 0);
