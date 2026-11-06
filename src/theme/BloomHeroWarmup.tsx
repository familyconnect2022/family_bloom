import { useBloomColorsRevision } from './BloomThemeProvider';
import { Image } from 'expo-image';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { getBloomSelection, getBloomThemeRevision, subscribeBloomTheme } from './runtime';
import { getBloomHeroArt, type BloomHeroScene } from './storybookHeroRegistry';

/** Offscreen *decode* of only the current palette's bundled artwork.
 * Runs after the first frame and sequentially, so entering Family / Moments
 * does not enlarge a blurry thumbnail. Never fetches Firebase/Cloudinary.
 * Holding only one palette's ImageRefs avoids accumulating native bitmaps when
 * the user taps through all four themes. It does not render a hidden Image tree.
 */
const warmRefs = new Map<string, unknown>();
export function BloomHeroWarmup() {
  useBloomColorsRevision();
  const revision = useSyncExternalStore(subscribeBloomTheme, getBloomThemeRevision, getBloomThemeRevision);
  useEffect(() => {
    const palette = getBloomSelection().palette;
    warmRefs.clear();
    let cancelled = false;
    const scenes: BloomHeroScene[] = ['home', 'family', 'moments', 'learning', 'events', 'settings'];
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const next = async (index: number) => {
      if (cancelled || AppState.currentState !== 'active' || index >= scenes.length) return;
      const scene = scenes[index];
      try {
        const ref = await Image.loadAsync(getBloomHeroArt(scene, palette));
        if (!cancelled) warmRefs.set(`${palette}:${scene}`, ref);
      } catch { /* Always show bundled art directly even if optional warmup fails. */ }
      if (!cancelled) timeout = setTimeout(() => { void next(index + 1); }, 130);
    };
    // Avoid blocking the initial login, tab navigation or theme-picker press.
    timeout = setTimeout(() => { void next(0); }, 650);
    return () => { cancelled = true; if (timeout) clearTimeout(timeout); };
  }, [revision]);
  return null;
}
