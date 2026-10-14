/** Firestore rejects undefined field values. Remove them recursively before every write. */
export const removeUndefinedDeep = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.filter((item) => item !== undefined).map((item) => removeUndefinedDeep(item)) as T;
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, removeUndefinedDeep(item)]),
    ) as T;
  }
  return value;
};

export const compactRecord = <T extends Record<string, unknown>>(value: T): Partial<T> => removeUndefinedDeep(value) as Partial<T>;
