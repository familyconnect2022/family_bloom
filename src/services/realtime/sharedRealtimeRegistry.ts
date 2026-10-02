import { PERFORMANCE_TEST_BUILD } from "../../constants/performanceTest";
import { performanceTestService } from "../performance/performanceTestService";

type Subscriber<T> = {
  onData: (value: T) => void;
  onError?: (error: unknown) => void;
};

type SharedEntry<T> = {
  subscribers: Map<number, Subscriber<T>>;
  stop?: () => void;
  hasValue: boolean;
  lastValue?: T;
  hasError: boolean;
  lastError?: unknown;
};

type SharedSubscribeOptions<T> = {
  key: string;
  listenerName?: string;
  start: (onData: (value: T) => void, onError: (error: unknown) => void) => (() => void) | undefined | null;
  onData: (value: T) => void;
  onError?: (error: unknown) => void;
};

const entries = new Map<string, SharedEntry<unknown>>();
let subscriberSequence = 1;

/**
 * Ref-counted Firestore listener pool for identical bounded queries.
 *
 * Expo Router can temporarily keep more than one React screen instance mounted
 * while unwinding a nested stack or during development navigation. Those views
 * may all ask for the same realtime query. The pool guarantees that only ONE
 * underlying Firestore listener exists per stable query key and fans snapshots
 * out to every mounted consumer. When the last consumer leaves, the underlying
 * listener is released immediately.
 *
 * This is runtime-only: it does not cache across families or persist data.
 */
export function subscribeSharedRealtime<T>({
  key,
  listenerName,
  start,
  onData,
  onError,
}: SharedSubscribeOptions<T>): () => void {
  let entry = entries.get(key) as SharedEntry<T> | undefined;
  const isNewEntry = !entry;
  if (!entry) {
    entry = {
      subscribers: new Map<number, Subscriber<T>>(),
      hasValue: false,
      hasError: false,
    };
    entries.set(key, entry as SharedEntry<unknown>);
  }

  const subscriberId = subscriberSequence++;
  entry.subscribers.set(subscriberId, { onData, onError });

  // A second mounted consumer should become useful immediately without waiting
  // for Firestore to emit the same snapshot again.
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
      const rawStop = start(broadcastData, broadcastError) ?? undefined;
      entry.stop = PERFORMANCE_TEST_BUILD && listenerName
        ? performanceTestService.trackListener(listenerName, rawStop) ?? undefined
        : rawStop ?? undefined;
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
    entries.delete(key);
    current.stop?.();
  };
}

export const sharedRealtimeRegistryDebug = {
  activeKeys: () => [...entries.keys()].sort(),
  clearForTests: () => {
    [...entries.values()].forEach((entry) => entry.stop?.());
    entries.clear();
  },
};
