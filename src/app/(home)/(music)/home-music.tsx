import { Redirect } from "expo-router";

/**
 * Backward-compatible deep link. From Phase 14D onward Nhạc Nhà Mình lives
 * directly inside the Nhà Mình tab so tab switching/search/playback stay in one lightweight surface.
 */
export default function HomeMusicLegacyRedirect() {
  return <Redirect href="/(tabs)/play" />;
}
