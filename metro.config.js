const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Family Bloom P2.10: native board-game SFX use compact AAC/M4A files.
// Expo normally includes m4a already; keep this guard for deterministic Android
// bundling across clean installs and copy-over projects.
if (!config.resolver.assetExts.includes('m4a')) {
  config.resolver.assetExts.push('m4a');
}

// Ensure Expo Metro bundles local alpha WebP storybook assets on Android.
if (!config.resolver.assetExts.includes('webp')) {
  config.resolver.assetExts.push('webp');
}

// Offline shared editor is packaged as an asset, never loaded from Vercel.
if (!config.resolver.assetExts.includes('html')) config.resolver.assetExts.push('html');

module.exports = config;
