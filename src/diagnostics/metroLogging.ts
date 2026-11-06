/**
 * Quiet-by-default Metro-only test output. Normal errors/warnings are NOT
 * hidden globally. This flag is opt-in for an explicit diagnostic APK.
 * Expo substitutes EXPO_PUBLIC_ literals at bundle time; no runtime network.
 */
export const metroTestLogsEnabled =
  (typeof __DEV__ !== 'undefined' && __DEV__) &&
  process.env.EXPO_PUBLIC_FB_METRO_TEST_LOGS === '1';
