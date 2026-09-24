/** Prepare one item at a time without forcing work into a busy frame. */
export function scheduleIdleSequence<T>(items: readonly T[], prepare: (item: T) => void) {
  let cancelled = false;
  let index = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let idle: number | undefined;

  const next = () => {
    if (cancelled || index >= items.length) return;
    timer = setTimeout(() => {
      if (cancelled) return;
      idle = requestIdleCallback(() => {
        if (cancelled) return;
        prepare(items[index++]);
        next();
      });
    }, 700);
  };
  next();
  return () => {
    cancelled = true;
    if (timer !== undefined) clearTimeout(timer);
    if (idle !== undefined) cancelIdleCallback(idle);
  };
}
