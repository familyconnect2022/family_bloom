import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useFamilyEventsRealtime, useFamilyMembersRealtime, useFamilyMomentsRealtime } from "./FamilyRealtimeContext";

const REQUIRED = ["home", "moments", "planner", "family", "play"] as const;
type Task = typeof REQUIRED[number];
type Startup = { ready: boolean; report: (task: Task, ready: boolean) => void };
const Context = createContext<Startup>({ ready: true, report: () => {} });

/** Key this provider by account/family. Completion stays latched for that session. */
export function TabStartupProvider({ children }: { children: ReactNode }) {
  const members = useFamilyMembersRealtime();
  const moments = useFamilyMomentsRealtime();
  const events = useFamilyEventsRealtime();
  const [tasks, setTasks] = useState<Partial<Record<Task, boolean>>>({});
  const [released, setReleased] = useState(false);
  const started = Object.keys(tasks).length > 0;
  const report = useCallback((task: Task, ready: boolean) => {
    setTasks((current) => current[task] === ready ? current : { ...current, [task]: ready });
  }, []);
  const settled = !!members?.familyId && members.familyId === moments?.familyId
    && members.familyId === events?.familyId
    && !members.loading && !moments.loading && !events.upcomingLoading && !events.yearlyLoading;

  useEffect(() => {
    if (started && settled && REQUIRED.every((task) => tasks[task])) setReleased(true);
  }, [started, settled, tasks]);
  useEffect(() => {
    if (!started || released) return;
    const timer = setTimeout(() => setReleased(true), 8000);
    return () => clearTimeout(timer);
  }, [started, released]);

  const value = useMemo(() => ({ ready: !started || released, report }), [started, released, report]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export const useTabStartup = () => useContext(Context);
export function useTabStartupTask(task: Task, ready = true) {
  const { report } = useTabStartup();
  useEffect(() => { report(task, ready); }, [report, task, ready]);
}
