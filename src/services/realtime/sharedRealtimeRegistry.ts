type Subscriber<T> = {
  onData: (value: T) => void;
  onError?: (error: unknown) => void;
};

type SharedEntry<T> = {
  subscribers: Map<number, Subscriber<T>>;
  stop?: () => void;
  disposeTimer?: ReturnType<typeof setTimeout>;
  hasValue: boolean;
  lastValue?: T;
  hasError: boolean;
  lastError?: unknown;
  listenerName: string;
  physicalStarts: number;
  createdAt: number;
};

type SharedSubscribeOptions<T> = {
  key: string;
  listenerName?: string;
  start: (onData: (value: T) => void, onError: (error: unknown) => void) => (() => void) | undefined | null;
  onData: (value: T) => void;
  onError?: (error: unknown) => void;
  /** Keep the underlying listener alive briefly after the last subscriber leaves. */
  keepAliveMs?: number;
};

const entries = new Map<string, SharedEntry<unknown>>();
let subscriberSequence = 1;
let physicalStartSequence = 0;

/**
 * Ref-counted Firestore listener pool for identical bounded queries.
 *
 * A14 contract: one stable query key owns at most ONE physical listener. Every
 * screen/provider is a logical subscriber only. This registry is deliberately
 * runtime-only; persisted boot/layout caches live in their own services.
 */
export function subscribeSharedRealtime<T>({
  key,
  listenerName,
  start,
  onData,
  onError,
  keepAliveMs = 0,
}: SharedSubscribeOptions<T>): () => void {
  const resolvedName = listenerName?.trim() || key;
  let entry = entries.get(key) as SharedEntry<T> | undefined;
  const isNewEntry = !entry;
  if (!entry) {
    entry = {
      subscribers: new Map<number, Subscriber<T>>(),
      hasValue: false,
      hasError: false,
      listenerName: resolvedName,
      physicalStarts: 0,
      createdAt: Date.now(),
    };
    entries.set(key, entry as SharedEntry<unknown>);
  } else if (typeof __DEV__ !== "undefined" && __DEV__ && entry.listenerName !== resolvedName) {
    console.warn(`[FirebaseRegistry] query key '${key}' reused by '${resolvedName}' (owner '${entry.listenerName}').`);
  }

  if (entry.disposeTimer) {
    clearTimeout(entry.disposeTimer);
    entry.disposeTimer = undefined;
  }

  const subscriberId = subscriberSequence++;
  entry.subscribers.set(subscriberId, { onData, onError });

  if (entry.hasValue) onData(entry.lastValue as T);
  if (entry.hasError && onError) onError(entry.lastError);

  if (isNewEntry) {
    const broadcastData = (value: T) => {
      const current = entries.get(key) as SharedEntry<T> | undefined;
      if (!current) return;
      current.hasValue = true;
      current.lastValue = value;
      current.hasError = false;
      current.lastError = undefined;
      current.subscribers.forEach((subscriber) => subscriber.onData(value));
    };
    const broadcastError = (error: unknown) => {
      const current = entries.get(key) as SharedEntry<T> | undefined;
      if (!current) return;
      current.hasError = true;
      current.lastError = error;
      current.subscribers.forEach((subscriber) => subscriber.onError?.(error));
    };

    try {
      physicalStartSequence += 1;
      entry.physicalStarts += 1;
      const rawStop = start(broadcastData, broadcastError) ?? undefined;
      entry.stop = rawStop ?? undefined;
    } catch (error) {
      entries.delete(key);
      entry.subscribers.clear();
      onError?.(error);
      return () => {};
    }
  }

  let closed = false;
  return () => {
    if (closed) return;
    closed = true;
    const current = entries.get(key) as SharedEntry<T> | undefined;
    if (!current) return;
    current.subscribers.delete(subscriberId);
    if (current.subscribers.size > 0) return;

    const dispose = () => {
      const latest = entries.get(key) as SharedEntry<T> | undefined;
      if (!latest || latest !== current || latest.subscribers.size > 0) return;
      entries.delete(key);
      latest.disposeTimer = undefined;
      latest.stop?.();
    };

    if (keepAliveMs > 0) {
      current.disposeTimer = setTimeout(dispose, keepAliveMs);
      return;
    }
    dispose();
  };
}

export type SharedRealtimeRegistryRow = {
  key: string;
  listenerName: string;
  subscribers: number;
  physicalStarts: number;
  hasValue: boolean;
  ageMs: number;
};

export const getSharedRealtimeRegistrySnapshot = (): SharedRealtimeRegistryRow[] =>
  [...entries.entries()]
    .map(([key, entry]) => ({
      key,
      listenerName: entry.listenerName,
      subscribers: entry.subscribers.size,
      physicalStarts: entry.physicalStarts,
      hasValue: entry.hasValue,
      ageMs: Math.max(0, Date.now() - entry.createdAt),
    }))
    .sort((a, b) => a.key.localeCompare(b.key));

/** Account/family boundary cleanup. Safe in production; consumers will recreate on demand. */
export const resetSharedRealtimeRegistry = () => {
  [...entries.values()].forEach((entry) => {
    if (entry.disposeTimer) clearTimeout(entry.disposeTimer);
    entry.stop?.();
  });
  entries.clear();
};

export const sharedRealtimeRegistryDebug = {
  activeKeys: () => [...entries.keys()].sort(),
  snapshot: getSharedRealtimeRegistrySnapshot,
  physicalStarts: () => physicalStartSequence,
  clearForTests: resetSharedRealtimeRegistry,
};
