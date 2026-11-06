export type SignalSubscriber = () => void;

/**
 * Tiny keyed external store for high-frequency global signals.
 * Writes are coalesced per key; only consumers of that exact key are notified.
 */
export function createKeyedSignalStore<T>(initialValue: T, coalesceMs = 40) {
  const values = new Map<string, T>();
  const subscribers = new Map<string, Set<SignalSubscriber>>();
  const pending = new Map<string, T>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  const emit = (key: string) => subscribers.get(key)?.forEach((subscriber) => subscriber());
  const commit = (key: string) => {
    const next = pending.get(key);
    pending.delete(key);
    const timer = timers.get(key);
    if (timer) clearTimeout(timer);
    timers.delete(key);
    if (typeof next === "undefined") return;
    if (Object.is(values.get(key) ?? initialValue, next)) return;
    values.set(key, next);
    emit(key);
  };

  return {
    get(key: string) {
      return values.get(key) ?? initialValue;
    },
    set(key: string, value: T, options?: { immediate?: boolean }) {
      pending.set(key, value);
      if (options?.immediate || coalesceMs <= 0) {
        commit(key);
        return;
      }
      const existing = timers.get(key);
      if (existing) clearTimeout(existing);
      timers.set(key, setTimeout(() => commit(key), coalesceMs));
    },
    subscribe(key: string, subscriber: SignalSubscriber) {
      const bucket = subscribers.get(key) ?? new Set<SignalSubscriber>();
      bucket.add(subscriber);
      subscribers.set(key, bucket);
      return () => {
        bucket.delete(subscriber);
        if (bucket.size === 0 && subscribers.get(key) === bucket) subscribers.delete(key);
      };
    },
    clear(key?: string) {
      if (key) {
        values.delete(key); pending.delete(key);
        const timer = timers.get(key); if (timer) clearTimeout(timer); timers.delete(key);
        emit(key);
        return;
      }
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear(); pending.clear(); values.clear();
      subscribers.forEach((bucket) => bucket.forEach((subscriber) => subscriber()));
    },
  };
}
