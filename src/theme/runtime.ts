import { DEFAULT_BLOOM_SELECTION, getBloomColors, isBloomSelection, type BloomColors, type BloomDisplayMode, type BloomPaletteId, type BloomResolvedMode, type BloomSelection } from './palette';

/** Isolated from Auth, Firestore and Router: switching themes must not reset a session. */
let selection: BloomSelection = DEFAULT_BLOOM_SELECTION;
let systemMode: BloomResolvedMode = 'light';
let resolved: BloomResolvedMode = 'light';
let colors: BloomColors = getBloomColors(selection.palette, resolved);
let revision = 0;
const listeners = new Set<() => void>();
/** A stable immutable snapshot for useSyncExternalStore. No mutable read is
 * interleaved between selection and colors when the picker renders. */
export type BloomThemeSnapshot = Readonly<{
  selection: BloomSelection; resolvedMode: BloomResolvedMode; colors: BloomColors; revision: number;
}>;
let snapshot: BloomThemeSnapshot = { selection, resolvedMode: resolved, colors, revision };
export const getBloomThemeSnapshot = (): BloomThemeSnapshot => snapshot;
export type BloomThemeAuditEvent = Readonly<{
  revision: number; source: string; palette: BloomPaletteId; mode: BloomDisplayMode; resolvedMode: BloomResolvedMode;
}>;
const audit: BloomThemeAuditEvent[] = [];
export const getBloomThemeAuditTrail = (): readonly BloomThemeAuditEvent[] => audit.slice();

export const getBloomSelection = (): BloomSelection => selection;
export const getBloomResolvedMode = (): BloomResolvedMode => resolved;
export const getBloomActiveColors = (): BloomColors => colors;
export const getBloomThemeRevision = (): number => revision;
export const subscribeBloomTheme = (onStoreChange: () => void): (() => void) => {
  listeners.add(onStoreChange);
  return () => { listeners.delete(onStoreChange); };
};
function publish(source = 'unknown') {
  const next = selection.mode === 'system' ? systemMode : selection.mode;
  if (resolved === next && colors === lastColors && selection === lastSelection) return;
  resolved = next;
  colors = getBloomColors(selection.palette, resolved);
  lastColors = colors;
  lastSelection = selection;
  revision += 1;
  snapshot = {selection, resolvedMode: resolved, colors, revision};
  audit.push({revision, source, palette:selection.palette, mode:selection.mode, resolvedMode:resolved});
  if (audit.length > 32) audit.shift();
  listeners.forEach(listener => listener());
}
let lastColors: BloomColors = colors;
let lastSelection: BloomSelection = selection;
export function applyBloomSelection(value: unknown, source = 'hydrate'): boolean {
  if (!isBloomSelection(value)) return false;
  if (selection.palette === value.palette && selection.mode === value.mode) return false;
  selection = { palette: value.palette, mode: value.mode };
  publish(source);
  return true;
}
export function setBloomSystemMode(mode: BloomResolvedMode): void {
  if (mode === systemMode) return;
  systemMode = mode;
  if (selection.mode === 'system') publish('system-mode');
}
export function updateBloomPalette(palette: BloomPaletteId): boolean {
  return applyBloomSelection({ ...selection, palette }, 'user-palette');
}
export function updateBloomMode(mode: BloomDisplayMode): boolean {
  return applyBloomSelection({ ...selection, mode }, 'user-mode');
}
