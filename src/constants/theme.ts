import { getLivingAppearance } from '../theme/livingAppearance';
import { getBloomActiveColors, getBloomResolvedMode } from '../theme/runtime';
import type { BloomColors } from '../theme/palette';

/** Dynamic semantic colors. Avoid capturing individual colors outside render/style factories. */
export const COLORS: BloomColors = new Proxy({} as BloomColors, {
  get(_target, key: string | symbol) { return Reflect.get(getBloomActiveColors(), key); },
});
export const getBloomStatusBarStyle = (): 'light' | 'dark' => getBloomResolvedMode() === 'dark' ? 'light' : 'dark';

export const UI = {
  borderRadiusCard: 24,
  borderRadiusInput: 15,
  borderRadiusButton: 16,
  minHeightTouch: 48,
};
export const SPACING = { xs: 6, sm: 10, md: 14, lg: 18, xl: 24 } as const;

export const getBloomMotionLevel = () => getLivingAppearance().motion;
