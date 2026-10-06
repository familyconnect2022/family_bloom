const DEFAULT_CHESS_SOCKET_URL = 'https://family-bloom-chess.onrender.com';

module.exports = ({ config }) => ({
  ...config,
  name: 'Family Bloom',
  scheme: 'familybloom',
  icon: './assets/branding/release/icon.png',
  extra: {
    ...config.extra,
    // Public Render endpoint, not a secret. Keeping a baked-in fallback means a clean FULL ZIP
    // can still start global Chess presence even when the local .env file is intentionally absent.
    chessSocketUrl:
      process.env.EXPO_PUBLIC_CHESS_SOCKET_URL ||
      config.extra?.chessSocketUrl ||
      DEFAULT_CHESS_SOCKET_URL,
  },
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
