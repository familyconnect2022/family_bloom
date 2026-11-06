/**
 * Appearance 3.0 migration bridge for existing createBloomStyles factories.
 *
 * React Compiler must see a *reactive VALUE* in render, not a discarded revision
 * hook paired with reads from a module Proxy. Components call this hook and
 * use the returned plain style map in JSX. A later migration can replace the
 * legacy factory entirely with makeStyles(colors, typography).
 *
 * This hook performs no IO, does not write Firebase, and never remounts screens.
 */
import { useMemo } from 'react';
import { useA3Theme, useA3Typography } from './useAppearance3';

const resolvedCache = new WeakMap<object, {key: string; value: unknown}>();

export function useA3LegacyStyles<T extends Record<string, any>>(legacyStyles: T): Readonly<T> {
  const theme = useA3Theme();
  const type = useA3Typography();
  // Both external-store values are immutable. This key changes only for a
  // real color or typography update, not for a parent re-render / animation.
  const key = `${theme.revision}:${type.font}:${type.scale}`;
  return useMemo(() => {
    const existing = resolvedCache.get(legacyStyles);
    if (existing?.key === key) return existing.value as Readonly<T>;
    // Deliberately MATERIALIZE the legacy Proxy once per revision. Passing the
    // plain object to JSX makes styles a visible React Compiler dependency.
    const result = Object.freeze({...legacyStyles}) as Readonly<T>;
    resolvedCache.set(legacyStyles, {key, value:result});
    return result;
  }, [legacyStyles, key]);
}
