import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const REQUIRED = ["home", "moments", "planner", "family", "play"] as const;
type Task = typeof REQUIRED[number];
type Startup = {
  ready: boolean;
  chromeReady: boolean;
  report: (task: Task, ready: boolean) => void;
  reportChromeReady: (ready: boolean) => void;
  release: () => void;
};
const Context = createContext<Startup>({
  ready: true,
  chromeReady: true,
  report: () => {},
  reportChromeReady: () => {},
  release: () => {},
});

/**
 * P2.5: startup readiness is owned by the first mounted/active tab only.
 * Hidden tabs are lazy and must never block splash release. Once the active
 * surface reports ready, readiness stays latched for this account/family
 * session. The provider is keyed by sessionKey at the call site.
 */
export function TabStartupProvider({
  children,
  enabled,
}: {
  children: ReactNode;
  enabled: boolean;
}) {
  const [released, setReleased] = useState(!enabled);
  const [chromeReady, setChromeReady] = useState(!enabled);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setReleased(true);
      setChromeReady(true);
      setStarted(false);
    } else {
      setReleased(false);
      setChromeReady(false);
      setStarted(false);
    }
  }, [enabled]);

  const report = useCallback((_task: Task, ready: boolean) => {
    if (!enabled) return;
    setStarted(true);
    if (ready) setReleased(true);
  }, [enabled]);
  const reportChromeReady = useCallback((ready: boolean) => {
    if (!enabled) return;
    if (ready) setChromeReady(true);
  }, [enabled]);
  const release = useCallback(() => setReleased(true), []);

  // Safety valve only. It prevents a broken feature from trapping the native
  // splash forever, while the normal path releases immediately after the
  // active surface commits its ready effect.
  useEffect(() => {
    if (!enabled || released || !started) return;
    const timer = setTimeout(() => setReleased(true), 2500);
    return () => clearTimeout(timer);
  }, [enabled, released, started]);

  const value = useMemo(() => ({
    ready: !enabled || released,
    chromeReady: !enabled || chromeReady,
    report,
    reportChromeReady,
    release,
  }), [chromeReady, enabled, released, report, reportChromeReady, release]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export const useTabStartup = () => useContext(Context);
export function useTabStartupTask(task: Task, ready = true) {
  const { report } = useTabStartup();
  useEffect(() => { report(task, ready); }, [report, task, ready]);
}
