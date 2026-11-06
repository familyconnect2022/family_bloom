/**
 * Compatibility metadata for legacy createBloomStyles typography. It tracks the
 * ORIGINAL unscaled property source, not merely whether some item in a style
 * array has ever been processed. This prevents an inline override from being
 * silently ignored and prevents a processed item from being scaled twice.
 *
 * WeakMap never retains detached style objects. New components should use
 * semantic BloomText roles without going through the legacy style factory.
 */
import { StyleSheet } from 'react-native';

type Source = Readonly<Record<string, unknown>>;
const originals = new WeakMap<object, Source>();
export function markBloomTypography(style: object, original?: Source): void {
  originals.set(style, original ?? style as Source);
}
/** Return the FINAL declaration of a field, respecting RN style array order. */
export function bloomFinalStyleField(input: unknown, field: string): {value: unknown; processed: boolean; sourceValue?: unknown} | null {
  if (input == null || input === false) return null;
  if (Array.isArray(input)) {
    let result: {value: unknown; processed: boolean; sourceValue?: unknown} | null = null;
    for (const item of input) {
      const found = bloomFinalStyleField(item, field);
      if (found) result = found;
    }
    return result;
  }
  const flat = typeof input === 'number' ? StyleSheet.flatten(input as never) : input;
  if (!flat || typeof flat !== 'object' || !(field in flat)) return null;
  const original = originals.get(flat as object);
  return {value: (flat as Record<string, unknown>)[field], processed: !!original, sourceValue: original?.[field]};
}
/** Kept for older imports. Checks the last fontSize, not any style in an array. */
export function isBloomTypographyProcessed(input: unknown): boolean {
  return bloomFinalStyleField(input, 'fontSize')?.processed ?? false;
}
