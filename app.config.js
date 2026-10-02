module.exports = ({ config }) => ({
  ...config,
  name: 'Family Bloom',
  scheme: 'familybloom',
  icon: './assets/branding/release/icon.png',
  android: {
    ...config.android,
    package: 'com.familybloom.android',
    googleServicesFile: './google-services.json',
    adaptiveIcon: {
      backgroundColor: '#FDFAF4',
      foregroundImage: './assets/branding/release/android-icon-foreground.png',
      backgroundImage: './assets/branding/release/android-icon-background.png',
      monochromeImage: './assets/branding/release/android-icon-monochrome.png',
    },
  },
});
